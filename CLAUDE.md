# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: PromptHub

A full-stack web application for managing AI prompts. Vue 3 frontend (Composition API, Pinia, Tailwind CSS) + Express/Mongoose backend with JWT auth. Deployed via Docker Compose behind Traefik reverse proxy with TLS.

## Quick Commands

### Full-stack (Docker)
```bash
make start          # docker-compose up --build - recommended way to run
make stop           # docker-compose down
make restart        # docker-compose down && docker-compose up --build
make build          # docker-compose pull && docker-compose build --pull
make clean          # docker-compose down -v (removes containers + volumes)
make certs          # Generate TLS certs via traefik/crear_certs.sh
```

### Frontend (client/)
```bash
cd client && npm install && npm run dev   # Vite dev server (port 5173, proxies /api)
cd client && npm run build                # Vite production build → dist/
```

### Backend (server/)
```bash
cd server && npm install && npm run dev   # Express + nodemon (port 3000)
cd server && npm start                    # Production: node src/server.js
```

## Architecture Overview

```
prompt-hub/
├── client/src/                    # Vue 3 SPA
│   ├── main.js                    # Bootstrap: Pinia, Router, i18n
│   ├── App.vue                    # Root: <Navbar> + <Toast> + <router-view>
│   ├── api/index.js               # API client layer (fetch wrappers for all endpoints)
│   ├── router/index.js            # Vue Router with auth + admin guards
│   ├── stores/                    # 5 Pinia stores (auth, prompts, categories, i18n, UI)
│   ├── components/                # Reusable UI (Navbar, Toast, Modals, PromptCard, SearchBar)
│   ├── views/                     # Page components (Login, Register, PromptListView, etc.)
│   └── locales/                   # i18n: en.js, es.js, eu.js (~40 keys each)
├── server/src/                    # Express API
│   ├── server.js                  # Entry: CORS, routes, MongoDB connect
│   ├── models/                    # Mongoose schemas (User, Prompt, Category, SiteConfig)
│   ├── controllers/               # CRUD logic with ownership checks
│   ├── routes/                    # Express route definitions
│   ├── middleware/auth.js         # JWT verify + role authorize
│   └── scripts/                   # Data migrations (seedAdmin, migrateAddName)
├── traefik/                       # Reverse proxy: TLS, routing, HTTP→HTTPS redirect
├── docker-compose.yml             # 4 services: traefik, api, frontend, db (MongoDB)
└── .env / .env.example            # Configuration template
```

## Key Patterns

- **State management**: Pinia stores (`useAuthStore`, `usePromptStore`, `useCategoryStore`, `useI18nStore`, `useUIStore`). All persist to localStorage.
- **API client**: Centralized in `client/src/api/index.js` — all backend calls go through here with Bearer token from auth store.
- **Auth**: JWT (hs256) stored in localStorage. `middleware/auth.js` on server verifies tokens. Vue Router `beforeEach` guards client routes.
- **Ownership**: Resources (Prompt, Category) have `ownerId`. Controllers enforce ownership; admins bypass.
- **i18n**: Three locales (en/es/eu). `useI18nStore` provides a `t()` function used across all components. Locale persists in localStorage + reads `navigator.language`.
- **Role system**: `user` (default) and `admin`. First registered user auto-promoted to admin. Admin routes: `/api/users/*`, `/api/site-config`, ManageUsersView, SettingsView.

## File Conventions

- Vue SFCs use `<script setup>` with Composition API (`ref`, `computed`, `onMounted`).
- Pinia stores use `defineStore` with reactive state + actions.
- Server controllers follow CRUD pattern: query → ownership check (if not admin) → response.
- API client functions match backend route prefixes (`/api/prompts`, `/api/categories`, etc.).
- Locale files are parallel: en.js, es.js, eu.js must always have matching keys.

## i18n

The app must be **fully localized** in three languages: Spanish (es), Basque/Euskara (eu), and English (en). Every UI string must exist in all three locale files (`client/src/locales/{en,es,eu}.js`). When adding or modifying text in the UI, update all three locale files simultaneously — missing keys break translations. The `useI18nStore` provides a `t()` function used across all components. Locale persists in localStorage and reads `navigator.language` on load.

## Testing

The project follows **Test Driven Development (TDD)** and **Specification Driven Development (SDD)**. Tests are written *before* implementation. When adding or changing features:

1. Write/update tests first, verify they fail.
2. Implement the feature to make them pass.
3. Update `SPECIFICATION.md` if the change affects API contracts, data models, or architecture.

Test files go alongside the code they test (e.g., `server/src/controllers/promptController.test.js`, `client/src/views/PromptListView.test.js`). Use Vitest for both client and server.

## Commit Convention

Significant changes or fixes must follow [Conventional Commits](https://www.conventionalcommits.org/).

Format: `<type>(<scope>): <description>`

Common types: `fix`, `feat`, `refactor`, `chore`, `docs`, `style`, `test`.

Examples:
- `fix: remove edit icon from prompt list card`
- `feat(server): add user deactivation endpoint`
- `i18n: add basque (eu) translations for auth views`

Co-authored commits should include: `Co-Authored-By: <name> <<email>>`

## Database

MongoDB 8 via Docker (named volumes: `mongo_data`, `mongo_config`). Models use Mongoose schemas with references (`ref: 'User'`, etc.). Data migrations are plain Node scripts in `server/src/scripts/`.

## Spec

Full technical specification (API schemas, route details, architecture) is in `SPECIFICATION.md`. Refer to it when implementing new features or understanding data models.
