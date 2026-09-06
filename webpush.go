package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"syscall"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/routine"
)

func isDisallowedPushIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() {
		return true
	}
	// CGNAT 100.64.0.0/10 (net.IP.IsPrivate does not cover it)
	if ip4 := ip.To4(); ip4 != nil && ip4[0] == 100 && ip4[1] >= 64 && ip4[1] <= 127 {
		return true
	}
	return false
}

// dialControl rejects any resolved connect address in a disallowed range. It
// runs at connect time (after DNS resolution) for both plaintext and TLS dials,
// so it also defeats DNS rebinding.
func dialControl(_, address string, _ syscall.RawConn) error {
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return err
	}
	if isDisallowedPushIP(net.ParseIP(host)) {
		return fmt.Errorf("webpush: refusing to dial non-public endpoint address %s", address)
	}
	return nil
}

var pushHTTPClient = func() *http.Client {
	t := http.DefaultTransport.(*http.Transport).Clone()
	t.DialContext = (&net.Dialer{Timeout: 10 * time.Second, Control: dialControl}).DialContext
	return &http.Client{Timeout: 30 * time.Second, Transport: t}
}()

type vapidKeys struct {
	PublicKey  string `json:"publicKey"`
	PrivateKey string `json:"privateKey"`
}

// loadOrCreateVAPIDKeys persists the key pair in pb_data so a self-hosted
// instance gets working push with zero configuration. Deleting the file
// rotates the keys, which invalidates all existing subscriptions.
func loadOrCreateVAPIDKeys(app *pocketbase.PocketBase) (*vapidKeys, error) {
	path := filepath.Join(app.DataDir(), "vapid.json")

	if data, err := os.ReadFile(path); err == nil {
		keys := &vapidKeys{}
		if err := json.Unmarshal(data, keys); err == nil &&
			keys.PublicKey != "" && keys.PrivateKey != "" {
			return keys, nil
		}
	}

	privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		return nil, err
	}
	keys := &vapidKeys{PublicKey: publicKey, PrivateKey: privateKey}

	data, err := json.MarshalIndent(keys, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(app.DataDir(), 0o755); err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return nil, err
	}

	app.Logger().Info("webpush: generated new VAPID key pair", "path", path)
	return keys, nil
}

// vapidSubject is the contact ("sub") claim push services may use to reach
// the operator. Must be a mailto: or https: URL.
func vapidSubject() string {
	if subject := os.Getenv("VAPID_SUBJECT"); subject != "" {
		return subject
	}
	return "mailto:admin@example.com"
}

// registerWebPush delivers every created `notifications` record to all the
// recipient's registered devices. Records are created by pb_hooks (see
// pb_hooks/notifications.pb.js) — this is only the transport.
func registerWebPush(app *pocketbase.PocketBase) {
	var keys *vapidKeys

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		k, err := loadOrCreateVAPIDKeys(app)
		if err != nil {
			return err
		}
		keys = k

		// Public key is needed by the client to subscribe; it is not a secret
		se.Router.GET("/api/vapid-public-key", func(e *core.RequestEvent) error {
			return e.JSON(http.StatusOK, map[string]string{"publicKey": keys.PublicKey})
		})

		return se.Next()
	})

	app.OnRecordAfterCreateSuccess("notifications").BindFunc(func(e *core.RecordEvent) error {
		if keys == nil {
			return e.Next()
		}

		subscriptions, err := e.App.FindRecordsByFilter(
			"push_subscriptions",
			"user = {:user}",
			"", 0, 0,
			dbx.Params{"user": e.Record.GetString("user")},
		)
		if err != nil {
			e.App.Logger().Error("webpush: failed to load subscriptions", "error", err)
			return e.Next()
		}

		payload, err := json.Marshal(map[string]string{
			"title": e.Record.GetString("title"),
			"body":  e.Record.GetString("body"),
			"url":   e.Record.GetString("url"),
		})
		if err != nil {
			return e.Next()
		}

		for _, subscription := range subscriptions {
			routine.FireAndForget(func() {
				sendPush(e.App, keys, subscription, payload)
			})
		}

		return e.Next()
	})
}

func sendPush(app core.App, keys *vapidKeys, subscription *core.Record, payload []byte) {
	endpoint := subscription.GetString("endpoint")
	if u, err := url.Parse(endpoint); err != nil || u.Scheme != "https" || u.Host == "" {
		app.Logger().Warn("webpush: skipping subscription with non-https endpoint",
			"subscription", subscription.Id)
		return
	}

	resp, err := webpush.SendNotification(payload, &webpush.Subscription{
		Endpoint: endpoint,
		Keys: webpush.Keys{
			P256dh: subscription.GetString("p256dh"),
			Auth:   subscription.GetString("auth"),
		},
	}, &webpush.Options{
		HTTPClient:      pushHTTPClient,
		Subscriber:      vapidSubject(),
		VAPIDPublicKey:  keys.PublicKey,
		VAPIDPrivateKey: keys.PrivateKey,
		TTL:             60 * 60 * 24,
	})
	if err != nil {
		app.Logger().Error("webpush: send failed", "subscription", subscription.Id, "error", err)
		return
	}
	defer resp.Body.Close()

	switch {
	// The push service says this subscription no longer exists — drop it
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone:
		if err := app.Delete(subscription); err != nil {
			app.Logger().Error("webpush: failed to prune dead subscription",
				"subscription", subscription.Id, "error", err)
		}
	case resp.StatusCode >= 400:
		app.Logger().Warn("webpush: push service rejected message",
			"subscription", subscription.Id, "status", resp.StatusCode)
	}
}
