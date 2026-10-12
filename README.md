# PromptHub

Full-stack AI prompt **hub** with authentication, categorization, and multi-language support. Prompts are **shared**: every user can browse, search and copy any prompt; you manage your own (and admins manage users).

## Features

- **Auth**: JWT-based registration/login (first user auto-promoted to admin)
- **Prompt Management**: Full CRUD with ownership checks and tags — the list is shared, writes are owner-only
- **Categories**: Organize prompts, cascade delete on category removal
- **Search & Filter**: Debounced search by title/content/tags, filter by category
- **Backup & Restore**: Export **your** prompts as a ZIP (JSON inside) and re-import them; per-user identity means other users' prompts never collide
- **Copy-to-Clipboard**: One-click prompt reuse via read-only modal
- **i18n**: Full localization in English, Spanish, and Basque (Euskara)
- **Dark Mode**: Light/dark/auto theme with system preference detection
- **Role System**: User and admin roles; admin panel for user management

## Tech Stack

Vue 3 (Composition API), Pinia, Vue Router 5, Tailwind CSS 4, Vite | Express 5, Mongoose 9, JWT (hs256) | MongoDB 8, Docker Compose, Traefik 3

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/)
- Node.js (local development only)

### Running with Docker (Recommended)

```bash
git clone <repo> && cd prompt-hub
cp .env.example .env   # Set JWT_SECRET and other vars
make start
```

Access at your configured domain (e.g. `https://prompthub.test`). Frontend and API are served through Traefik with TLS.

### Local Development

```bash
# Backend (server/) — port 3000, .env required
cd server && npm install && npm run dev

# Frontend (client/) — port 5173, proxies /api to localhost:3000
cd client && npm install && npm run dev
```

## Quick Commands

```bash
make start    # docker-compose up --build
make stop     # docker-compose down
make restart  # full restart with rebuild
make test     # run both server and client tests
make lint     # lint both packages (ESLint)
make seed-admin SEED_EMAIL=… SEED_PASSWORD=…   # idempotent admin bootstrap
make seed-data SEED_USER_EMAIL=…               # idempotent demo content
make clean    # remove containers + volumes
```

## Project Structure

- `/client` — Vue 3 SPA (8 views, 9 components, 6 Pinia stores)
- `/server/src` — Express API (5 controllers, 5 models, JWT auth, audit trail)
- `/server/test` — 15 test files (Vitest + Supertest, `mongodb-memory-server`)
- `/server/src/scripts` — `seedAdmin` (idempotent admin bootstrap), `seedData` (demo content)
- `docker-compose.yml` — Traefik + API + Frontend + MongoDB
- `SPECIFICATION.md` — Full API contracts, data models and security notes

## Security & Operations

- **JWT secret (required):** the API refuses to start without a `JWT_SECRET` of 32+ chars in `server/.env`. Generate one with `openssl rand -hex 32`. Never commit the real `.env`.
- **First admin:** the first user to register via the UI automatically becomes admin (race-safe). Alternative for a blank DB: `make seed-admin SEED_EMAIL=you@example.com SEED_PASSWORD=…` (idempotent). Demo content for one user: `make seed-data SEED_USER_EMAIL=…` (idempotent, `[demo]`-marked). Both need the API `MONGO_URI` reachable (the running stack or your local dev DB).
- **Rate limiting:** login 10/15 min, register 5/15 min, API 300/15 min per IP (429 on excess); disabled in tests. **Single API replica assumed** — the in-memory limit counters are per process, so scaling the `api` service to N replicas multiplies every limit by N (a shared store such as Redis would be needed for strict limits).
- **Containers run non-root** (`node` user); images built reproducibly with `npm ci`.
- **Traefik dashboard disabled**: the Web UI is off (`api: false` in `traefik/traefik.yml`) — it exposes the full container topology and has no built-in auth, so it must never be public. Re-enable it deliberately (and only behind a private domain) if you need ops visibility.
- **Security headers at the edge** (`traefik/headers.yml`, bundled Traefik only): HSTS (1 year, `includeSubDomains`) on every HTTPS response, plus a strict CSP + `X-Frame-Options: DENY` on the SPA host. The frontend router's `middlewares` label lives in `docker-compose.override.yml` on purpose: standalone-Traefik deployments (docker provider only) replace that file and would silently disable the router on the unresolvable file-provider reference. If you change `FQDN_API` or the base domain, update the API origin in the CSP there.
- **Audit trail:** admin actions (role changes, deactivations, site-wide registration switch, category cascades) are logged to the `Audit` collection.
- Known residual: `braces` (high, dev-only transitive dep, no upstream fix) — never ships in the production images.

## Backups & restore

The compose file runs a `backup` sidecar (same `mongo` image, no ports, no routes): it `mongodump`s the database into the named `backups` volume every `BACKUP_INTERVAL_MINUTES` (default 60) and deletes dumps older than `BACKUP_RETENTION_DAYS` (default 14). Each dump is one directory: `<db>-<UTC-timestamp>/`.

```bash
make backup   # one extra on-demand dump right now (same volume)

# list dumps
ls $(docker volume inspect -f '{{ .Mountpoints | first .Name }}' prompt-hub_backups 2>/dev/null) 2>/dev/null \
  || docker compose run --rm --entrypoint sh backup -c 'ls -1t /backups | head'

# restore a dump (replaces the current data — stop the API first so nothing
# writes half-way through; --drop replaces every collection in the dump)
docker compose stop api
docker compose run --rm --entrypoint sh backup -c 'ls -1t /backups'   # pick a timestamp
docker compose run --rm --entrypoint sh backup -c 'sh /usr/local/bin/mongo-backup.sh --restore /backups/promptdb-2025-01-01T000000Z'
docker compose start api
```

The volume is local to the Docker host: copy it off-box for true disaster recovery (e.g. `docker run --rm -v prompt-hub_backups:/b -v \$(pwd):/out alpine tar czf promptbackups.tgz -C /b .`).
