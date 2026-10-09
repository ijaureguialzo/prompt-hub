# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: PromptHub

Full-stack AI prompt management app. Vue 3 frontend (Composition API, Pinia, Tailwind CSS 4) + Express 5/Mongoose 9 backend with JWT auth. Docker Compose behind Traefik reverse proxy with TLS.

## Quick Commands

```bash
make start          # docker-compose up --build (recommended)
make stop           # docker-compose down
make restart        # docker-compose down && up --build
make build          # docker-compose pull && build --pull
make test           # run both server and client test suites
make lint           # lint both (ESLint) — CI runs lint + test
make seed-admin SEED_EMAIL=… SEED_PASSWORD=…   # idempotent admin bootstrap (runs inside the api container)
make seed-data SEED_USER_EMAIL=…               # idempotent demo content (runs inside the api container)
make clean          # docker-compose down -v (removes volumes)
make certs          # Generate TLS certs via traefik/crear_certs.sh
```

Local dev: `cd server && npm run dev` (port 3000) + `cd client && npm run dev` (port 5173, proxies /api to :3000).

## Architecture

```
prompt-hub/
├── client/src/                    # Vue 3 SPA (Vite)
│   ├── main.js                    # Bootstrap: Pinia, Router, i18n
│   ├── App.vue                    # Root: <Navbar> + <Toast> + <router-view>
│   ├── api/index.js               # API client (wrappers for all endpoints)
│   ├── router/index.js            # 8 routes with auth + admin guards
│   ├── stores/                    # 6 Pinia stores (auth, prompts, categories, i18n, UI, theme)
│   ├── components/                # 9 components (Navbar, Toast, PromptCard, SearchBar,
│   │                              #   3 modals, CategoryList, UsePromptModal)
│   ├── views/                     # 8 pages (Login, Register, PromptList/Detail,
│   │                              #   Category, Settings, Profile, ManageUsers)
│   └── locales/                   # en.js, es.js, eu.js (~40 keys each)
├── server/src/                    # Express 5 API
│   ├── server.js                  # Entry: CORS, routes, MongoDB connect
│   ├── models/                    # User, Prompt, Category, SiteConfig (Mongoose)
│   ├── controllers/               # auth, prompt, category, user, siteConfig (5)
│   ├── routes/                    # auth, prompt, category, user, siteConfig (5)
│   ├── middleware/                # auth.js (JWT + role), errorHandler, ownership.js
│   └── scripts/                   # seedAdmin, migrateAddName
├── server/test/                   # 8 Vitest integration tests (auth, categories, health,
│                                   #   integration, prompts, siteConfig, smoke, users)
├── traefik/                       # Reverse proxy: TLS, routing, HTTP→HTTPS redirect
├── docker-compose.yml             # 4 services: traefik, api, frontend, db
└── .env / .env.example            # Configuration template
```

## Key Patterns

- **Stores**: `useAuthStore`, `usePromptStore`, `useCategoryStore`, `useI18nStore`, `useUIStore`, `useThemeStore`. All persist to localStorage.
- **API client**: Centralized in `client/src/api/index.js` — all backend calls through here with Bearer token.
- **Auth**: JWT (hs256) in localStorage. Server `middleware/auth.js` verifies tokens. Vue Router `beforeEach` guards routes.
- **Ownership**: Resources (Prompt, Category) have `ownerId`. `middleware/ownership.js` provides reusable `requireOwnership()` route middleware (runs BEFORE any write; admins bypass).
- **Security hardening**: helmet + per-IP rate limiting (`middleware/rateLimit.js`: strict on /api/auth, loose on /api; disabled in tests); JWT secret validated fail-fast in `src/config.js` (32+ chars, no default).
- **i18n**: Three locales (en/es/eu). `useI18nStore` provides `t()` function. Locale persists in localStorage + reads `navigator.language`.
- **Role system**: `user` (default) and `admin`. First registered user auto-promoted to admin. Admin routes: `/api/users/*`, `/api/site-config`, ManageUsersView, SettingsView.
- **Theme**: `useThemeStore` supports light/dark/auto with system preference listener (Tailwind CSS 4).

## File Conventions

- Vue SFCs: `<script setup>` with Composition API (`ref`, `computed`, `onMounted`).
- Pinia: `defineStore` with reactive state + actions.
- Controllers: query → response. Ownership is enforced by `requireOwnership` route middleware (runs BEFORE any write; admins bypass) — never move writes before that check.
- API client functions match backend route prefixes (`/api/prompts`, `/api/categories`, etc.).
- Locale files parallel: en.js, es.js, eu.js must always have matching keys.

## Testing

Both client and server use **Vitest**. Server: 13 test files in `server/test/` (unit + Supertest integration against `mongodb-memory-server`, via `.env.test`). Client: 26 test files (Vitest + Vue Test Utils, jsdom).

```bash
make test           # Run both suites
cd server && npm test   # Server only
cd client && npm test   # Client only
```

## Linting

ESLint (flat config) + Prettier on both packages; `make lint` (or CI) runs ESLint, `npm run format` runs Prettier. Vue SFCs are linted by `eslint-plugin-vue` but kept hand-formatted (Prettier's Vue parser mangles multi-statement handlers); `.js`/`.ts` are Prettier-formatted (2-space, single quotes; server keeps semicolons, client doesn't — see root `.prettierrc`).

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/). Format: `<type>(<scope>): <description>`. Types: `fix`, `feat`, `refactor`, `chore`, `docs`, `style`, `test`.

## Database

MongoDB 8 via Docker (named volumes: `mongo_data`, `mongo_config`). Mongoose schemas with references (`ref: 'User'`). Data migrations in `server/src/scripts/`.

## Spec

Full technical specification is in `SPECIFICATION.md`. Refer to it for API contracts, data models, and architecture.
