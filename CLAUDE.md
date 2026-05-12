# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenSplit — a group expense splitting app built with React 19 + TypeScript, Vite, and PocketBase as the backend.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — run ESLint
- `npm run typegen` — regenerate PocketBase types after schema changes (outputs to `src/types/pocketbase-types.gen.ts`)

No test framework is configured.

## Architecture

**Routing:** TanStack Router with file-based routing in `src/routes/`. The route tree is auto-generated (`routeTree.gen.ts`). Dynamic segments use `$param` syntax (e.g., `group.$id.tsx` → `/group/:id`). Route guards use `beforeLoad` for auth protection.

**Data fetching:** TanStack Query hooks in `src/hooks/useApi.ts` wrap all PocketBase calls. Mutations invalidate query caches. Query keys follow `["resource", id]` pattern.

**Auth:** `src/hooks/useAuth.ts` manages PocketBase auth state with Google OAuth2. The PocketBase client singleton lives in `src/lib/pocketbase.ts`.

**Forms:** TanStack React Form with field-level validation.

**UI:** Tailwind CSS v4 with Base UI primitives (`@base-ui/react`). Reusable components in `src/components/ui/` use CVA for variants.

**Path alias:** `@/*` maps to `src/*`.

## PocketBase

Collections: `groups`, `users`, `people`, `expenses`, `splits`, `invites`. Relations are fetched via PocketBase's `expand` parameter. Default dev URL: `http://localhost:8090` (set via `VITE_POCKETBASE_URL`).

## Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
