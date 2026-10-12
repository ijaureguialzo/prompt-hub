# PLAN.md — Mejoras de calidad, seguridad, UX y rendimiento

Plan de trabajo derivado del análisis completo del proyecto (server, client, infra, tests, CI, docs).
Estado inicial verificado: **197 tests server + 353 client en verde, lint sin errores** (Vitest 4, ESLint 10). Baseline actual tras la tarea 2: 197 server + 359 client.

Leyenda de estado: `[ ]` pendiente · `[~]` en curso · `[x]` hecha

**Orden recomendado de ataque:** P0 (tareas 1–4, todas pequeñas) → lote UX 10–13 (un PR grande) → resto según roadmap.

---

## P0 — Pieles que rompen el despliegue

- [x] **1. Corregir `VITE_API_URL` en `.env.example`**
  - **Problema:** `.env.example` traía `VITE_API_URL=https://prompthub.test/api` (host del *frontend*), pero el API vive en `api.prompthub.test`. Como Traefik enruta todo `Host(prompthub.test)` al servicio frontend y `serve -s` devuelve `index.html` con HTTP 200 para `/api/*`, un deploy desde el ejemplo produce **fallo silencioso**: el login "funciona" y la app queda vacía sin ningún error. El `.env` local ya tenía el valor correcto; el ejemplo no.
  - **Hecho (las 3 sub-tareas):**
    1. `.env.example`: `VITE_API_URL=https://api.prompthub.test/api` + documentación de `FQDN_FRONTEND`/`FQDN_API`/`FQDN_TRAEFIK` (ahora también son variables explícitas; compose conserva sus defaults).
    2. `client/src/api/index.js`: `apiRequest()` lanza `errors.invalidResponse` (nuevo key en en/es/eu) cuando `response.ok` pero el body está vacío o no es JSON válido, en vez de resolver con `{}`.
    3. Same-origin: nuevo router en `docker-compose.yml` `Host(FQDN_FRONTEND) && PathPrefix(/api)` → servicio api, con `priority=100` frente a `priority=10` del router frontend. Un build con `VITE_API_URL=/api` (relativo) funciona sin CORS; `CORS_ORIGIN` queda como red de seguridad para el default cross-origin. Actualizado SPEC §6.
  - **Verificado:** 356 tests client en verde (3 nuevos: ok+HTML, ok+vacío, localización es) · lint limpio · `vite build` con el valor del ejemplo hornea `https://api.prompthub.test/api` (0 ocurrencias del valor roto) · stack docker completo levantado: `/api/health` same-origin devuelve el JSON del API (antes: index.html 200), `/` y rutas SPA siguen cayendo en el fallback, registro+login+lista por same-origin OK, host api cross-origin OK, preflight CORS intacto (`access-control-allow-origin: https://prompthub.test`).

---

## P1 — Seguridad

- [x] **2. Cap de tamaño en import (cliente)**
  - **Problema:** `readImportFile()` (`client/src/lib/promptBackup.js`) no limita `file.size`: un ZIP de 100 MB se parsea en memoria del navegador *antes* de que el cap server (`IMPORT_BODY_LIMIT=20mb`) entre en juego.
  - **Hecho:**
    1. `promptBackup.js`: nueva constante `IMPORT_FILE_MAX_SIZE` (25 MB, margen sobre el cap server de 20 MB); `readImportFile()` rechaza `file.size >` ese límite con `ImportFileError('TOO_LARGE', …)` *antes* de parsear.
    2. Nuevo key `errors.importFileTooLarge` (`{maxMb}` interpolado) en `locales/{en,es,eu}.js`; `PromptListView` mapea el código `TOO_LARGE` a ese mensaje (resto de `ImportFileError` sigue con el genérico `common.importFileError`).
    3. Tests: 2 nuevos en `promptBackup.test.ts` (rechaza >25 MB con código `TOO_LARGE`; acepta exactamente 25 MB) y 1 nuevo en `PromptListView.test.ts` (toast por código).
  - **Verificado:** 359 tests client en verde · lint limpio · 197 server en verde.

- [x] **3. Dashboard de Traefik sin auth**
  - **Problema:** `traefik/traefik.yml` + labels de compose lo exponen en `traefik.prompthub.test/dashboard` (TLS pero público): filtra topología de servicios.
  - **Hecho (opción 1 del plan: eliminación total):**
    1. `traefik/traefik.yml`: `api: false` (antes `dashboard: true` + `disableDashboardAd`, key no existente en Traefik 3) + comentario explicando por qué y cómo reactivarlo deliberadamente. El entrypoint interno `:8080` (API/dashboard sin auth) desaparece con ello.
    2. `docker-compose.yml`: quitados los 10 labels de dashboard (router `api@internal` + redirectregex `/*` → `/dashboard/*`) del servicio traefik; sin routers, el contenedor no expone nada (queda `traefik.enable` implícito por `exposedByDefault: false`).
    3. Docs coherentes: `FQDN_TRAEFIK` fuera de `.env.example` (ya no la usa compose); `SPECIFICATION.md` §6 (solo rutas api+frontend, dashboard deshabilitado) + nueva nota en §7; `README.md` (bullet "dashboard deshabilitado"); `Makefile` `_urls` sin la URL de Traefik.
  - **Por qué no `ipallowlist`:** con puertos publicados + red bridge la IP origen que ve Traefik es la gateway de Docker (variable por plataforma, roto con `--net=host`), y el dashboard no tiene auth propio; la eliminación total es más robusta y es la opción preferida del plan.
  - **Verificado (stack levantado, `docker compose up -d traefik`):** `docker compose config -q` OK · `https://traefik.prompthub.test/dashboard` → 404 (antes: UI del dashboard) · `.../api/rawdata` (JSON de toda la topología) → 404 · `:8080` interno → connection refused (entrypoint ausente) · redirect 80→443 intacto (301) · frontend `/` 200 · `api.prompthub.test/api/health` 200 · same-origin `prompthub.test/api/health` 200 (router de P0/1 inafectado).

- [x] **4. Cabezales de seguridad en el borde (HSTS + CSP)**
  - **Problema:** sin **HSTS** en el entrypoint `websecure`; sin **CSP** en el frontend estático (`serve` no lo emite; solo el API tiene helmet).
  - **Hecho:**
    1. `traefik/headers.yml` (nuevo, file provider): middleware `hsts` (`stsSeconds: 31536000` + `stsIncludeSubdomains`) y `frontend-secure` (CSP `default-src 'self'; connect-src 'self' https://api.prompthub.test; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` + `frameDeny` = `X-Frame-Options: DENY`).
    2. `traefik/traefik.yml`: `entryPoints.websecure.http.middlewares: [hsts@file]` — el `@file` es **obligatorio**: una referencia por nombre desnudo desde un entrypoint no resuelve middlewares de provider (Traefik la busca en `@docker` y deshabilita los routers → 404 en todo). HSTS en el entrypoint = todas las respuestas HTTPS (api + frontend).
    3. `docker-compose.yml`: mount de `headers.yml` en `/etc/traefik/dynamic/` + label `frontend-secure@file` solo en el router frontend. El CSP **no** se aplica al API: ya emite el suyo por helmet 8 (con CSP por defecto) y un segundo CSP se *interseccionaría* en el navegador.
    4. Docs: README (bullet), SPEC §6/§7, y nota en `.env.example`: el file provider es texto estático (sin interpolación de env) → si cambia `FQDN_API` hay que actualizar el origin del CSP.
    5. **Seguimiento (producción rota con Traefik externo):** la label `frontend-secure@file` vivía en `docker-compose.yml` y rompía los despliegues con un Traefik standalone (solo provider docker, p. ej. los roles Ansible de home-pi: arrancan solo `frontend` en la red del Traefik compartido; el traefik empaquetado nunca corre). Ahí `frontend-secure@file` no resuelve → Traefik deshabilita el router frontend en silencio → web oscura (sin cert LE para el host frontend; el host del API seguía vivo). Movida la label a `docker-compose.override.yml`: `make start` lo carga automáticamente (bundled: HSTS + CSP intactos) y el rol de home-pi **sustituye** ese fichero por el suyo, de modo que la referencia `@file` no llega a las labels del contenedor. README + SPEC actualizados.
  - **Esquema v3:** Traefik 3 renombró el nodo `responseHeaders:` (v2) a `headers:` y `includeSubDomains` a `stsIncludeSubdomains`; la redacción v2 del borrador original era rechazada por el validador (`field not found, node: responseHeaders`) y rompía **todos** los routers. Ambas formas validadas contra la imagen `traefik:3` (3.7) antes de desplegar.
  - **CSP:** el build de producción no genera inline (`dist/index.html` = `/assets/*.js` + `/assets/*.css` externos, verificado) → `default-src 'self'` basta sin tocar `script-src`/`style-src`; `connect-src` incluye el origin del API (deploy cross-origin por defecto) y `'self'` (build same-origin); `object-src 'none'`, `frame-ancestors 'none'` (+ X-Frame-Options DENY para navegadores antiguos).
  - **Verificado (stack levantado):** `prompthub.test/` → 200 + `Strict-Transport-Security: max-age=31536000; includeSubDomains` + CSP + `X-Frame-Options: DENY` · `api.prompthub.test/api/health` y same-origin `/api/health` → 200 con **solo** el CSP de helmet (sin apilar) y un único header HSTS · dashboard → 404 (P1/3 intacto) · HTTP 80 → 301 · rutas SPA 200. Navegador real (headless Chrome vía agent-browser, cert mkcert con `--ignore-https-errors`, proxy CONNECT local): registro de usuario + creación de prompt + **export → ZIP descargado válido**, 0 violaciones CSP en consola; el download `blob:` funciona sin `navigate-src`.
  - **Archivos:** `traefik/headers.yml` (nuevo), `traefik/traefik.yml`, `docker-compose.yml`, `docker-compose.override.yml` (nuevo), `README.md`, `SPECIFICATION.md`, `.env.example`

- [x] **5. Sesión: 1 h sin refresh**
  - **Problema:** `JWT_EXPIRES_IN=1h` + token en localStorage → corte duro cada hora a mitad de tarea.
  - **Hecho (opción barata del plan, sin cambios de código):**
    1. `docker-compose.yml` + `.env.example`: `JWT_EXPIRES_IN=24h` (el fallback `'1h'` de `authController.generateToken()` se mantiene: solo rige con el env ausente — tests y dev local).
    2. `SPECIFICATION.md` §7: nuevo bullet *Session lifetime* documentando el trade-off — token en `localStorage` (lectible por cualquier script) + TTL largo, mitigado por las CSP de borde/helmet (`default-src 'self'`, sin `unsafe-inline`/`unsafe-eval`); revocación inmediata al desactivar cuenta (el check `isActive` por request); cambio de contraseña **no** revoca tokens ya emitidos; el cliente no expira localmente (el 401 hace soft-logout).
  - **Opción completa (pendiente, deliberada):** refresh token o cookie httpOnly — requeriría cambiar el API client (credentials) y el CORS; no se hace sin decidir el modelo (queda documentado en §7).
  - **Verificado:** `docker compose config -q` OK · API recreada con el nuevo env · login real en el stack: `exp - iat = 24 h` en el JWT emitido · 197 server + 359 client en verde · lint limpio.
  - **Archivos:** `docker-compose.yml`, `.env.example`, `SPECIFICATION.md`

- [x] **6. Audit trail solo escribe, no se lee**
  - **Problema:** no hay endpoint/UI para consultar `Audit`; la auditoría es imposible de verificar sin `mongosh`.
  - **Hecho:**
    1. `GET /api/audit` (solo admin: `authenticate` + `authorize('admin')`): listado *most-recent-first* con la misma envolvente que la lista de prompts (`{ entries, total, page, limit, hasMore }`, `limit` default 50 / máx 500) y filtros `action` (exacto) y `actorId` (ObjectId; malformado → 400 `VALIDATION_ERROR`). Nuevo `controllers/auditController.js` + `routes/auditRoutes.js`, registrado en `server.js`.
    2. SPEC: nueva sección §2.5a (endpoint, parámetros, acciones que se registran, read-only) + bullet §7 actualizado. Los índices compuestos `{actorId,createdAt}`/`{action,createdAt}` existentes sirven a las consultas filtradas.
    3. Tests: 8 nuevos en `audit.test.js` (401, 403 no-admin, envolvente+orden, orden determinista por `createdAt`, filtro `action`, filtro `actorId`, 400 `actorId` malformado, paginación `page`/`limit`/`hasMore`).
  - **Decisiones:** sin índice TTL ni nuevo índice (el plan los marcaba como *a considerar*): la colección es pequeña (una entrada por operación privilegiada) y el scan no filtrado es barato; la política de retención (TTL/purga) queda como decisión pendiente. La UI en `ManageUsersView` se deja como opción diferida (el plan la marcaba opcional).
  - **Verificado:** 205 tests server en verde (197+8) · lint limpio · stack real: `PUT /api/site-config` con transición → `GET /api/audit` devuelve la entrada (action, actor, details.from/to, createdAt) · 401 sin token · 403 no-admin · 400 `actorId` malformado.
  - **Archivos:** `server/src/controllers/auditController.js` (nuevo), `server/src/routes/auditRoutes.js` (nuevo), `server/src/server.js`, `server/test/audit.test.js`, `SPECIFICATION.md`

- [x] **7. Brute-force distribuido**
  - **Problema:** rate-limit per-IP (10/15min en login); una red de IPs lo supera.
  - **Hecho:**
    1. `models/User.js`: campos internos `loginFails` (contador) + `loginFailsAt` (último fallo) + `lockUntil` — añaditivos (defaults cubren docs viejas, sin migración) y extraídos en `toJSON` (nunca salen por la API, como `adminSlot`).
    2. `controllers/authController.js`: ventana deslizante de 15 min — 5 fallos acumulados (el contador se resetea si el último fallo es anterior a la ventana) → `lockUntil = now + 15min` y respuesta 401 `ACCOUNT_LOCKED`; el 5.º fallo ya responde `ACCOUNT_LOCKED`, y mientras el lock esté activo **tampoco pasa la contraseña correcta**. Éxito en login → contador/lock a cero. El dummy-hash se mantiene: el lock se consulta **después** del bcrypt para que un cuenta bloqueada cueste lo mismo que cualquier intento (sin enumeración por timing), y el limiter per-IP queda como capa extra.
    3. Cliente: `ACCOUNT_LOCKED` → `errors.accountLocked` en `api/index.js` + key en `locales/{en,es,eu}.js` (el LoginView ya pinta `err.message` en línea).
    4. Tests: 6 server en `auth.test.js` (5 fallos → lock 15 min + verificación del `lockUntil`, desbloqueo tras expiración, reset de ventana, éxito limpia el contador, email desconocido nunca crea/blokea, estado interno no se expone) + 2 client (mapeo del código en `api/index.test.ts` y mensaje en `LoginView.test.ts`).
    5. SPEC: `ACCOUNT_LOCKED` en la lista de códigos §2, línea de login §2.1, campos en el modelo §3 y bullet §7 (el lock solo cierra el login; una sesión existente sigue viva hasta expiración/desactivación).
  - **Verificado:** 211 tests server en verde (205+6) · 361 client (359+2) · lint limpio · stack real: registro → fallos 1–4 `INVALID_CREDENTIALS` → fallo 5 `ACCOUNT_LOCKED` → intento 6 y contraseña correcta `ACCOUNT_LOCKED`.
  - **Archivos:** `server/src/models/User.js`, `server/src/controllers/authController.js`, `server/test/auth.test.js`, `client/src/api/index.js`, `client/src/locales/{en,es,eu}.js`, `client/tests/api/index.test.ts`, `client/tests/views/LoginView.test.ts`, `SPECIFICATION.md`

- [x] **8. Rate limiter in-memory (documentar/Redis)**
  - **Problema:** `express-rate-limit` con store en memoria: si el API escala a N réplicas, los límites se multiplican por N.
  - **Hecho (alcance mínimo del plan — documentación de la premisa):**
    1. `server/src/middleware/rateLimit.js`: comentario *single-replica* en la cabecera (las cuentas viven en el proceso; N réplicas multiplican cada límite por N; la subida a store compartido es un no-objetivo deliberado).
    2. `SPECIFICATION.md` §2.6 (párrafo de rate limiting: premisa de réplica única + upgrade path) y nuevo bullet §7.
    3. `README.md`: el bullet de rate limiting ahora avisa de la premisa.
  - **Opcional (diferido, como marca el plan):** store Redis con feature flag por env (`RATE_LIMIT_STORE=memory|redis`) — no se implementa sin una necesidad real de escalar.
  - **Verificado:** 211 tests server en verde (sin cambios de comportamiento) · lint limpio.
  - **Archivos:** `server/src/middleware/rateLimit.js`, `SPECIFICATION.md`, `README.md`

- [x] **9. Confirmar modelo de privacidad y documentarlo**
  - **Problema:** `GET /api/prompts`, `GET /api/prompts/:id` y `GET /api/categories` son **globales** (todos los autenticados ven prompts/categorías de todos). El SPEC lo llama "shared prompt list" a propósito, pero el producto se presenta como gestor *personal* (el export es "tus prompts"): señal mixta.
  - **Decisión: *hub compartido*** (evidencia: el nombre *PromptHub*, el SPEC ya documentaba la lista "shared", y la UX de búsqueda/filtros/sidebar solo tiene sentido sobre una lista global; el scoping a *vault privado* rompería la UX de descubrimiento). Rama de documentación del plan, sin cambios de comportamiento:
    1. `SPECIFICATION.md` §1: nuevo párrafo *Visibility model (shared hub)* — todos los autenticados ven/leen/copian cualquier prompt o categoría; el ownership solo cierra las **escrituras** (CRUD propio + cuotas por usuario); export/import queda acotado al dueño (§2.2a).
    2. `SPECIFICATION.md` §2.2/§2.3: las líneas de listado dicen explícitamente **all** (shared hub) y el bullet §7 *Ownership* ahora enuncia el modelo de visibilidad junto a la escritura.
    3. `README.md`: intro "prompt **hub**" + bullets alineados ("the list is shared, writes are owner-only"; el export pasa de "all prompts" a "**your** prompts").
    4. UI: el copy ya era coherente (`promptList.heading` neutro; `exportEmpty` "You have no prompts to export yet" es exacto para un hub) → sin cambios.
  - **Verificado:** 211 server + 361 client en verde (sin cambios de código) · lint limpio.
  - **Archivos:** `SPECIFICATION.md`, `README.md`

---

## P2 — UX / Accesibilidad

- [x] **10. Modales: Escape, focus trap, ARIA**
  - **Problema:** los 5 modales (CreatePrompt, CreateCategory, Import, UsePrompt, DeleteConfirmation) no cierran con Escape, no atrapan el foco, no lo restituyen al cerrar, y faltan `role="dialog"` + `aria-modal="true"`.
  - **Hacer:** nuevo componente base `client/src/components/Modal.vue` (overlay + panel, `@keydown.esc` → close, focus trap, `role="dialog" aria-modal`, restituir foco al elemento que abrió) y refactorizar los 5 sobre él.
  - **Archivos:** `client/src/components/Modal.vue` (nuevo) + los 5 modales + tests de cada modal
  - **Hecho:** base `Modal.vue` con overlay + panel (`role="dialog"`, `aria-modal`, `aria-label`, `tabindex="-1"`), listener de teclado en **capture** a nivel `document` (Escape → `close`; Tab/Shift+Tab ciclan los focusables del panel; si el foco escapa fuera, vuelve dentro), focus inicial en el primer focusable y restitución al elemento que abrió en `onBeforeUnmount`. Props: `panelClass`, `padded` (el modal de import tiene layout seccionado y opta fuera), `label`. Desviación del plan: el trap es **hecho a mano** (~40 líneas) — `useTrapFocus` fue eliminada en `@vueuse/core` v14 (la instalada) y no añade dependencias. Los 5 modales usan `<Modal>` y reemiten `close` (el × y el Escape viven en la base). Tests: `Modal.test.ts` (9 casos: ARIA, trap, Escape, restitución, padded) + bloque de accesibilidad en los 5 tests de modal. Suite: 385 client en verde.

- [x] **11. Race en la búsqueda (AbortController)**
  - **Problema:** `usePromptStore.fetchPrompts` no cancela peticiones: con el debounce de 300 ms, una respuesta vieja que llega tarde pisa la lista nueva.
  - **Hacer:** soporte de `signal: AbortController` en `apiRequest()` (`client/src/api/index.js`) + contador de secuencia o `AbortController` por store en `fetchPrompts`/`loadMore` (`usePromptStore`); ignorrar `AbortError` silenciosamente.
  - **Archivos:** `client/src/api/index.js`, `client/src/stores/usePromptStore.js`, `client/tests/api/index.test.ts`
  - **Hecho:** `apiRequest` lee el body dentro del `try` y normaliza cualquier abort (`AbortError`/`CanceledError`) en un error con `name === 'AbortError'` (+ `cause`), diferenciándolo del error de red; `promptsApi.getAll` acepta `options` (pasa el `signal` al fetch). En `usePromptStore`, `fetchPrompts` aborta el request anterior (fuera del estado reactivo: `AbortController` + contador de secuencia a nivel de módulo) y solo la secuencia más reciente escribe estado/banderas de carga; las respuestas tardías o aborts de requests suplantados se ignoran en silencio. `loadMore` hereda el comportamiento (usa `fetchPrompts`). Tests: 3 en el cliente API (normalización en fetch, normalización en lectura de body, passthrough de `signal`) + 2 de race en el store (respuesta tardía descartada; abort silencioso sin tocar el estado del request nuevo). Suite 390 client en verde; verificado en stack real (la búsqueda con `signal` no rompe nada).

- [x] **12. Toasts: cola con timer por mensaje + aria-live**
  - **Problema:** `useUIStore.setError/setSuccess` lanzan `setTimeout` sin resetear: un segundo toast puede desaparecer cuando caduca el *primero*.
  - **Hacer:** estado `toasts: []` (id, type, message) con timer por entrada en `useUIStore`; `Toast.vue` renderiza la cola y auto-descarta; añadir `role="status"`/`aria-live="polite"`.
  - **Archivos:** `client/src/stores/useUIStore.js`, `client/src/components/Toast.vue`, `client/tests/{stores/useUIStore,components/Toast}.test.ts`
  - **Hecho:** cola `toasts` en el store (id monotónico a nivel de módulo); cada entrada corre **su propio timer** (error 5 s / success 3 s) y caduca por id (no-op seguro si ya fue eliminada); `setError`/`setSuccess` solo añaden y `clearError` descarta los de error. `Toast.vue` renderiza la cola en un contenedor `role="status"` + `aria-live="polite"` que **permanece montado** (incluso vacío, para que el lector de pantalla anuncie los nuevos; el anterior `v-if` no se anunciaba). Tests: 17 en los 2 ficheros (incluida la regresión de timers independientes) + mock compartido actualizado. Suite 390 client en verde, lint limpio.

- [x] **13. PromptCard: interactivos anidados en `<a>`**
  - **Problema:** badges de categoría/tags son `<span @click>` dentro de `router-link` → HTML inválido (interactivos dentro de link) y confuso para lectores de pantalla.
  - **Hacer:** reestructurar: título/contenido como el `router-link` (o `div` con navegación al hacer clic en el cuerpo) y badges como `<button>` reales fuera del link (o el link solo envuelve título+excerpt).
  - **Archivos:** `client/src/components/PromptCard.vue`, `client/tests/components/PromptCard.test.ts`
  - **Hecho:** el `router-link` ahora envuelve **solo** título+excerpt; el card (fondo/borde/hover) es un `div` que también contiene los badges como `<button type="button">` reales **fuera** del ancla, emitiendo los mismos `filterByCategory`/`filterByTag` (sin `.stop` — ya no hacen falta). Tests actualizados (span→button) + nueva aserción de que el link no contiene interactivos. Suite 391 client en verde, lint limpio.

- [x] **14. Nombres accesibles (aria)**
  - **Hacer:** `SearchBar.vue` → `aria-label` en el input (el placeholder no cuenta). Botones de tema (`Navbar.vue`) → `aria-label` + `aria-pressed` en el modo activo; botones de idioma → `aria-pressed`.
  - **Archivos:** `client/src/components/SearchBar.vue`, `client/src/components/Navbar.vue`
  - **Hecho:** el input de búsqueda lleva `aria-label` (el texto del placeholder); los 3 botones de tema llevan `aria-label` (los glifos unicode son opacos para lectores de pantalla) + `aria-pressed` en el modo activo; los botones de idioma llevan `aria-pressed`. Tests: aserciones de atributos en `SearchBar.test.ts` y `Navbar.test.ts` (cuidado con el orden de botones: el “logout” del dropdown v-show está en el DOM). Suite 393 client en verde, lint limpio.

- [x] **15. Import: avisar categoría no resuelta**
  - **Problema:** si la categoría del archivo no existe en la cuenta del importador, el prompt entra como *sin clasificar* en silencio.
  - **Hacer:** en el dry-run el server ya devuelve el resultado; añadir al payload de clasificación un flag `categoryResolved` (o derivar en cliente si `categoryName` no coincide con ninguna de las propias) y mostrar hint por fila en `ImportPromptsModal` ("categoría no encontrada → sin clasificar") + key en locales.
  - **Archivos:** `server/src/controllers/promptController.js` (`classifyEntries`), `client/src/lib/promptBackup.js`, `client/src/stores/usePromptStore.js`, `client/src/components/ImportPromptsModal.vue`, locales
  - **Hecho:** el dry-run calcula `categoryResolved` por entrada reutilizando `resolveCategoryId` (la misma resolución que el apply: nombre e id contra las categorías **del importador**); una entrada sin info de categoría cuenta como resuelta (sin aviso). El store la incorpora a las filas (`null` = servidor antiguo → sin hint) y el modal muestra un hint ámbar con el nombre de la categoría cuando es `false` + `categoryName`. Keys `importModal.categoryUnresolved` en en/es/eu. Tests: 1 server (las 3 combinaciones) + 1 store (merge del flag) + 2 modal (hint presente/ausente). 212 server + 396 client en verde, lint limpio.

- [x] **16. Dark mode: clase `dark` en `<html>`**
  - **Problema:** `index.html` pinta `body class="bg-gray-100"` pero la clase `dark` vive en la raíz del App: en modo oscuro el rebote/overscroll muestra fondo claro.
  - **Hacer:** `useThemeStore` aplica la clase a `document.documentElement` (y `index.html` usa `bg-gray-100 dark:bg-gray-950` en el body); quitar la clase del div raíz de `App.vue` (o dejarla, es redundante pero inocua).
  - **Archivos:** `client/src/stores/useThemeStore.js`, `client/index.html`, `client/src/App.vue`, `client/tests/stores/useThemeStore.test.ts`
  - **Hecho:** nueva action `_applyDomClass()` (toggle de la clase `dark` en `document.documentElement` según `isDark`) llamada desde `init()` (en `main.js`, antes del mount), `setMode()` y el listener de preferencia del sistema (modo auto). `index.html`: `bg-gray-100 dark:bg-gray-950` en el body; `App.vue`: binding `:class` eliminado (la variante `dark` es class-based y cubre el body desde el html). 3 tests nuevos; suite 399 client en verde, lint limpio.

- [x] **17. Favicon + metas**
  - **Problema:** `index.html` referencia `/vite.svg` pero no existe `client/public/` → 404.
  - **Hacer:** crear `client/public/` con icono real (p. ej. `favicon.svg`), referenciarlo, añadir `meta name="description"` y `meta name="theme-color"`.
  - **Archivos:** `client/index.html`, `client/public/`
  - **Hecho:** `client/public/favicon.svg` (icono propio: burbuja índigo con `>` + línea) referenciado en `index.html` (el `/vite.svg` fantasma desaparece); `meta description` + dos `theme-color` (light/dark vía `media`). Vite copia `public/` → `dist/`, así que el Docker también lo sirve. Verificado: `vite build` local genera `dist/favicon.svg` referenciado. Sin cambios de comportamiento.

- [x] **18. Visibilidad de cuotas**
  - **Problema:** no hay indicador de uso de cuota ("187/200"); el límite solo aparece como error `LIMIT_REACHED`.
  - **Hacer:** incluir `{ promptQuota: { used, limit }, categoryQuota: { used, limit } }` en la respuesta de `GET /api/categories` (ya dispara 4 queries; `countDocuments` por `ownerId` es indexado) y mostrarlo discretamente en la UI (p. ej. sidebar o Settings).
  - **Archivos:** `server/src/controllers/categoryController.js`, `client/src/stores/useCategoryStore.js`, `client/src/components/CategoryList.vue` (o `SettingsView`), locales, tests
  - **Hecho:** `GET /api/categories` añade `promptQuota`/`categoryQuota` (2 `countDocuments` por `ownerId` — indexado — batcheados con las 4 queries existentes); el store los guarda y `CategoryList` pinta un pie discreto bajo la lista ("187/200 prompts · 3/50 categorías") con keys en en/es/eu. Tests: 2 server (las cuotas son **por dueño**, no el total del hub) + 1 store + 2 CategoryList. 212 server + 401 client en verde, lint limpio.

- [x] **19. Rol stale tras cambios de admin**
  - **Problema:** `authStore.init()` no llama a `fetchCurrentUser()`: un usuario degradado/desactivado sigue viendo el menú Admin hasta el primer 403.
  - **Hacer:** en `main.js`, tras `init()`, llamar `authStore.fetchCurrentUser()` (best-effort, sin bloquear el mount) y actualizar el guard si cambia el rol.
  - **Archivos:** `client/src/main.js`, `client/src/stores/useAuthStore.js`, tests
  - **Hecho:** la llamada vive en `onMounted` de `App.vue` (donde ya se hace el `init()`): `if (authStore.isAuthenticated) authStore.fetchCurrentUser()` sin `await` (no bloquea el mount); el store ya trata los fallos (401 → soft-logout vía handler) y el guard/router leen el estado reactivo, así que el rol refrescado se aplica a la siguiente navegación. Desviación menor del plan: `main.js` no llamaba a `init()` (lo hace App.vue), así que la llamada nueva va junto a él. New `tests/App.test.ts` (2 casos: con sesión → se refresca; sin sesión → se omite). 403 client en verde, lint limpio.

---

## P3 — Rendimiento

- [x] **20. Búsqueda = full scan (medir primero)**
  - **Problema:** `?q` aplica `$regex` sobre title+content+tags y `countDocuments` sin índice usable; la colección es *compartida* (crece con todos los usuarios).
  - **Hacer:** medir a ~10⁴ prompts. Luego: índice de texto (`$text`) o acotar el regex a título (índice normal) + búsqueda en contenido solo si la página de resultados lo pide. Considerar `explain()` en los tests de performance.
  - **Archivos:** `server/src/models/Prompt.js`, `server/src/controllers/promptController.js`
  - **Hecho (medida → decisión, sin cambio de query):** nuevo `server/test/searchPerformance.test.js`: siembra 10⁴ prompts en la Mongo in-memory y mide (a) `explain()` del filtro (assert que el plan **no usa ningún índice** — un futuro uso de índice hace fallar el test de forma ruidosa) con budget < 1 s y (b) el request real `GET /api/prompts?q=` con budget < 2 s. Medida real en esta máquina: **2 ms de scan / 8 ms end-to-end** → el full scan es despreciable a escala real del hub; el índice `$text` cambiaría la semántica de substring (no compensa) y un regex anclado a título rompería la búsqueda por substring. Documentado en SPEC §2.6 (párrafo *Search cost*) y en la cabecera de `buildListFilter` con el trigger de re-evaluación (~10⁶ docs o budget roto). Suite 214 server en verde.

- [x] **21. Cache de estáticos en el contenedor frontend**
  - **Problema:** `serve -s` no emite `Cache-Control` largo para assets con hash → revalidación en cada visita.
  - **Hacer:** `client/serve.json` (o cabeceras vía traefik `responseHeaders`) con `Cache-Control: public, max-age=31536000, immutable` para `/assets/*` y `no-cache` para `index.html`. Alternativa: imagen nginx alpine (aligera el contenedor vs node 26).
  - **Archivos:** `client/Dockerfile`, `client/serve.json` (nuevo), `docker-compose.yml`
  - **Hecho (rama nginx del plan):** `serve` v14 (la que instala el Dockerfile) **eliminó** la config `headers` de `serve.json` (verificado en el binario: 0 ocurrencias), así que el stage runtime pasa de `node:26-slim`+serve a `nginx:1.27-alpine` (más ligera): `client/nginx.conf` (nuevo) con `location /assets/` y `/favicon.svg` → `public, max-age=31536000, immutable`; `location /` (index + fallback SPA) → `no-cache`; escucha en 5173 (puerto sin privilegios, workers como usuario `nginx`). Healthcheck → busybox `wget` contra `127.0.0.1` (alpine resuelve `localhost` a `::1` primero, que nginx no escucha). Verificado en stack real: index `no-cache`, asset `immutable`, favicon `immutable`, ruta SPA `no-cache`, HSTS/CSP de borde intactos.

- [x] **22. Lazy-load de JSZip**
  - **Problema:** JSZip carga con el chunk de `usePromptStore` (~104 KB) que se monta siempre en la vista principal.
  - **Hacer:** `await import('jszip')` dentro de `buildExportZip`/`readImportFile` (`client/src/lib/promptBackup.js`) para sacarlo del path inicial; ajustar los tests (el mock debe responder al dynamic import).
  - **Archivos:** `client/src/lib/promptBackup.js`, `client/tests/lib/promptBackup.test.ts`, `client/vite.config.js` (ver chunks con `build.analyze`)
  - **Hecho:** import dinámico `(await import('jszip')).default` en `buildExportZip` y en la rama ZIP de `readImportFile` (el import JSON-puro ni lo carga); import estático eliminado. Desviación menor: tests sin cambios — no mockean `jszip` (usan la librería real para el round-trip) y el dynamic import la resuelve igual en vitest. Verificado con `vite build`: chunk `usePromptStore` 104.4 → **8.9 kB**, nuevo chunk `jszip.min` 96 kB (lazy), chunk `index` inalterado. 403 client en verde, lint limpio.

- [x] **23. Import apply: batch + atomicidad**
  - **Problema:** `importPrompts` aplica entrada a entrada (N round-trips); un crash a mitad de import deja estado parcial (el reintento converge por idempotencia de `clientId`, pero no está documentado).
  - **Hacer:** `bulkWrite` para las creaciones (las updates pueden seguir individuales). Documentar en SPEC §2.2a el comportamiento ante crash parcial. Opcional: replica set Mongo + transacción para atomicidad real.
  - **Archivos:** `server/src/controllers/promptController.js`, `server/test/importExport.test.js`, `SPECIFICATION.md`
  - **Hecho:** el apply ahora **clasifica primero y escribe por lotes**: creaciones en un único `Prompt.insertMany` (round-trip N → 1; `_id` preasignado para mapear el resultado) y updates confirmadas individuales (cada una toca un doc distinto); `results` reordenados por índice de fichero (contrato de respuesta invariante). Se usa `insertMany` (equivalente a `bulkWrite` para inserts puros, más idiomático en Mongoose). SPEC §2.2a documenta el **crash a mitad de apply**: no transaccional (réplica única) pero *convergente* — el reintento reclasifica los creados como conflicts (por `clientId`) y las updates son idempotentes; opción diferida: replica set + transacción. Test nuevo: batch mixto con orden por índice. 215 server en verde.

- [x] **24. `authenticate`: DB lookup por request**
  - **Nota:** justificado hoy (check `isActive`). Si crece el tráfico: claim en el token + check en BD solo en rutas de escritura. **Medir antes de tocar.**
  - **Archivos:** `server/src/middleware/auth.js`
  - **Hecho (decisión: mantener + documentar, como pide el propio plan):** el lookup es una primary-key lookup indexada (O(1), < 1 ms) por request — coste ruidoso frente a bcrypt/queries a tráfico real, y es lo que permite la revocación inmediata (desactivación/cambio de rol aplican en la *siguiente* request de la sesión de 24 h). Modelo de coste + escape hatch documentado en la cabecera de `middleware/auth.js` y en nuevo bullet §7 del SPEC (claims `isActive`/`role` en el JWT + check en BD solo en escrituras, con el trade-off explícito). Sin cambio de comportamiento (215 server en verde, lint limpio).

- [x] **25. `GET /api/categories`: 4 queries → 1 agregación**
  - **Hacer:** un solo pipeline `$match`/`$group` para contadores + `find` de categorías. Agrupar con #20 cuando se optimice la lista.
  - **Archivos:** `server/src/controllers/categoryController.js`, `server/test/categories.test.js`
  - **Hecho:** el endpoint hacía 6 queries (find + aggregate + 4 counts — los 2 últimos añadidos en P2/18). Una agregación `\$facet` ahora produce en un round-trip: contadores por categoría (el grupo `null` = sin clasificar; claves `String()` para no volcar con `_id: null`), total del hub (suma de grupos) y el count propio del caller para la cuota; quedan `Category.find` + 1 `countDocuments` indexado → **6 → 3 queries** con formas de respuesta idénticas (los tests existentes pasan sin cambios, 26 en categories). Con #20 no hay más que agrupar (la búsqueda ya se midió y se acepta).

---

## P4 — Calidad de código / tooling

- [x] **26. CI: build + format check**
  - **Problema:** `ci.yml` hace lint+test pero **no `vite build`**: un break de build pasa desapercibido.
  - **Hacer:** en el job `client` añadir `npm run build`; añadir `npm run format -- --check` (client) y `npm run check` (server, ya existe) al CI.
  - **Archivos:** `.github/workflows/ci.yml`
  - **Hecho:** job client: `npm run build` (el bundle de producción pasa la puerta) + `npm run format:check` (nuevo script `prettier --check .`; la forma `format -- --check` del plan termina en modo `--write` en Prettier); job server: `npm run check` (eslint + prettier check, ya existía). Prettier aplicado a 4 files del server y 8 del client que no cumplían, para que la puerta nazca verde. Verificado local (build + check + suites intactas).

- [x] **27. Warnings de tooling (Vitest 4)**
  - **Problema:** server: `test.poolOptions` fue *removida* en Vitest 4 (warning en cada run) → mover `minForks`/`maxForks` a nivel top-level. Client: `__dirname` en `vitest.config.ts` → `import.meta.dirname`.
  - **Archivos:** `server/vitest.config.js`, `client/vitest.config.ts`
  - **Hecho:** server: `poolOptions.forks.{minForks,maxForks}` → `test.minForks`/`test.maxForks` top-level (misma semántica: el pool por defecto es `forks`); client: alias `@` → `${import.meta.dirname}/src`. Verificado: ambas suites corren sin warnings (215 server + 403 client en verde).

- [x] **28. Alinear Node CI (22) vs Docker (26)**
  - **Hacer:** `node-version: 26` en `ci.yml` (o bajar `NODE_VERSION` de los Dockerfiles; preferible subir CI).
  - **Archivos:** `.github/workflows/ci.yml`
  - **Hecho:** `node-version: 26` en los dos jobs (rama preferida del plan: subir CI a la versión de las imágenes `node:26-slim`, en vez de bajar los Dockerfiles) — lo que se verifica en CI es lo que corre en producción.

- [x] **29. Limpieza y docs**
  - **Hacer:**
    - Quitar `.commit-msg.txt` del repo (borrador de commit *tracked* en la raíz).
    - `useAuthStore.updateUser(_updatedUser)`: parámetro muerto → `updateUser()` sin args (llamar a `fetchCurrentUser`).
    - `CLAUDE.md`/`AGENTS.md` desactualizado: "16 Vitest tests" → 197; "~40 keys each" → 189; refrescar el árbol de archivos (faltan `utils/`, `Audit.js`, `guards.js`).
  - **Archivos:** raíz, `client/src/stores/useAuthStore.js`, `CLAUDE.md`
  - **Hecho:** `git rm .commit-msg.txt`; `updateUser(_updatedUser)` → `updateUser()` (parámetro muerto — los 3 callers ya llamaban sin argumento; test actualizado); CLAUDE.md refrescado (AGENTS.md es un **symlink** a CLAUDE.md, una edición actualiza ambos): 11 componentes (Modal base), 5 models / 6 controllers+routes (audit), rateLimit, `utils/`, seedData, ~195 keys/locale, 215 tests server, runtime nginx y HSTS/CSP. Sin cambios de comportamiento (215+403 en verde).

- [x] **30. Drift spec/código**
  - **Problema:** SPEC §2.3 dice que `GET /api/categories/:id` popula `ownerId`; el código no lo hace.
  - **Hacer:** alinear (recomendado: quitar la mención de la spec; el cliente usa el ObjectId crudo sin problema).
  - **Archivos:** `SPECIFICATION.md` o `server/src/controllers/categoryController.js`
  - **Hecho:** la única desviación real: §2.3 decía que el detail endpoint popula `ownerId`; ahora documenta que devuelve el id crudo (por diseño: el list endpoint lleva los datos de display). El resto de claims `populate` del SPEC (`/api/prompts/:id` → `categoryId.name`) coincide con el código; la doc `seed-admin` del README ya usaba las variables correctas. Solo doc, sin código tocado (26 tests de categories en verde).

---

## P5 — Ops / fiabilidad

- [x] **31. Backups de MongoDB**
  - **Problema:** la única durabilidad es el named volume; sin estrategia de backup.
  - **Hacer:** contenedor sidecar con cron que lance `mongodump` (volumin compartido) o job en el host; documentar el restore en README.
  - **Archivos:** `docker-compose.yml`, `traefik/` o `ops/` (nuevo), `README.md`
  - **Hecho:** nuevo servicio `backup` (misma image mongo, sin puertos ni rutas): loop en `ops/mongo-backup.sh` (montado `:ro`, +x en host) que hace `mongodump` a la named volume `backups` cada `BACKUP_INTERVAL_MINUTES` (60) y aplica retención `find -mtime +${BACKUP_RETENTION_DAYS}` (14). El script soporta `--loop`, `--once` (→ nuevo target `make backup`) y `--restore <dump>` (`mongorestore --uri … --db <db> --drop <dump>/<db>` — la forma que exigen las tools 8.x). El README lleva la sección *Backups & restore* (cadencia, dump manual, restore paso a paso, export tar de la volume) y el `.env.example` documenta las dos variables. Verificado en la stack: loop, one-shot y restore round-trip (9 docs, 0 fallos).

- [x] **32. Log rotation de contenedores**
  - **Hacer:** en los 4 servicios: `logging: driver: json-file, options: { max-size: 10m, max-file: "3" }`.
  - **Archivos:** `docker-compose.yml`
  - **Hecho:** `logging: json-file, max-size 10m, max-file 3` (~30 MB/capa) en los **5** servicios (los 4 del plan + `backup` de la tarea 31, añadido entonces sin logging). Aplicado a la stack viva: `HostConfig.LogConfig` confirmado en los containers recreados; health + SPA siguen OK.

- [x] **33. Health check con DB (readiness)**
  - **Hacer:** `/api/health` sigue siendo liveness (Node responde); añadir `db: mongoose.connection.readyState === 1` al payload o un `/api/ready` con `ping()`. Ajustar el healthcheck de compose solo si se quiere readiness (cuidado: no fallar el liveness por la DB).
  - **Archivos:** `server/src/server.js`, `server/test/health.test.js`
  - **Hecho:** decisión: readiness única (no dos endpoints): `/api/health` informa el `readyState` de mongoose (`connected`/`disconnected`/`connecting`/`disconnecting`) y responde 200 solo con DB conectada, 503 `DEGRADED` en otro caso; el healthcheck de compose ahora exige HTTP 200. El matiz del plan (no fallar el liveness por la DB) se asume deliberadamente: sin DB el api no sirve para nada, y `restart: unless-stopped` + la reconexión automática de mongoose hacen que se recupere solo cuando vuelve la DB. SPEC §2.6 actualizado; tests de health + smoke cubren ambas ramas (217 server en verde). Verificado en la stack: parar db → 503 `db:disconnected`, reanudar → 200.

- [x] **34. `docker compose` (v2) en Makefile**
  - **Problema:** el Makefile usa el binario v1 `docker-compose` (deprecado; no existe en instalaciones recientes de Docker).
  - **Hacer:** `docker-compose` → `docker compose` en todos los targets.
  - **Archivos:** `Makefile`
  - **Hecho:** los 7 usos de `docker-compose` → `docker compose` (v2). Verificado con compose v5.5.1: `make help` y el target `backup` funcionan.

- [x] **35. Observabilidad (opcional)**
  - **Hacer:** reporting de errores en cliente (Sentry u otro) y/o uptime externo. El `X-Request-Id` ya está puesto para correlacionar logs.
  - **Archivos:** `client/src/main.js` (bootstrap), docs
  - **Hecho:** decisión documentada (el plan lo permitía): **diferido sin código**. La visibilidad operativa ya la cubren los logs pino estructurados (con `X-Request-Id` para correlación, ahora rotados), la trail de auditoría y los probes readiness; un hook `window.onerror` → `POST /api/telemetry` añadiría superficie de escritura no autenticada + colección + política de retención/PII (stacks y URLs pueden contener datos del usuario) por beneficio marginal a esta escala. Especificado en §2.6 del SPEC con el disparador para revisarlo (o derivar a un collector externo tipo Sentry si aparecen fallos client-side no explicables).

---

## P6 — Correcciones de seguimiento (tras el plan)

- [x] **36. Export ZIP sin compresión**
  - **Problema:** `buildExportZip` usaba el default de JSZip (`STORE`, sin comprimir): el .zip ocupaba lo mismo que el JSON original.
  - **Hacer:** `generateAsync({ compression: 'DEFLATE' })`.
  - **Archivos:** `client/src/lib/promptBackup.js`, `client/tests/lib/promptBackup.test.ts`
  - **Hecho:** `compression: 'DEFLATE'` en `buildExportZip`. Verificado con el código real: export de 50 prompts = 149 KB de JSON → **1.2 KB de zip (~1%)**. `readImportFile` ya leía deflate, así que archivos viejos y nuevos son interoperables. Test nuevo: el zip debe pesar menos de la mitad del JSON (con contenido repetitivo, lo habitual en prompts). `e5896d1`.

- [x] **37. Import: categoría ausente → avisar y crear (sin duplicados)**
  - **Problema:** al importar, un prompt que referenciaba una categoría ajena al importer caía en *sin categoría* en silencio.
  - **Hacer:** en el dry-run, planear las categorías ausentes (y avisar); en el apply, crearlas; si ya existe (case-insensitive), reutilizar sin volver a crear.
  - **Archivos:** `server/src/controllers/promptController.js`, `client/src/components/ImportPromptsModal.vue`, `client/src/stores/usePromptStore.js`, locales, `SPECIFICATION.md` (§2.2a), tests
  - **Hecho:** `planImportCategories` (común a dry-run y apply): nombres distintos deduped, tope `MAX_CATEGORIES_PER_USER`, nunca se crea un nombre de **otro** usuario (índice único global de nombres) ni > 50 chars — esos prompts caen en *sin categoría* como antes. Dry-run: `categoryWillBeCreated` por entrada + `categories.toCreate` (banner en el modal: «Categorías que se crearán…») + hint azul por fila; apply crea las categorías antes de los prompts y las enlaza (creaciones *y* updates). Reimportar el mismo fichero no crea duplicados (se re-resuelve por nombre). 7 tests server nuevos + client; verificado en el navegador real contra la stack (categoría «Viajes» creada y enlazada, sidebar 20/19/1). `e5896d1`.

- [x] **38. Sidebar de categorías stale tras importar**
  - **Problema:** tras un import que crea categorías nuevas, la lista de categorías no se actualizaba (había que recargar la página).
  - **Hacer:** refrescar la lista de categorías tras el apply exitoso.
  - **Archivos:** `client/src/views/PromptListView.vue`, `client/src/stores/usePromptStore.js`, `client/tests/views/PromptListView.test.ts`
  - **Hecho:** `confirmImport` devuelve también `categoriesCreated`; `onImportConfirm` hace `categoryStore.fetchCategories()` tras el éxito (siempre, no solo cuando se crean categorías: los prompts creados/actualizados también cambian los contadores por categoría). Tests de vista: refresca en éxito y no lo hace en fallo. Verificado en el navegador real: import con categoría ausente → la sidebar actualiza in situ (sin recargar). `77d7b9c`.

- [x] **39. Cuotas de usuario editables por admin**
  - **Problema:** las cuotas (`MAX_PROMPTS/CATEGORIES_PER_USER`) eran globales (env); no había forma de dar más (o menos) a un usuario concreto.
  - **Hacer:** `promptQuota`/`categoryQuota` en `User` (null = global), editables vía `PUT /api/users/:id` + UI en ManageUsersView; enforcement con el valor efectivo.
  - **Archivos:** `server/src/{models/User.js, config.js, controllers/{user,prompt,category}Controller.js}`, `client/src/views/ManageUsersView.vue`, locales, `SPECIFICATION.md`, tests
  - **Hecho:** `User.promptQuota`/`categoryQuota` (Number 0–100000, default null → sin migración: ausente se lee como null = global). `config.effective*Quota(user)` (override ?? env) se usa en todos los puntos de enforcement: crear prompt/categoría, import (dry-run + plan de categorías) y el indicador de la lista de categorías (ahora por caller). `PUT /api/users/:id` acepta ambas (null = restaura global; 0 = no puede crear; inválido → 400) y audita los cambios reales (`user.quota_change`). UI: botón «Cuotas» por fila + modal (vacío = global) + la fila muestra `Cuotas: p / c` (global si null). SPEC §2.4/§2.6/§3. 231 server + 410 client en verde; verificado en el navegador (modal, indicador, 409 al tope, reset a null y auto-cuota del propio admin). `b011de1`.

- [x] **40. Nombre del export con hora (unicidad dentro del día)**
  - **Problema:** el nombre era `prompthub-export-YYYY-MM-DD.zip`: dos exports el mismo día daban el mismo nombre (colisión / renombre con «(1)» en la carpeta de descargas).
  - **Hacer:** añadir `HH-MM-SS` (24h) al nombre del fichero.
  - **Archivos:** `client/src/lib/promptBackup.js`, `client/tests/lib/promptBackup.test.ts`, `CLAUDE.md`
  - **Hecho:** `prompthub-export-YYYY-MM-DD-HH-MM-SS.zip` con fecha **y** hora locales (antes la fecha era UTC vía `toISOString()`; ahora la fecha y la hora son coherentes con el reloj del usuario). El test construye la `Date` con partes locales, así que la expectativa es independiente del timezone de la máquina/CI.

---

## Resumen de impacto

| Fase | Tareas | Esfuerzo | Riesgo si no se hace |
|------|--------|----------|----------------------|
| P0 | 1 | S | Deploy roto silenciosamente desde el ejemplo |
| P1 | 2–9 | S–M | Exploit info/DoS, sesión incómoda, auditoría ciega, modelo de privacidad ambiguo |
| P2 | 10–19 | M (10–13) / S (resto) | UX deficiente, a11y, sesiones cortadas, estados confusos |
| P3 | 20–25 | S–M | Degradación progresiva al crecer el uso compartido |
| P4 | 26–30 | S | Build roto en producción, warnings, docs mentirosas |
| P5 | 31–35 | S–M | Pérdida de datos, logs ilimitados, sin alerts |

**Total: 35 tareas.** P0+P1 + tooling (26–28) ≈ 1 semana de trabajo; el resto encaja en el roadmap.
