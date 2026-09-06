# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenSplit — a group expense splitting app built with React 19 + TypeScript, Vite, and PocketBase as the backend. The backend is a custom PocketBase build in Go (`main.go`, `webpush.go`) rather than the stock binary.

## Commands

- `vp run dev` — start PocketBase (`go run . serve`) and the Vite dev server together
- `vp run build` — TypeScript check + Vite production build
- `vp run lint` — run ESLint
- `vp run typegen` — regenerate PocketBase types after schema changes (outputs to `src/types/pocketbase-types.gen.ts`)
- `go build ./...` / `go vet ./...` — compile-check the Go backend after changing `main.go`/`webpush.go`

No test framework is configured.

## Architecture

**Routing:** TanStack Router with file-based routing in `src/routes/`. The route tree is auto-generated (`routeTree.gen.ts`). Dynamic segments use `$param` syntax (e.g., `group.$id.tsx` → `/group/:id`). Route guards use `beforeLoad` for auth protection.

**Data fetching:** TanStack Query hooks in `src/hooks/useApi.ts` wrap all PocketBase calls. Mutations invalidate query caches. Query keys follow `["resource", id]` pattern.

**Auth:** `src/hooks/useAuth.ts` manages PocketBase auth state with Google OAuth2. The PocketBase client singleton lives in `src/lib/pocketbase.ts`.

**Forms:** TanStack React Form with field-level validation.

**UI:** Tailwind CSS v4 with Base UI primitives (`@base-ui/react`). Reusable components in `src/components/ui/` use CVA for variants.

**Path alias:** `@/*` maps to `src/*`.

## PocketBase (Go backend)

The backend is a custom PocketBase binary defined at the repo root (Go module `opensplit`, Go 1.26):

- `main.go` — behaves like the stock binary: registers the JSVM (JS hooks in `pb_hooks/`, watched in dev), JS automigrations in `pb_migrations/`, and serves the built frontend from `pb_public/` in production.
- `webpush.go` — Web Push delivery, the reason for the custom build (the JSVM lacks the required crypto). On every created `notifications` record it pushes to all of the recipient's `push_subscriptions` records and prunes dead subscriptions. VAPID keys are auto-generated and persisted in `pb_data/vapid.json`; the contact address comes from `VAPID_SUBJECT`. The client fetches the public key from `GET /api/vapid-public-key`.

Business logic stays in JS hooks in `pb_hooks/` (e.g. `notifications.pb.js` creates the notification records; Go is only the transport). After adding a Go dependency, run `go mod tidy`.

Recurring expenses: `recurring_expenses` records are templates (amount, payer, `frequency` × `interval`, `nextDate`, optional `endDate`, `active`) whose shares are `recurring_splits` rows (`recurring`, `user`, `percentage`, mirroring `splits`). `pb_hooks/recurringExpenses.pb.js` runs an hourly cron (logic in `pb_hooks/recurring.js`) that turns due templates into normal `expenses` + `splits` rows (tagged via the expense's `recurring` relation), notifies members, and advances `nextDate`. `POST /api/recurring/run` (superuser) triggers it manually.

Collections: `groups`, `users`, `people`, `expenses`, `splits`, `invites`, `settlements`, `currencies`, `rates`, `notifications`, `push_subscriptions`, `recurring_expenses`, `recurring_splits`. Relations are fetched via PocketBase's `expand` parameter. Default dev URL: `http://localhost:8090` (set via `VITE_POCKETBASE_URL`).

Production runs everything as one container (see `Dockerfile`): the Go binary serves the API and the static frontend.

## Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
