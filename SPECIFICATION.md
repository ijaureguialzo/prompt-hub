# Technical Specification: PromptHub

## 1. Overview

Full-stack AI prompt management system. Vue 3 frontend + Express/Mongoose backend with JWT auth, deployed via Docker Compose behind Traefik with TLS.

**Tech Stack:** Vue 3 (Composition API), Pinia, Vue Router 5, Tailwind CSS 4, Vite | Express 5, Mongoose 9, JWT (hs256) | MongoDB 8, Docker Compose, Traefik 3

**Visibility model (shared hub):** PromptHub is a *shared* prompt hub, not a private vault. Every authenticated user can browse, search, read and copy **any** prompt or category — the listings in §2.2/§2.3 are global. Ownership gates **writes** only: each user creates/edits/deletes their own prompts and categories (per-user quotas), and export/import is scoped to the caller's own prompts (§2.2a).

---

## 2. API Specification

All protected routes require a Bearer Token (`Authorization` header). Admin routes additionally require `role === 'admin'`.

### Error response format

All error responses share a stable, language-neutral shape:

```json
{ "code": "STABLE_CODE", "message": "English human-readable text", "...": "optional params" }
```

- `code` is a stable machine-readable identifier (`INVALID_TOKEN`, `AUTH_REQUIRED`, `USER_INACTIVE`, `FORBIDDEN`, `NOT_OWNER`, `INVALID_CREDENTIALS`, `ACCOUNT_DEACTIVATED`, `ACCOUNT_LOCKED`, `REGISTRATION_DISABLED`, `EMAIL_TAKEN`, `WRONG_PASSWORD`, `PASSWORD_TOO_SHORT`, `VALIDATION_ERROR`, `TAGS_TOO_MANY`, `EMAIL_INVALID`, `DUPLICATE`, `NOT_FOUND`, `LIMIT_REACHED`, `RATE_LIMITED`, `SELF_MODIFICATION`, `IMPORT_INVALID`, `INTERNAL_ERROR`).
- `message` is the English fallback for clients that do not localize.
- Some codes carry extra parameters for interpolation (`LIMIT_REACHED` includes `limit`).
- The client maps `code` to a localized string (`errors.*` keys in `client/src/locales`); unknown codes fall back to `message`, then to a generic localized string. Never match on `message` content for behavior — use `code`.

### 2.1 Auth API
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Register (first user → admin; rate limited) | `{ name, email, password }` | `{ token, user }` | 201, 400, 403, 409, 429, 500 |
| `/api/auth/login` | `POST` | Login (checks isActive; rate limited; per-account lockout after 5 failures in 15 min → 401 `ACCOUNT_LOCKED` for 15 min) | `{ email, password }` | `{ token, user }` | 200, 401, 403, 429, 500 |
| `/api/auth/me` | `GET` | Get current user | — | `{ user }` | 200, 401, 500 |
| `/api/auth/me` | `PATCH` | Update own profile / change password (`{ name?, email?, currentPassword?, newPassword? }`) | see left | `{ user }` | 200, 400, 401, 409, 500 |

### 2.2 Prompts API (authenticated)
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/prompts` | `GET` | List **all** prompts (shared hub: every user's prompts; read for all, writes owner-only), newest first, paginated (`?limit=` default 50, max 500; `?page=`; `?q=` substring on title/content/tags; `?categoryId=` id or `none` for uncategorized; `?tag=` repeatable, AND). Rows are lightweight: metadata + `excerpt` (first 200 chars of content) — full content only on `GET /:id` | — | `{ prompts: Prompt[], total, page, limit, hasMore }` | 200, 400, 500 |
| `/api/prompts` | `POST` | Create prompt (ownership check; per-user quota → 409; per-IP write rate limit → 429) | `{ title, content, categoryId?, tags[] }` | `Prompt` | 201, 400, 409, 429, 500 |
| `/api/prompts/:id` | `GET` | Get single prompt (populate categoryId.name) | — | `Prompt` | 200, 404, 500 |
| `/api/prompts/:id` | `PUT` | Update prompt (ownership check) | `{ title?, content?, categoryId? }` | `Prompt` | 200, 400, 404, 500 |
| `/api/prompts/:id` | `DELETE` | Delete prompt (ownership check) | — | `{ message }` | 200, 404, 500 |
| `/api/prompts/export` | `GET` | Export **all** prompts owned by the caller (full content, never paginated); JSON export payload, see 2.2a | — | `ExportPayload` | 200, 401, 500 |
| `/api/prompts/import` | `POST` | Import prompts from an export payload (two-phase: dry run + apply, see 2.2a). Body limit 20 MB (env `IMPORT_BODY_LIMIT`), write rate limited per IP | `{ dryRun?, prompts[], overwrites? }` | `ImportResult` | 200, 400, 401, 409, 429, 500 |

### 2.2a Export / Import

Users can back up and re-import their own prompts as a **ZIP file containing one JSON document** (`prompts.json`). The ZIP is assembled/parsed **in the browser** (JSZip) — the server API is JSON-only, consistent with the no-multipart posture (§7).

**Export payload** (`GET /api/prompts/export`, `ExportPayload`):

```json
{
  "format": "prompthub-export",
  "version": 1,
  "exportedAt": "ISO-8601",
  "exporter": { "id": "user _id", "name": "...", "email": "..." },
  "prompts": [
    { "id": "prompt _id", "clientId": "uuid", "title": "...", "content": "...",
      "categoryId": "id|null", "categoryName": "...|null", "tags": ["..."],
      "createdAt": "ISO-8601", "updatedAt": "ISO-8601" }
  ]
}
```

**Prompt identity is per-user.** Every prompt carries a `clientId` (UUID, assigned at creation). Import matches file entries against the **importing user's own prompts only**:

1. Entry with a non-empty `clientId` → the same prompt if the importing user owns a prompt with that `clientId` (otherwise it is new).
2. Entry without `clientId` (legacy/hand-made file) → matched by exact title, case-insensitive, within the importing user's prompts.
3. Duplicates within one file (same `clientId`, or same normalized title when no `clientId`): the first occurrence is classified, later occurrences are `duplicate` and never applied.

Consequences: a prompt that exists only in *another* user's account is **not** a match — it is imported as a brand-new prompt in the importer's account (new `_id`, owner = importer). Two users holding copies of the same exported prompt are two different prompts, by design.

**Import request** (`POST /api/prompts/import`):

- `prompts` — array of entries with the same fields as `ExportPayload.prompts[]` (`title` and `content` required; `tags`, `categoryId`, `categoryName`, `createdAt`, `updatedAt` optional). 1–500 entries (env `MAX_IMPORT_PROMPTS`), every field re-validated against the schema caps on the server.
- `dryRun` — `true` classifies without writing; omitted/`false` applies.
- `overwrites` — indices (into `prompts`) of the conflicting entries the user approved for overwriting. Conflicting entries **not** listed are skipped, never silently overwritten.

**Import response** (`ImportResult`):

```json
{
  "dryRun": true,
  "results": [ { "index": 0, "clientId": "uuid|null", "title": "...",
    "status": "new|conflict|duplicate",
    "existingId": "...|null", "existingTitle": "...|null", "existingUpdatedAt": "ISO|null",
    "categoryResolved": true|false, "categoryWillBeCreated": true|false } ],
  "summary": { "total": 0, "new": 0, "conflicts": 0, "duplicates": 0 },
  "categories": { "toCreate": ["names the apply phase will create"] },
  "quota": { "used": 0, "limit": 200, "wouldUse": 0, "exceeded": false }
}
```

Applied runs return `{ dryRun: false, created, updated, skipped, categories: { created }, results[], quota }` where `status` is `created|updated|skipped` (skipped: `reason` is `not-confirmed` or `duplicate`).

**Rules:**
- Applies **atomically** against the quota: if the number of `new` entries would push the user past `MAX_PROMPTS_PER_USER`, the whole request fails with `409 LIMIT_REACHED` and nothing is written. The dry run reports `quota.exceeded` so the client can disable the confirm button in advance.
- Crash mid-apply: the writes are **not** transactional (single replica, no replica set). A failure part-way leaves a partial state that is *convergent, not corrupt*: a retry of the same file reclassifies the already-created entries as conflicts (matched by `clientId`) and skips the duplicates, and the updates are idempotent (`$set` of the same values), so re-applying reaches the intended final state. Creations are batched in a single multi-insert; updates run individually.
- New prompts: owner = importer, `clientId` taken from the file (or a fresh UUID if absent), original `createdAt`/`updatedAt` preserved when present and valid.
- Category resolution (create and update): `categoryName` matched case-insensitively against the importer's own categories; failing that, `categoryId` if it points to a category owned by the importer. If the entry references a category by name that the importer does not have, it is **created for the importer on apply** (deduped by name within the file, capped by `MAX_CATEGORIES_PER_USER`, names longer than the 50-char schema cap are skipped): the dry run pre-computes the same plan (`categoryWillBeCreated` per entry, `categories.toCreate` summary) so the UI warns the user. Names that exist but belong to **another** user are never created (category names carry a global unique index) nor referenced — those prompts land uncategorized (`categoryResolved: false`). Entries with only a foreign `categoryId` and no name cannot be recreated. A repeat import of the same file re-resolves by name, so no duplicate categories are ever created.
- `400 IMPORT_INVALID` for a malformed payload (missing/empty `prompts`, more than the entry cap, or any entry violating a field cap); the message identifies the offending entry.

### 2.3 Categories API (authenticated)
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/categories` | `GET` | List **all** categories (shared hub) with denormalized `promptCount`, plus `{ uncategorizedCount, totalPrompts }` for the sidebar | — | `{ categories: Category[], uncategorizedCount, totalPrompts }` | 200, 500 |
| `/api/categories` | `POST` | Create category (ownership check; per-user quota → 409; per-IP write rate limit → 429) | `{ name, description? }` | `Category` | 201, 400, 409, 429, 500 |
| `/api/categories/:id` | `GET` | Get single category (returns the raw `ownerId` — no user population; the list endpoint carries the display data the UI needs) | — | `Category` | 200, 404, 500 |
| `/api/categories/:id` | `PUT` | Update category (ownership check) | `{ name?, description? }` | `Category` | 200, 400, 404, 500 |
| `/api/categories/:id` | `DELETE` | Delete category (admin: cascade-delete its prompts; non-admin owner: deletes only own prompts, others are unlinked) | — | `{ message }` | 200, 403, 404, 500 |

### 2.4 Users API (admin-only)
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/users` | `GET` | List all users (including inactive) | — | `Array<User>` | 200, 500 |
| `/api/users/:id` | `PUT` | Update user (role, isActive toggle, per-user quota overrides; admin cannot modify their own role/isActive) | `{ name?, role?, isActive?, promptQuota?, categoryQuota? }` | `User` | 200, 400, 403, 404, 500 |
| `/api/users/:id` | `DELETE` | Soft-delete user (set isActive=false; admin cannot deactivate themselves) | — | `{ message }` | 200, 400, 404, 500 |

### 2.5 Site Config API
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/site-config/public` | `GET` | Get registration status (no auth; atomic upsert seeds the singleton on first read) | — | `{ registrationEnabled }` | 200, 500 |
| `/api/site-config` | `GET` | Get full config (authenticated; same atomic upsert) | — | `{ _id, registrationEnabled, updatedAt }` | 200, 401, 500 |
| `/api/site-config` | `PUT` | Update config (admin-only; audited) | `{ registrationEnabled }` | `{ _id, registrationEnabled, updatedAt }` | 200, 400, 401, 403, 500 |

### 2.5a Audit API (admin-only)
| Endpoint | Method | Description | Query Params | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/audit` | `GET` | List audit entries, most recent first | `action` (exact), `actorId` (ObjectId; malformed → 400), `page` (default 1), `limit` (default 50, max 500) | `{ entries, total, page, limit, hasMore }` | 200, 400, 401, 403, 500 |

Read-only: the trail is append-only, so there is no write/delete endpoint. Each entry is the §3 `Audit` shape (`actorId`/`actorEmail`/`action`/`targetId?`/`targetEmail?`/`details?`/`createdAt`). Recorded actions: `user.role_change` (`details.from`/`to`), `user.activate`, `user.deactivate`, `siteconfig.update` (`details.<field>.from`/`to`), `category.delete` (cascade counts). Filtered queries use the `{actorId, createdAt}` / `{action, createdAt}` indexes; a retention policy (TTL or purge) is a pending decision (PLAN.md P1/6).

### 2.6 Operational
| Endpoint | Method | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | **Readiness** probe (no auth): 200 `{ status: 'OK', db: 'connected', timestamp }` only while the database connection is up; 503 `{ status: 'DEGRADED', db: 'disconnected'\|'connecting'\|'disconnecting', timestamp }` otherwise (the compose healthcheck treats non-200 as unhealthy) |

**Rate limiting** (per IP; disabled in the test environment): login 10/15min, register 5/15min, content creation (`POST /api/prompts`, `POST /api/categories`) 20/15min, all other API requests 300/15min. Exceeded → `429`. Quotas are tunable via `RATE_LIMIT_AUTH`, `RATE_LIMIT_REGISTER`, `RATE_LIMIT_WRITE`, `RATE_LIMIT_API`. The counters live in the API process's memory (express-rate-limit's default store), so these limits assume a **single API replica**: running N replicas multiplies every limit by N. A shared store (e.g. Redis) is the upgrade path for strict horizontal scaling (see §7).

**Abuse protection**: per-user quotas bound what one account can create. The global defaults come from `MAX_PROMPTS_PER_USER` (200) / `MAX_CATEGORIES_PER_USER` (50); admins may override them **per account** via `PUT /api/users/:id` (`promptQuota` / `categoryQuota`, integer 0–100000, `null` = back to the global default; 0 = the account cannot create new content). Enforcement uses the effective value (override ?? global) on prompt/category creation and import, is best-effort under concurrency (count before insert), and is combined with the per-IP creation rate limit so one account cannot flood the shared hub. Quota changes are audit-logged (`user.quota_change`); the categories endpoint reports the caller's effective limits.

**Client error reporting: deliberately deferred** (PLAN.md P5/35). Operational visibility today comes from the server side: structured pino logs (rotated, §P5), the audit trail for admin actions, and the readiness/health probes. A client-side `window.onerror` → `POST /api/telemetry` hook would add an unauthenticated write surface, a new collection, and a retention/PII policy (stack traces and URLs can carry user data) for marginal value at this app's scale. Revisit — or send errors to an existing external collector — if client-side failures that the server logs cannot explain actually appear.

**Search cost** (measured, PLAN.md P3/20): the list search (`?q`) is a case-insensitive substring `$regex` over title/content/tags. A non-anchored regex cannot use a B-tree index, so the search is a collection scan — measured at **~2 ms scan / ~8 ms end-to-end for 10⁴ prompts** (`server/test/searchPerformance.test.js` keeps budget tripwires on both, and asserts the plan uses no index, so any future index usage flips a loud test). The cost is accepted at shared-hub scale; the documented re-evaluation trigger is ~10⁶ collection docs or a failing budget (options: `$text` index — changes substring semantics — or a title-only anchored regex).

**Login**: unknown emails are compared against a dummy bcrypt hash so response timing does not reveal which emails are registered.

---

## 3. Data Models (Mongoose Schemas)

### User
```javascript
{ name: String(required, ≤100), email: String(unique), password: String(hash),
  role: String(user/admin, default:'user'), isActive: Boolean(default:true),
  // per-user quota overrides (admin-editable): null/absent = global default
  promptQuota: Number(0..100000, default:null), categoryQuota: Number(0..100000, default:null),
  adminSlot: String(unique, sparse) // "first user = admin" claimant; stripped from all API output
  // internal brute-force state (stripped from all API output):
  loginFails: Number(default:0), loginFailsAt: Date, lockUntil: Date
}
```

### Prompt
```javascript
{ title: String(required, ≤100), content: String(required, ≤50000),
  excerpt: String (computed on read via $substrCP projection in list views; never written),
  clientId: String(UUID, default crypto.randomUUID(), indexed)
      // stable identity for export/import matching; intentionally NOT globally
      // unique — two users may legitimately own copies of the same exported prompt
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

### Components (10): Navbar, Toast, PromptCard, SearchBar, CreatePromptModal, CreateCategoryModal, DeleteConfirmationModal, CategoryList, UsePromptModal, ImportPromptsModal (per-row select/overwrite, quota warning, select-all/clear-all)

### Stores (6): useAuthStore (token/user), usePromptStore (CRUD + currentPrompt + server-side filters `q`/`categoryId`/`tags` + `loadMore` pagination + export/import flow state), useCategoryStore (CRUD + selection + server counts), useI18nStore (en/es/eu), useUIStore (toasts + modals), useThemeStore (light/dark/auto)

### Export/import client (`src/lib/promptBackup.js`): builds the export ZIP (JSZip, `prompts.json` inside) and triggers the download; parses an uploaded `.zip` (or bare `.json`) file, normalizes and pre-validates entries, and merges the server dry-run classification into per-row UI state. `usePromptStore` orchestrates the API calls (`GET /prompts/export`, `POST /prompts/import`) around it.

### Routes (8): `/` → PromptListView, `/login`, `/register`, `/prompt/:id` → PromptDetailView, `/category/:id` → CategoryView, `/settings`, `/profile/:id` → ProfileView, `/admin/users` (admin guard)

### Guards: `beforeEach` (`router/guards.js`) redirects unauthenticated users to login (with `?redirect=`). `/profile/:id` allows the owner for any authenticated user, other profiles are admin-only. `/admin/users` checks `role === 'admin'`. A 401 from the API client triggers a soft logout + router navigation (no full page reload).

---

## 5. Testing

Both client and server use **Vitest**. Server: 16 test files in `server/test/` (unit + Supertest integration against `mongodb-memory-server`, config from `.env.test`). Client: 28 test files (Vitest + Vue Test Utils, jsdom). Linting: ESLint (flat config) + Prettier on both packages.

```bash
make test           # Run both suites
make lint           # Run both lint suites
cd server && npm test   # Server only (Vitest)
cd client && npm test   # Client only (Vitest + Vue Test Utils)
```

---

## 6. Deployment Architecture

Docker Compose: 4 services (traefik, api, frontend, db). API depends on db `healthy`; frontend depends on api `healthy`; Traefik depends on frontend `healthy`. All Node containers run as the unprivileged `node` user.

- **Traefik**: HTTP 80 → HTTPS redirect, TLS 443 (dynamic certs), routes for api + frontend only. Hostnames are configurable via `FQDN_FRONTEND` / `FQDN_API` (compose defaults: `prompthub.test` / `api.prompthub.test`). The Traefik API dashboard is **disabled** (`api: false` in `traefik/traefik.yml`): it exposes the full container topology and must never be public. The traefik container therefore defines no routers. Edge security headers (`traefik/headers.yml`, responseHeaders): **HSTS** (1 year, `includeSubDomains`) on every HTTPS response via the `websecure` entrypoint, and a strict **CSP** (`default-src 'self'`, `connect-src` allowing the API origin) + `X-Frame-Options: DENY` on the frontend router only — the API already emits its own CSP via helmet, so the two must not stack. The frontend router's `middlewares=frontend-secure@file` label is declared in `docker-compose.override.yml`, not in `docker-compose.yml`: `frontend-secure` is a file-provider object that only exists in the bundled traefik container, and deployments that run a standalone Traefik (docker provider only, e.g. the home-pi Ansible roles) replace the override file — a docker-provider Traefik cannot resolve the `@file` reference and would silently disable the frontend router. Such deployments get no edge HSTS/CSP (the SPA is served as-is; the API keeps its helmet CSP). If you change `FQDN_API`/base domain, update the origin in the CSP.
  - **API routing**: the API is reachable both on its own host (`FQDN_API`, the default target of `VITE_API_URL`) and **same-origin** on the frontend host: a dedicated router (`Host(FQDN_FRONTEND) && PathPrefix(/api)`, priority 100 vs the frontend router's 10) forwards the SPA's `/api/*` to the API service. This makes a same-origin client build (`VITE_API_URL=/api`) work without CORS, and immunizes the deploy against the classic failure where the SPA fallback would 200 `index.html` for `/api/*`. The client additionally fails loudly on any OK response with an empty/non-JSON body.
- **Backend Dockerfile**: Multi-stage build, `npm ci` + dev-prune, `node:26-slim` (pinnable via `NODE_VERSION`), exposes port 3000.
- **Frontend Dockerfile**: Multi-stage build, `node:26-slim`, serves `dist/` via `serve` on port 5173.
- **DB**: MongoDB 8, named volumes (`mongo_data`, `mongo_config`).

## 7. Security Notes

- **JWT fail-fast**: the server refuses to start without a `JWT_SECRET` of 32+ chars (no default-secret fallback).
- **Session lifetime** (24h, `JWT_EXPIRES_IN`; no refresh flow): tokens are stored in the browser's `localStorage`, which any script running in the page can read — the long TTL is the deliberate trade-off, made tolerable by the XSS mitigations above (edge + helmet CSP: `default-src 'self'`, no external origins, no `unsafe-inline`/`unsafe-eval`). Revocation does not wait for expiry: `middleware/auth.js` re-loads the user on **every** request and rejects inactive accounts, so deactivating a user kills its 24h token immediately (the client sees 401 → soft logout on the next call; the client itself never expires tokens locally). Note a password change does NOT invalidate already-issued tokens (the payload only carries `id`/`email`/`role` — `req.user` is built from the DB document, so role changes apply per request). A refresh-token or httpOnly-cookie model (stronger against XSS) would require changing the API client (credentials, CORS) and the auth storage model; deferred until that model is chosen.
- **Rate limiting** on auth endpoints + global API limiter (see 2.6) and `helmet` security headers.
- **Per-request user lookup** (`middleware/auth.js`): every authenticated request does one primary-key `User.findById` (indexed, O(1)) to enforce the `isActive`/role state — that is what makes deactivation and role changes apply on the very next request of a 24h session. At real traffic the lookup is noise next to bcrypt/query cost, so it stays on ALL routes; the documented escape hatch for heavy per-request volume (PLAN.md P3/24) is JWT `isActive`/`role` claims + the DB check on mutating routes only (a deactivated account would then survive until token expiry or first write).
- **In-memory rate-limit store → single replica**: the limiter counters are per API process, so the deployment must stay at one `api` replica — scaling to N replicas multiplies every limit by N. Strict per-IP limits across replicas would need a shared store (e.g. Redis) behind a feature flag; deferred as an optional upgrade (PLAN.md P1/8).
- **Distributed brute-force protection** (per-account lockout): the per-IP limiter on login is bypassed by an IP-rotating botnet, so failed logins are also counted **per account** (`User.loginFails`/`loginFailsAt`, sliding 15-minute window): 5 accumulated failures lock the account for 15 minutes (401 `ACCOUNT_LOCKED`, client-localized). The dummy-hash trick is kept so every attempt — unknown email, wrong password, or locked account — costs the same bcrypt work (no timing/enumeration signal); a successful login clears the counter. The lock only gates login; an existing session of a locked account stays valid until token expiry or deactivation (the per-request `isActive` check is the revocation path).
- **Traefik dashboard disabled** (`api: false`): the Web UI would expose the full service topology (containers, images, routes) and has no built-in auth, so it is off and unrouted.
- **Edge headers** (`traefik/headers.yml`): HSTS (`max-age=31536000; includeSubDomains`) on all HTTPS responses; on the SPA host a CSP of `default-src 'self'; connect-src 'self' https://api.prompthub.test; object-src 'none'; frame-ancestors 'none'` (+ `X-Frame-Options: DENY`). `serve` itself emits no CSP; the API's comes from helmet.
- **Ownership / visibility (shared hub)**: the prompt and category listings are **global** — every authenticated user can read and copy any entry (the intended product model, see §1); `middleware/ownership.js` (`requireOwnership`) runs BEFORE any mutating write on prompts/categories (admins bypass), so only the owner edits/deletes. Export/import is scoped to the caller's own prompts (§2.2a).
- **Safe cascades**: a non-admin owner deleting a category only destroys their own prompts; others' are unlinked.
- **Admin lockout guards**: an admin cannot demote or deactivate themselves.
- **Race-free first admin**: registration claims a unique sparse `adminSlot` — exactly one admin no matter how registrations interleave.
- **Audit trail**: privileged operations are logged to the `Audit` collection (fire-and-forget; never blocks the request) and are readable by admins via `GET /api/audit` (paginated, filterable by `action`/`actorId`; §2.5a).
- **Error handling**: raw error messages are logged server-side and only returned outside production; validation/duplicate-key errors map to friendly 400/409 responses.
- **Input validation**: all writable fields are length-capped (see §3); `categoryId` must reference an existing category.
- **Import validation**: import payloads are re-validated field-by-field on the server (title/content/tags caps, entry count cap, date sanity) regardless of client pre-validation; matching is always scoped to the importing user (§2.2a).
- **HTTP**: JSON bodies only (no urlencoded parser), CORS with an explicit origin list and no credentials. The default JSON body limit is 100 KB; the import route gets a dedicated parser with a larger limit (default 20 MB, env `IMPORT_BODY_LIMIT`) because it carries whole export files, while every other endpoint keeps the small limit.

## 8. Operational Scripts

```bash
make seed-admin SEED_EMAIL=x@y.com SEED_PASSWORD=secret [SEED_NAME=Name]  # idempotent admin bootstrap
make seed-data SEED_USER_EMAIL=x@y.com   # idempotent demo content (marked [demo])
cd server && node src/scripts/migrateAddName.js          # one-off migration (name field backfill)
cd server && node src/scripts/migrateAddClientId.js      # one-off migration (clientId UUID backfill)
```
