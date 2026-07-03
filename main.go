// Custom PocketBase build. Behaves like the stock binary (JS hooks in
// pb_hooks, JS migrations in pb_migrations, static frontend from pb_public)
// with one addition: Web Push delivery for the `notifications` collection,
// which the stock binary can't do because the JSVM lacks the required crypto.
// See webpush.go.
package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	app := pocketbase.New()

	jsvm.MustRegister(app, jsvm.Config{
		HooksWatch: true,
	})

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  true,
	})

	registerWebPush(app)

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		publicDir := filepath.Join(filepath.Dir(app.DataDir()), "pb_public")
		if _, err := os.Stat(publicDir); err == nil {
			se.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir), true))
		}
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
