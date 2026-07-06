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
make clean    # remove containers + volumes
```

## Project Structure

- `/client` — Vue 3 SPA (8 views, 8 components, 6 Pinia stores)
- `/server/src` — Express API (5 controllers, 4 models, JWT auth)
- `docker-compose.yml` — Traefik + API + Frontend + MongoDB
- `SPECIFICATION.md` — Full API contracts and data models
