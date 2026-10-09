# Technical Specification: PromptHub

## 1. Overview

Full-stack AI prompt management system. Vue 3 frontend + Express/Mongoose backend with JWT auth, deployed via Docker Compose behind Traefik with TLS.

**Tech Stack:** Vue 3 (Composition API), Pinia, Vue Router 5, Tailwind CSS 4, Vite | Express 5, Mongoose 9, JWT (hs256) | MongoDB 8, Docker Compose, Traefik 3

---

## 2. API Specification

All protected routes require a Bearer Token (`Authorization` header). Admin routes additionally require `role === 'admin'`.

### 2.1 Auth API
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Register (first user → admin; rate limited) | `{ name, email, password }` | `{ token, user }` | 201, 400, 403, 409, 429, 500 |
| `/api/auth/login` | `POST` | Login (checks isActive; rate limited) | `{ email, password }` | `{ token, user }` | 200, 401, 403, 429, 500 |
| `/api/auth/me` | `GET` | Get current user | — | `{ user }` | 200, 401, 500 |

### 2.2 Prompts API (authenticated)
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/prompts` | `GET` | List all prompts (populate categoryId.name) | — | `Array<Prompt>` | 200, 500 |
| `/api/prompts` | `POST` | Create prompt (ownership check) | `{ title, content, categoryId?, tags[] }` | `Prompt` | 201, 400, 500 |
| `/api/prompts/:id` | `GET` | Get single prompt (populate categoryId.name) | — | `Prompt` | 200, 404, 500 |
| `/api/prompts/:id` | `PUT` | Update prompt (ownership check) | `{ title?, content?, categoryId? }` | `Prompt` | 200, 400, 404, 500 |
| `/api/prompts/:id` | `DELETE` | Delete prompt (ownership check) | — | `{ message }` | 200, 404, 500 |

### 2.3 Categories API (authenticated)
| Endpoint | Method | Description | Request Body | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/categories` | `GET` | List all categories (populate ownerId) | — | `Array<Category>` | 200, 500 |
| `/api/categories` | `POST` | Create category (ownership check) | `{ name, description? }` | `Category` | 201, 400, 500 |
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
| `/api/site-config/public` | `GET` | Get registration status (no auth) | — | `{ config }` | 200, 500 |
| `/api/site-config` | `GET` | Get full config (authenticated) | — | `{ config }` | 200, 401, 500 |
| `/api/site-config` | `PUT` | Update config (admin-only) | `{ registrationEnabled }` | `{ config }` | 200, 401, 403, 500 |

---

## 3. Data Models (Mongoose Schemas)

### User
```javascript
{ name: String(required), email: String(unique), password: String(hash), role: String(user/admin, default:'user'), isActive: Boolean(default:true) }
```

### Prompt
```javascript
{ title: String(required), content: String(required), categoryId: ObjectId(ref:'Category', nullable), ownerId: ObjectId(required), tags: [String], createdAt: Date, updatedAt: Date }
```

### Category
```javascript
{ name: String(required, unique), description: String, ownerId: ObjectId(required), createdAt: Date, updatedAt: Date }
```

### SiteConfig (singleton _id='site')
```javascript
{ registrationEnabled: Boolean(default:true) }
```

---

## 4. Frontend Architecture

### Views (8): LoginView, RegisterView, PromptListView, PromptDetailView, CategoryView, SettingsView, ProfileView, ManageUsersView

### Components (9): Navbar, Toast, PromptCard, SearchBar, CreatePromptModal, CreateCategoryModal, DeleteConfirmationModal, CategoryList, UsePromptModal

### Stores (6): useAuthStore (token/user), usePromptStore (CRUD + currentPrompt), useCategoryStore (CRUD + selection), useI18nStore (en/es/eu), useUIStore (toasts + modals), useThemeStore (light/dark/auto)

### Routes (8): `/` → PromptListView, `/login`, `/register`, `/prompt/:id` → PromptDetailView, `/category/:id` → CategoryView, `/settings`, `/profile/:id` → ProfileView, `/admin/users` (admin guard)

### Guards: `beforeEach` redirects unauthenticated to login. `/profile/:id` and `/admin/users` check `role === 'admin'`.

---

## 5. Testing

Both client and server use **Vitest**. Server test suite: 8 files in `server/test/` (auth, categories, health, integration, prompts, siteConfig, smoke, users).

```bash
make test           # Run both suites
cd server && npm test   # Server only (Vitest)
cd client && npm test   # Client only (Vitest + Vue Test Utils)
```

---

## 6. Deployment Architecture

Docker Compose: 4 services (traefik, api, frontend, db). API depends on db `healthy`. Frontend depends on api `healthy`.

- **Traefik**: HTTP 80 → HTTPS redirect, TLS 443 (dynamic certs), routes for api + frontend.
- **Backend Dockerfile**: Multi-stage build, `node:18-slim`, exposes port 3000.
- **Frontend Dockerfile**: Multi-stage build, `node:18-slim`, serves `dist/` on port 5173.
- **DB**: MongoDB 8, named volumes (`mongo_data`, `mongo_config`).
