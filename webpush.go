package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
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
		return strings.TrimPrefix(subject, "mailto:")
	}
	log.Println("WARNING: VAPID_SUBJECT environment variable is not set. Push services may block your notifications in production!")
	return "temporary@example.com"
}

// registerWebPush sets up Web Push delivery for the app.
// Direct hooks on `expenses` (both user-created and recurring) and
// `settlements` deliver push notifications to group members without
// storing intermediate records in the db.
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

		// Diagnostic: push a test message to every device of the caller,
		// synchronously, and report what the push service said for each one.
		se.Router.POST("/api/push/test", func(e *core.RequestEvent) error {
			subscriptions, err := findPushSubscriptions(e.App, e.Auth.Id)
			if err != nil {
				return e.InternalServerError("Failed to load push subscriptions", err)
			}

			payload, err := json.Marshal(map[string]string{
				"title": "OpenSplit",
				"body":  "Test notification — push is working on this device.",
				"url":   "/profile",
			})
			if err != nil {
				return e.InternalServerError("Failed to build payload", err)
			}

			results := make([]pushResult, len(subscriptions))
			var wg sync.WaitGroup
			for i, subscription := range subscriptions {
				wg.Add(1)
				go func() {
					defer wg.Done()
					results[i] = sendPush(e.App, keys, subscription, payload)
				}()
			}
			wg.Wait()

			return e.JSON(http.StatusOK, map[string]any{"results": results})
		}).Bind(apis.RequireAuth())

		return se.Next()
	})

	// Fans out notifications to group members when expenses are created via the API
	app.OnRecordCreateRequest("expenses").BindFunc(func(e *core.RecordRequestEvent) error {
		if err := e.Next(); err != nil {
			return err
		}

		actor := e.Auth
		actorName := "Someone"
		if actor != nil {
			if name := actor.GetString("name"); name != "" {
				actorName = name
			} else if email := actor.GetString("email"); email != "" {
				actorName = email
			}
		}

		group, err := e.App.FindRecordById("groups", e.Record.GetString("group"))
		if err != nil {
			e.App.Logger().Error("webpush: failed to load group for expense notification",
				"error", err, "group", e.Record.GetString("group"))
			return nil
		}

		amount := strconv.FormatFloat(e.Record.GetFloat("amount"), 'f', -1, 64)
		currency := strings.ToUpper(e.Record.GetString("currency"))
		title := group.GetString("name")
		body := fmt.Sprintf(`%s added "%s" — %s %s`, actorName, e.Record.GetString("title"), amount, currency)
		targetURL := fmt.Sprintf("/group/%s", group.Id)

		for _, memberId := range group.GetStringSlice("members") {
			if actor != nil && memberId == actor.Id {
				continue
			}
			sendNotificationToUser(e.App, keys, memberId, title, body, targetURL)
		}

		return nil
	})

	// Fans out notifications to payer/recipient when settlements are created via the API
	app.OnRecordCreateRequest("settlements").BindFunc(func(e *core.RecordRequestEvent) error {
		if err := e.Next(); err != nil {
			return err
		}

		actor := e.Auth

		group, err := e.App.FindRecordById("groups", e.Record.GetString("group"))
		if err != nil {
			e.App.Logger().Error("webpush: failed to load group for settlement notification",
				"error", err, "group", e.Record.GetString("group"))
			return nil
		}

		amount := strconv.FormatFloat(e.Record.GetFloat("amount"), 'f', -1, 64)
		currency := strings.ToUpper(e.Record.GetString("currency"))

		fromName := "Someone"
		if fromUser, err := e.App.FindRecordById("users", e.Record.GetString("from")); err == nil {
			if name := fromUser.GetString("name"); name != "" {
				fromName = name
			} else if email := fromUser.GetString("email"); email != "" {
				fromName = email
			}
		}

		title := group.GetString("name")
		body := fmt.Sprintf("%s paid %s %s", fromName, amount, currency)
		targetURL := fmt.Sprintf("/group/%s", group.Id)

		actorID := ""
		if actor != nil {
			actorID = actor.Id
		}

		for _, uid := range []string{e.Record.GetString("from"), e.Record.GetString("to")} {
			if uid == "" || uid == actorID {
				continue
			}
			sendNotificationToUser(e.App, keys, uid, title, body, targetURL)
		}

		return nil
	})

	// Fans out notifications to all group members when recurring expenses are materialized
	app.OnRecordAfterCreateSuccess("expenses").BindFunc(func(e *core.RecordEvent) error {
		// Only handle recurring expenses (regular user-created expenses are handled above by OnRecordCreateRequest)
		if e.Record.GetString("recurring") == "" {
			return e.Next()
		}

		group, err := e.App.FindRecordById("groups", e.Record.GetString("group"))
		if err != nil {
			e.App.Logger().Error("webpush: failed to load group for recurring expense notification",
				"error", err, "group", e.Record.GetString("group"))
			return e.Next()
		}

		amount := strconv.FormatFloat(e.Record.GetFloat("amount"), 'f', -1, 64)
		currency := strings.ToUpper(e.Record.GetString("currency"))
		title := group.GetString("name")
		body := fmt.Sprintf(`Recurring expense "%s" — %s %s`, e.Record.GetString("title"), amount, currency)
		targetURL := fmt.Sprintf("/group/%s", group.Id)

		for _, memberId := range group.GetStringSlice("members") {
			sendNotificationToUser(e.App, keys, memberId, title, body, targetURL)
		}

		return e.Next()
	})
}

func sendNotificationToUser(app core.App, keys *vapidKeys, userId, title, body, targetURL string) {
	if keys == nil || userId == "" {
		return
	}

	subscriptions, err := findPushSubscriptions(app, userId)
	if err != nil {
		app.Logger().Error("webpush: failed to load subscriptions", "error", err, "user", userId)
		return
	}

	payload, err := json.Marshal(map[string]string{
		"title": title,
		"body":  body,
		"url":   targetURL,
	})
	if err != nil {
		app.Logger().Error("webpush: failed to marshal payload", "error", err)
		return
	}

	for _, subscription := range subscriptions {
		routine.FireAndForget(func() {
			sendPush(app, keys, subscription, payload)
		})
	}
}

func findPushSubscriptions(app core.App, userId string) ([]*core.Record, error) {
	return app.FindRecordsByFilter(
		"push_subscriptions",
		"user = {:user}",
		"", 0, 0,
		dbx.Params{"user": userId},
	)
}

// pushResult is the outcome of one delivery attempt, as reported back by the
// test endpoint. Every failure path is also logged.
type pushResult struct {
	Subscription string `json:"subscription"`
	Endpoint     string `json:"endpoint"`
	UserAgent    string `json:"userAgent"`
	Status       int    `json:"status,omitempty"`
	Error        string `json:"error,omitempty"`
	// Pruned is set when the push service reported the subscription as gone
	// and the record has been deleted.
	Pruned bool `json:"pruned,omitempty"`
}

func sendPush(app core.App, keys *vapidKeys, subscription *core.Record, payload []byte) pushResult {
	result := pushResult{
		Subscription: subscription.Id,
		Endpoint:     subscription.GetString("endpoint"),
		UserAgent:    subscription.GetString("userAgent"),
	}

	if u, err := url.Parse(result.Endpoint); err != nil || u.Scheme != "https" || u.Host == "" {
		result.Error = "subscription endpoint is not an https URL"
		app.Logger().Warn("webpush: skipping subscription with non-https endpoint",
			"subscription", subscription.Id)
		return result
	}

	resp, err := webpush.SendNotification(payload, &webpush.Subscription{
		Endpoint: result.Endpoint,
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
		result.Error = err.Error()
		app.Logger().Error("webpush: send failed", "subscription", subscription.Id, "error", err)
		return result
	}
	defer resp.Body.Close()
	result.Status = resp.StatusCode

	switch {
	// The push service says this subscription no longer exists — drop it
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone:
		if err := app.Delete(subscription); err != nil {
			app.Logger().Error("webpush: failed to prune dead subscription",
				"subscription", subscription.Id, "error", err)
		} else {
			result.Pruned = true
		}
	case resp.StatusCode >= 400:
		app.Logger().Warn("webpush: push service rejected message",
			"subscription", subscription.Id, "status", resp.StatusCode)
	default:
		app.Logger().Info("webpush: sent",
			"subscription", subscription.Id, "status", resp.StatusCode)
	}

	return result
}
