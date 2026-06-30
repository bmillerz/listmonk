# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

listmonk is a self-hosted newsletter & mailing-list manager: a single Go binary (Echo HTTP server) with all assets bundled in, plus a Vue 2 admin SPA. This is a fork (`bmillerz/listmonk`); `dev/local.yml` and some dashboard/analytics work are local additions on top of upstream.

## Build & run

The whole app — frontend, SQL, templates, i18n — compiles into one `./listmonk` binary via [stuffbin](https://github.com/knadh/stuffbin).

- `make dist` — full production build: backend + both frontends, bundled into `./listmonk`.
- `make build` — backend binary only (no bundled frontend).
- `make build-frontend` — build `frontend/dist` and the email-builder.
- `make run` — run the backend in dev mode (serves `frontend/dist` from disk; needs a `config.toml` and a reachable Postgres). Listens on `:9000`.
- `make run-frontend` / `cd frontend && yarn dev` — Vite dev server on `:8080` with hot reload, proxying `/api` etc. to the backend on `:9000`. Use this for frontend work, not `:9000` directly (that serves prebuilt assets).

Use **yarn**, not npm (npm leaves a stray `package-lock.json`).

### Database lifecycle

The binary manages its own schema — there is no separate migration tool:
- `./listmonk --install` — fresh install (creates schema from `schema.sql`, seeds sample data). Add `--idempotent --yes` to make it non-destructive/non-interactive.
- `./listmonk --upgrade` — apply pending migrations from `internal/migrations`.

### Dockerised dev suite (`dev/`)

- `make init-dev-docker` — build images and install the DB.
- `make dev-docker` — run the full suite (Postgres, Mailhog, frontend, `go run` backend).
- `make rm-dev-docker` — tear down **and drop volumes** (`docker compose down -v`).

The Makefile targets drive `dev/docker-compose.yml` (backend via `go run`). There is also a separate `dev/local.yml` stack that runs a prebuilt `ghcr.io/bmillerz/listmonk:brand` image against its own DB volume — the two stacks use **different** Postgres volumes and the same ports, so only one runs at a time. Don't mix them.

## Tests & lint

- `make test` or `go test ./...` — Go tests.
- Single Go test: `go test ./internal/core -run TestName`.
- `cd frontend && yarn lint` — ESLint (also runs automatically on `prebuild`).
- `cd frontend && yarn test:unit` — frontend unit tests (Vitest).

## Architecture

### SQL-first data layer (the key pattern)

Database access is **not** ORM-based. SQL lives in `queries/*.sql` as named queries in [goyesql](https://github.com/knadh/goyesql) format:

```sql
-- name: get-campaign
SELECT ... FROM campaigns WHERE id = $1;
```

Each query is declared as a prepared-statement field on the `models.Queries` struct (`models/queries.go`) with a matching tag:

```go
GetCampaign *sqlx.Stmt `query:"get-campaign"`
```

At boot, `cmd/init.go` (`readQueries` → `prepareQueries` → `goyesqlx.ScanToStruct`) parses the `.sql` files and prepares every statement onto that struct. **To add or change a DB query you must edit two places: the `.sql` file and the `models.Queries` struct.** A name mismatch fails at startup.

### Layers

- `cmd/*.go` — Echo HTTP handlers, one file per domain (`campaigns.go`, `subscribers.go`, `lists.go`, `bounce.go`, `media.go`, `settings.go`, …). `handlers.go` wires routes; `init.go` builds the app (config via koanf, DB, queries, i18n, manager).
- `internal/core` — business logic operating on the prepared queries; the layer handlers call into.
- `models/` — data structs plus the query registry (`queries.go`).
- `internal/manager` — the campaign-sending engine: a worker pool pulls due campaigns (`NextCampaigns`), renders templates per subscriber, and pushes messages through `internal/messenger`.
- `internal/migrations` — versioned upgrade migrations applied by `--upgrade`.
- Other `internal/` packages: `subimporter` (CSV/bulk subscriber import), `messenger` (SMTP & messenger backends), `media` (uploads: filesystem/S3), `bounce` (bounce processing), `i18n`, `captcha`, `events`, `notifs`, `auth`.
- `schema.sql` — full DB schema for fresh installs (migrations bring older DBs up to it).

### Frontend

- `frontend/` — Vue **2.7** + Buefy (Bulma) + Vuex + vue-router, built with Vite. `src/views/` are pages, `src/components/` shared widgets, `src/utils.js` holds shared formatters (e.g. `niceDate`, number formatting) used across views.
- `frontend/email-builder/` — a separate TypeScript visual email builder, built independently and copied into `static/` during `make dist`.
- **i18n labels are served by the backend, not bundled in the JS.** Strings live in `i18n/*.json` and the SPA fetches them once at boot from `/api/lang/:lang`. New keys added to `i18n/en.json` won't appear against a prebuilt backend binary until it's rebuilt (the Vite dev server has a plugin that serves the repo's `i18n/en.json` so they hot-reload in dev).
