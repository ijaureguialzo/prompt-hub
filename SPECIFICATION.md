# Technical Specification: PromptHub

## 1. Overview

Full-stack AI prompt management system. Vue 3 frontend + Express/Mongoose backend with JWT auth, deployed via Docker Compose behind Traefik with TLS.

**Tech Stack:** Vue 3 (Composition API), Pinia, Vue Router 5, Tailwind CSS 4, Vite | Express 5, Mongoose 9, JWT (hs256) | MongoDB 8, Docker Compose, Traefik 3

---

## 2. API Specification

All protected routes require a Bearer Token (`Authorization` header). Admin routes additionally require `role === 'admin'`.

### Error response format

All error responses share a stable, language-neutral shape:

```json
{ "code": "STABLE_CODE", "message": "English human-readable text", "...": "optional params" }
```

- `code` is a stable machine-readable identifier (`INVALID_TOKEN`, `AUTH_REQUIRED`, `USER_INACTIVE`, `FORBIDDEN`, `NOT_OWNER`, `INVALID_CREDENTIALS`, `ACCOUNT_DEACTIVATED`, `REGISTRATION_DISABLED`, `EMAIL_TAKEN`, `WRONG_PASSWORD`, `PASSWORD_TOO_SHORT`, `VALIDATION_ERROR`, `TAGS_TOO_MANY`, `EMAIL_INVALID`, `DUPLICATE`, `NOT_FOUND`, `LIMIT_REACHED`, `RATE_LIMITED`, `SELF_MODIFICATION`, `INTERNAL_ERROR`).
- `message` is the English fallback for clients that do not localize.
- Some codes carry extra parameters for interpolation (`LIMIT_REACHED` includes `limit`).
- The client maps `code` to a localized string (`errors.*` keys in `client/src/locales`); unknown codes fall back to `message`, then to a generic localized string. Never match on `message` content for behavior — use `code`.

### 2.1 Auth API
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Register (first user → admin; rate limited) | `{ name, email, password }` | `{ token, user }` | 201, 400, 403, 409, 429, 500 |
| `/api/auth/login` | `POST` | Login (checks isActive; rate limited) | `{ email, password }` | `{ token, user }` | 200, 401, 403, 429, 500 |
| `/api/auth/me` | `GET` | Get current user | — | `{ user }` | 200, 401, 500 |
| `/api/auth/me` | `PATCH` | Update own profile / change password (`{ name?, email?, currentPassword?, newPassword? }`) | see left | `{ user }` | 200, 400, 401, 409, 500 |

### 2.2 Prompts API (authenticated)
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/prompts` | `GET` | List prompts, newest first, paginated (`?limit=` default 50, max 500; `?page=`; `?q=` substring on title/content/tags; `?categoryId=` id or `none` for uncategorized; `?tag=` repeatable, AND). Rows are lightweight: metadata + `excerpt` (first 200 chars of content) — full content only on `GET /:id` | — | `{ prompts: Prompt[], total, page, limit, hasMore }` | 200, 400, 500 |
| `/api/prompts` | `POST` | Create prompt (ownership check; per-user quota → 409; per-IP write rate limit → 429) | `{ title, content, categoryId?, tags[] }` | `Prompt` | 201, 400, 409, 429, 500 |
| `/api/prompts/:id` | `GET` | Get single prompt (populate categoryId.name) | — | `Prompt` | 200, 404, 500 |
| `/api/prompts/:id` | `PUT` | Update prompt (ownership check) | `{ title?, content?, categoryId? }` | `Prompt` | 200, 400, 404, 500 |
| `/api/prompts/:id` | `DELETE` | Delete prompt (ownership check) | — | `{ message }` | 200, 404, 500 |

### 2.3 Categories API (authenticated)
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/categories` | `GET` | List all categories with denormalized `promptCount`, plus `{ uncategorizedCount, totalPrompts }` for the sidebar | — | `{ categories: Category[], uncategorizedCount, totalPrompts }` | 200, 500 |
| `/api/categories` | `POST` | Create category (ownership check; per-user quota → 409; per-IP write rate limit → 429) | `{ name, description? }` | `Category` | 201, 400, 409, 429, 500 |
| `/api/categories/:id` | `GET` | Get single category (populate ownerId) | — | `Category` | 200, 404, 500 |
| `/api/categories/:id` | `PUT` | Update category (ownership check) | `{ name?, description? }` | `Category` | 200, 400, 404, 500 |
| `/api/categories/:id` | `DELETE` | Delete category (admin: cascade-delete its prompts; non-admin owner: deletes only own prompts, others are unlinked) | — | `{ message }` | 200, 403, 404, 500 |

### 2.4 Users API (admin-only)
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/users` | `GET` | List all users (including inactive) | — | `Array<User>` | 200, 500 |
| `/api/users/:id` | `PUT` | Update user (role, isActive toggle; admin cannot modify their own role/isActive) | `{ name?, role?, isActive? }` | `User` | 200, 400, 404, 500 |
| `/api/users/:id` | `DELETE` | Soft-delete user (set isActive=false; admin cannot deactivate themselves) | — | `{ message }` | 200, 400, 404, 500 |

### 2.5 Site Config API
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/site-config/public` | `GET` | Get registration status (no auth; atomic upsert seeds the singleton on first read) | — | `{ registrationEnabled }` | 200, 500 |
| `/api/site-config` | `GET` | Get full config (authenticated; same atomic upsert) | — | `{ _id, registrationEnabled, updatedAt }` | 200, 401, 500 |
| `/api/site-config` | `PUT` | Update config (admin-only; audited) | `{ registrationEnabled }` | `{ _id, registrationEnabled, updatedAt }` | 200, 400, 401, 403, 500 |

### 2.6 Operational
| Endpoint | Method | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Liveness probe (no auth) | 200 `{ status: 'OK', timestamp }` |

**Rate limiting** (per IP; disabled in the test environment): login 10/15min, register 5/15min, content creation (`POST /api/prompts`, `POST /api/categories`) 20/15min, all other API requests 300/15min. Exceeded → `429`. Quotas are tunable via `RATE_LIMIT_AUTH`, `RATE_LIMIT_REGISTER`, `RATE_LIMIT_WRITE`, `RATE_LIMIT_API`.

**Abuse protection**: per-user quotas bound what one account can create (`MAX_PROMPTS_PER_USER` default 200, `MAX_CATEGORIES_PER_USER` default 50; enforced with a count before the insert, best-effort under concurrency). Combined with the creation rate limit, this prevents a single account from flooding the shared prompt list or the categories sidebar.

**Login**: unknown emails are compared against a dummy bcrypt hash so response timing does not reveal which emails are registered.

---

## 3. Data Models (Mongoose Schemas)

### User
```javascript
{ name: String(required, ≤100), email: String(unique), password: String(hash),
  role: String(user/admin, default:'user'), isActive: Boolean(default:true),
  adminSlot: String(unique, sparse) // "first user = admin" claimant; stripped from all API output
}
```

### Prompt
```javascript
{ title: String(required, ≤100), content: String(required, ≤50000),
  excerpt: String (computed on read via $substrCP projection in list views; never written),
  categoryId: ObjectId(ref:'Category', nullable, indexed),
  ownerId: ObjectId(ref:'User', indexed),
  tags: [String(≤50)] (max 20),
  createdAt: Date(indexed, default sort), updatedAt: Date }
```

### Category
```javascript
{ name: String(required, unique), description: String(≤255),
  ownerId: ObjectId(ref:'User', indexed), createdAt: Date, updatedAt: Date }
```

### SiteConfig (singleton _id='site')
```javascript
{ registrationEnabled: Boolean(default:true), updatedAt: Date }
```

### Audit (append-only, admin actions)
```javascript
{ actorId: ObjectId(ref:'User'), actorEmail: String, action: String(indexed),
  targetId: String, targetEmail: String, details: Mixed, createdAt: Date(indexed) }
// Actions: user.role_change / user.activate / user.deactivate / siteconfig.update / category.delete
```

---

## 4. Frontend Architecture

### Views (8): LoginView, RegisterView, PromptListView, PromptDetailView, CategoryView, SettingsView, ProfileView, ManageUsersView

### Components (9): Navbar, Toast, PromptCard, SearchBar, CreatePromptModal, CreateCategoryModal, DeleteConfirmationModal, CategoryList, UsePromptModal

### Stores (6): useAuthStore (token/user), usePromptStore (CRUD + currentPrompt + server-side filters `q`/`categoryId`/`tags` + `loadMore` pagination), useCategoryStore (CRUD + selection + server counts), useI18nStore (en/es/eu), useUIStore (toasts + modals), useThemeStore (light/dark/auto)

### Routes (8): `/` → PromptListView, `/login`, `/register`, `/prompt/:id` → PromptDetailView, `/category/:id` → CategoryView, `/settings`, `/profile/:id` → ProfileView, `/admin/users` (admin guard)

### Guards: `beforeEach` (`router/guards.js`) redirects unauthenticated users to login (with `?redirect=`). `/profile/:id` allows the owner for any authenticated user, other profiles are admin-only. `/admin/users` checks `role === 'admin'`. A 401 from the API client triggers a soft logout + router navigation (no full page reload).

---

## 5. Testing

Both client and server use **Vitest**. Server: 15 test files in `server/test/` (unit + Supertest integration against `mongodb-memory-server`, config from `.env.test`). Client: 26 test files (Vitest + Vue Test Utils, jsdom). Linting: ESLint (flat config) + Prettier on both packages.

```bash
make test           # Run both suites
make lint           # Run both lint suites
cd server && npm test   # Server only (Vitest)
cd client && npm test   # Client only (Vitest + Vue Test Utils)
```

---

## 6. Deployment Architecture

Docker Compose: 4 services (traefik, api, frontend, db). API depends on db `healthy`; frontend depends on api `healthy`; Traefik depends on frontend `healthy`. All Node containers run as the unprivileged `node` user.

- **Traefik**: HTTP 80 → HTTPS redirect, TLS 443 (dynamic certs), routes for api + frontend + internal dashboard (`traefik.prompthub.test/dashboard`, see `traefik/traefik.yml`).
- **Backend Dockerfile**: Multi-stage build, `npm ci` + dev-prune, `node:26-slim` (pinnable via `NODE_VERSION`), exposes port 3000.
- **Frontend Dockerfile**: Multi-stage build, `node:26-slim`, serves `dist/` via `serve` on port 5173.
- **DB**: MongoDB 8, named volumes (`mongo_data`, `mongo_config`).

## 7. Security Notes

- **JWT fail-fast**: the server refuses to start without a `JWT_SECRET` of 32+ chars (no default-secret fallback).
- **Rate limiting** on auth endpoints + global API limiter (see 2.6) and `helmet` security headers.
- **Ownership**: `middleware/ownership.js` (`requireOwnership`) runs BEFORE any mutating write on prompts/categories; admins bypass.
- **Safe cascades**: a non-admin owner deleting a category only destroys their own prompts; others' are unlinked.
- **Admin lockout guards**: an admin cannot demote or deactivate themselves.
- **Race-free first admin**: registration claims a unique sparse `adminSlot` — exactly one admin no matter how registrations interleave.
- **Audit trail**: privileged operations are logged to the `Audit` collection (fire-and-forget; never blocks the request).
- **Error handling**: raw error messages are logged server-side and only returned outside production; validation/duplicate-key errors map to friendly 400/409 responses.
- **Input validation**: all writable fields are length-capped (see §3); `categoryId` must reference an existing category.
- **HTTP**: JSON bodies only (no urlencoded parser), CORS with an explicit origin list and no credentials.

## 8. Operational Scripts

```bash
make seed-admin SEED_EMAIL=x@y.com SEED_PASSWORD=secret [SEED_NAME=Name]  # idempotent admin bootstrap
make seed-data SEED_USER_EMAIL=x@y.com   # idempotent demo content (marked [demo])
cd server && node src/scripts/migrateAddName.js          # one-off migration (name field backfill)
```
