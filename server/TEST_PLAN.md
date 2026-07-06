# Plan de Tests del Servidor — PromptHub

**Objetivo**: Cubrir los ~20 endpoints del servidor con tests de integración e integración API usando **Vitest + supertest + mongodb-memory-server**.

**Stack propuesto**: `vitest` (ya usado en cliente), `supertest`, `mongodb-memory-server`.

---

## FASE 0 — Infraestructura de Tests (Prerrequisito)

**Objetivo**: Configurar el entorno de testing del servidor.

### Archivos a crear/modificar:

| Archivo | Descripción |
|---------|-------------|
| `server/package.json` | Añadir scripts `"test": "vitest run"` y devDeps: `vitest`, `supertest`, `mongodb-memory-server` |
| `server/vitest.config.js` | Config de Vitest para ESM (mismo formato que el resto del proyecto) |
| `server/test/utils.js` | Utilidades reutilizables: `getApp()`, `connectDB()`, `disconnectDB()`, `seedTestUser()` |
| `server/test/.env.test` | Variables de entorno para tests: `JWT_SECRET=test-secret`, `MONGO_URI` (dinámica), `PORT=3001` |

### Patrrones clave de `test/utils.js`:

```js
// getApp() → require('../server') (exporta app express sin bind de puerto)
// connectDB() → mongodb-memory-server + mongoose.connect()
// disconnectDB() → mongoose.disconnect() + matar proceso memory-mongo
// seedTestUser() → POST /api/auth/register con datos de test, devuelve token + user
// request(app) → supertest app
```

### Decisiones:
- **mongodb-memory-server** en vez de MongoDB real: no requiere Docker para tests, más rápido.
- **supertest** sobre la app exportada (no sobre un servidor escuchando): más limpio, sin race conditions.
- **vitest** en vez de Jest: consistente con el cliente, ESM nativo.

---

## FASE 1 — Auth y Salud (Prioridad ALTA)

**Motivo**: Auth es la base de todo el sistema. Sin tests aquí, nada más se puede testear correctamente (todos los otros endpoints requieren token).

### Endpoints a cubrir: 4 tests

| # | Endpoint | Tipo de test | Qué valida |
|---|----------|-------------|-------------|
| 1.1 | POST `/api/auth/register` | **Happy path** | Crea primer usuario como admin, devuelve token + user sin password. Verifica `role: 'admin'`. |
| 1.2 | POST `/api/auth/register` | **Segundo usuario** | Crea segundo usuario con `role: 'user'`. Verifica que `User.countDocuments() > 0` cambia el rol. |
| 1.3 | POST `/api/auth/register` | **Errores** | Campos faltantes (name/email/password → 400), email duplicado (→ 409). |
| 1.4 | POST `/api/auth/login` | **Happy path** | Login con credenciales válidas → token + user. |
| 1.5 | POST `/api/auth/login` | **Errores** | Email incorrecto (→ 401), password incorrecto (→ 401), email inactivo (→ 403). |
| 1.6 | GET `/api/auth/me` | **Happy path** | Usuario autenticado recibe su info. |
| 1.7 | GET `/api/auth/me` | **Sin auth** | Sin token → 401. |
| 1.8 | GET `/api/health` | **Health check** | Responde 200 con status OK. |

### Archivos:
- `server/test/auth.test.js` — Tests 1.1–1.7 (grupo describe "Auth")
- `server/test/health.test.js` — Test 1.8

### Dependencias: Fase 0 (infraestructura)

---

## FASE 2 — Gestión de Usuarios (Prioridad ALTA)

**Motivo**: Admin-only endpoints. Necesitan tests porque afectan la seguridad del sistema (cambio de roles, desactivación).

### Endpoints a cubrir: 8 tests

| # | Endpoint | Tipo de test | Qué valida |
|---|----------|-------------|-------------|
| 2.1 | GET `/api/users` | **Admin** | Admin ve todos los usuarios (sin password). |
| 2.2 | GET `/api/users` | **No-admin** | User normal recibe 403. |
| 2.3 | GET `/api/users/:id` | **Admin** | Admin ve un usuario específico. |
| 2.4 | GET `/api/users/:id` | **No-admin** | 403 para user normal. |
| 2.5 | PUT `/api/users/:id` | **Admin** | Admin cambia role de user → admin (y viceversa). Verifica que el cambio persiste. |
| 2.6 | DELETE `/api/users/:id` | **Soft delete** | Admin desactiva usuario → `isActive: false`. El usuario no puede loguearse después. |
| 2.7 | DELETE `/api/users/:id` | **No-admin** | 403 para user normal. |
| 2.8 | GET/PUT/DELETE `/api/users/:id` | **Usuario desactivado** | Intentar operar con un usuario soft-deleted → 401. |

### Archivos:
- `server/test/users.test.js`

### Dependencias: Fase 1 (necesita usuarios creados para testear)

---

## FASE 3 — Prompts (Prioridad MEDIA-ALTA)

**Motivo**: Core feature de la app. CRUD completo + ownership checks.

### Endpoints a cubrir: 12 tests

| # | Endpoint | Tipo de test | Qué valida |
|---|----------|-------------|-------------|
| 3.1 | GET `/api/prompts` | **Listado** | Retorna prompts con `categoryId populated`. Orden descendente por fecha. |
| 3.2 | GET `/api/prompts/:id` | **Detalle** | Prompt con categoryId populated o 404. |
| 3.3 | POST `/api/prompts` | **Crear** | Crea prompt con ownerId, tags opcionales. |
| 3.4 | POST `/api/prompts` | **Validación** | Title/content faltantes → 400. |
| 3.5 | PUT `/api/prompts/:id` | **Actualizar** | Owner actualiza su prompt. Verifica título y contenido actualizados. |
| 3.6 | PUT `/api/prompts/:id` | **Ownership** | Otro usuario intenta actualizar → 403. |
| 3.7 | DELETE `/api/prompts/:id` | **Borrar (owner)** | Owner borra su prompt. |
| 3.8 | DELETE `/api/prompts/:id` | **Borrar (no-owner)** | Otro usuario → 403. |
| 3.9 | GET `/api/prompts/:id` | **No-auth** | Sin token → 401. |
| 3.10 | GET `/api/prompts/:id` | **No existe** | ObjectId inválido → 404 (errorHandler). |
| 3.11 | POST `/api/prompts` | **Con categoryId** | Prompt asociado a categoría existente. |
| 3.12 | GET `/api/prompts` | **Filtrado por categoría** | (si hay filtro) O simplemente verificar populate funciona. |

### Archivos:
- `server/test/prompts.test.js`

### Dependencias: Fase 1 (necesita usuarios y categorías creadas)

---

## FASE 4 — Categorías (Prioridad MEDIA)

**Motivo**: CRUD + cascade delete (borrar categoría borra sus prompts). Este es el endpoint con mayor riesgo de side-effect.

### Endpoints a cubrir: 10 tests

| # | Endpoint | Tipo de test | Qué valida |
|---|----------|-------------|-------------|
| 4.1 | GET `/api/categories` | **Listado** | Retorna todas las categorías ordenadas por createdAt desc. |
| 4.2 | GET `/api/categories/:id` | **Detalle** | Categoría por ID o 404. |
| 4.3 | POST `/api/categories` | **Crear** | Crea categoría con ownerId. |
| 4.4 | POST `/api/categories` | **Validación** | Name faltante → 400. Nombre duplicado (case-insensitive) → 409/400. |
| 4.5 | PUT `/api/categories/:id` | **Actualizar (owner)** | Owner actualiza nombre. |
| 4.6 | PUT `/api/categories/:id` | **Ownership** | Otro usuario → 403. |
| 4.7 | DELETE `/api/categories/:id` | **Borrar (owner)** | Owner borra categoría. |
| 4.8 | DELETE `/api/categories/:id` | **Cascade delete** | **CRÍTICO**: Borra categoría con prompts asociados → todos los prompts se borran (`Prompt.deleteMany`). |
| 4.9 | DELETE `/api/categories/:id` | **No-owner** | Otro usuario → 403. |
| 4.10 | GET `/api/categories/:id` | **No-auth** | Sin token → 401. |

### Archivos:
- `server/test/categories.test.js`

### Dependencias: Fase 3 (necesita prompts creados para testear cascade)

---

## FASE 5 — Site Config (Prioridad BAJA)

**Motivo**: Admin-only, endpoints limitados. Menos riesgo pero necesario para cobertura completa.

### Endpoints a cubrir: 5 tests

| # | Endpoint | Tipo de test | Qué valida |
|---|----------|-------------|-------------|
| 5.1 | GET `/api/site-config/public` | **Público** | Retorna `registrationEnabled` sin auth. |
| 5.2 | GET `/api/site-config` | **Admin** | Admin obtiene config (con upsert-on-first-access). |
| 5.3 | GET `/api/site-config` | **No-admin** | 403 para user normal. |
| 5.4 | PUT `/api/site-config` | **Admin** | Admin cambia `registrationEnabled`. Verifica que el cambio persiste. |
| 5.5 | PUT `/api/site-config` | **No-admin** | 403 para user normal. |

### Archivos:
- `server/test/siteConfig.test.js`

### Dependencias: Fase 0 (puede correr en paralelo con otras fases)

---

## FASE 6 — Middleware y Casos Edge (Prioridad BAJA)

**Motivo**: Validar que el middleware de auth y error handler funcionan correctamente de forma aislada.

### Tests a cubrir: 6 tests

| # | Test | Qué valida |
|---|------|-------------|
| 6.1 | `authenticate` — token inválido | Token malformed → 401. |
| 6.2 | `authenticate` — token expirado | Token expired → 401. |
| 6.3 | `authenticate` — usuario inactivo | Usuario con `isActive: false` → 401. |
| 6.4 | `authorize('admin')` — role insuficiente | User normal en ruta admin → 403. |
| 6.5 | `errorHandler` — ValidationError Mongoose | Schema validation fail → 400 con mensajes. |
| 6.6 | `errorHandler` — Duplicate key (11000) | Unique constraint violation → 400 con nombre de campo. |

### Archivos:
- `server/test/middleware.test.js`

### Dependencias: Fase 0 (puede correr en paralelo con otras fases)

---

## Resumen de Priorización

| Fase | Endpoints | Tests | Archivos | Depende de |
|------|-----------|-------|----------|------------|
| **0** | — | 0 | `vitest.config.js`, `test/utils.js`, `.env.test` | — |
| **1** | 4 (auth + health) | ~8 | `test/auth.test.js`, `test/health.test.js` | 0 |
| **2** | 4 (users) | ~8 | `test/users.test.js` | 1 |
| **3** | 5 (prompts) | ~12 | `test/prompts.test.js` | 1, 4 |
| **4** | 5 (categories) | ~10 | `test/categories.test.js` | 3 |
| **5** | 3 (site-config) | ~5 | `test/siteConfig.test.js` | 0 |
| **6** | — (middleware) | ~6 | `test/middleware.test.js` | 0 |

**Total estimado**: ~49 tests distribuidos en 7 archivos.

### Orden de ejecución recomendado:
1. **Fase 0** (infraestructura) — bloquea todo lo demás
2. **Fases 1 + 5 + 6** (en paralelo) — Auth, SiteConfig, Middleware son independientes
3. **Fase 2** (Users) — necesita usuarios de Fase 1
4. **Fase 3** (Prompts) — necesita categorías creadas
5. **Fase 4** (Categories) — necesita prompts para testear cascade

### Casos críticos a cubrir (no negociables):
- **Cascade delete** (4.8): Borrar categoría borra sus prompts — bug potencial si no se documenta.
- **First-user-admin** (1.1): La lógica de "primer usuario es admin" depende del estado de la DB.
- **Soft delete** (2.6): Un usuario desactivado no puede loguearse — seguridad crítica.
- **Ownership checks** (3.6, 3.8, 4.6, 4.9): Non-admins no pueden modificar recursos ajenos.
- **Registration gate** (5.4): Cuando `registrationEnabled: false`, el register debe rechazar nuevos usuarios.
