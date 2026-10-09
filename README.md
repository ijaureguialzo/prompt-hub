# PromptHub

Full-stack AI prompt management application with authentication, categorization, and multi-language support.

## Features

- **Auth**: JWT-based registration/login (first user auto-promoted to admin)
- **Prompt Management**: Full CRUD with ownership checks and tags
- **Categories**: Organize prompts, cascade delete on category removal
- **Search & Filter**: Debounced search by title/content/tags, filter by category
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
- **First admin:** the first user to register via the UI automatically becomes admin (race-safe). Alternative for a blank DB: `cd server && SEED_EMAIL=you@example.com SEED_PASSWORD=… npm run seed:admin` (idempotent). Demo content for one user: `SEED_USER_EMAIL=… npm run seed:data` (idempotent, `[demo]`-marked).
- **Rate limiting:** login 10/15 min, register 5/15 min, API 300/15 min per IP (429 on excess); disabled in tests.
- **Containers run non-root** (`node` user); images built reproducibly with `npm ci`.
- **Traefik dashboard** (ops only): `https://traefik.<base-domain>/dashboard/` — the domain is not expected to resolve publicly in production.
- **Audit trail:** admin actions (role changes, deactivations, site-wide registration switch, category cascades) are logged to the `Audit` collection.
- Known residual: `braces` (high, dev-only transitive dep, no upstream fix) — never ships in the production images.
