# Prompt Hub — Makefile
# Comandos para arrancar y gestionar la aplicación (Docker + desarrollo local).

.PHONY: start stop restart logs clean ps help
.PHONY: install-deps install-server install-client
.PHONY: dev-server dev-client

## help:  Muestra esta ayuda.
help:
	@awk '/^## / { line = $$0; sub(/^## /, "", line); split(line, a, ": "); printf "  %-18s %s\n", a[1], substr(line, index(line,a[2])) }' $(MAKEFILE_LIST)

# ── Docker (comandos principales) ──────────────────────────────────────

## start:  Levanta toda la aplicación con Docker Compose (API + frontend + DB).
start: check-docker
	docker compose up --build -d

## stop:  Detiene todos los contenedores (sin borrar volúmenes para preservar datos).
stop:
	docker compose down

## restart:  Reinicia la aplicación (stop + start).
restart: stop start

## logs:  Muestra los logs de todos los servicios en tiempo real.
logs:
	docker compose logs -f

## ps:  Muestra el estado de los contenedores.
ps:
	docker compose ps

## clean:  Elimina contenedores, volúmenes e imágenes.
clean:
	docker compose down -v --rmi local

## check-docker:  Comprueba si Docker está corriendo.
check-docker:
	@docker info >/dev/null 2>&1 || (echo "Error: Docker no está corriendo." && exit 1)

# ── Desarrollo local (sin Docker) ───────────────────────────────────────

## install-deps:  Instala las dependencias de server y client.
install-deps: install-server install-client

## install-server:  Instala las dependencias del servidor (server/).
install-server:
	@cd server && npm install

## install-client:  Instala las dependencias del cliente (client/).
install-client:
	@cd client && npm install

## dev-server:  Arranca solo el servidor en modo desarrollo (nodemon).
dev-server:
	@cd server && npm run dev

## dev-client:  Arranca solo el cliente en modo desarrollo (Vite).
dev-client:
	@cd client && npm run dev
