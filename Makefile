#!make

help: _header
	${info }
	@echo Opciones:
	@echo ----------------------
	@echo build / certs
	@echo start / stop / restart
	@echo ----------------------
	@echo test / lint
	@echo ----------------------
	@echo seed-admin / seed-data
	@echo ----------------------
	@echo clean
	@echo ----------------------

_urls: _header
	${info }
	@echo -------------------------------------
	@echo [PromptHub] https://prompthub.test
	@echo [API] https://api.prompthub.test
	@echo [Traefik] https://traefik.prompthub.test
	@echo -------------------------------------

_header:
	@echo ---------
	@echo PromptHub
	@echo ---------

build:
	@docker-compose pull && docker-compose build --pull

test:
	@echo "Running server tests..."
	@cd server && npm test
	@echo ""
	@echo "Running client tests..."
	@cd client && npm test

lint:
	@echo "Linting server..."
	@cd server && npm run lint
	@echo ""
	@echo "Linting client..."
	@cd client && npm run lint

certs:
	@traefik/crear_certs.sh prompthub.test

# Bootstrap an admin user directly in the database (idempotent).
# Usage: make seed-admin SEED_EMAIL=x@y.com SEED_PASSWORD=secret [SEED_NAME=Name]
seed-admin:
	@if [ -z "$(SEED_EMAIL)" ] || [ -z "$(SEED_PASSWORD)" ]; then \
		echo "Usage: make seed-admin SEED_EMAIL=x@y.com SEED_PASSWORD=secret [SEED_NAME=Name]"; \
		exit 1; \
	fi
	@cd server && SEED_EMAIL="$(SEED_EMAIL)" SEED_PASSWORD="$(SEED_PASSWORD)" SEED_NAME="$(SEED_NAME)" npm run seed:admin

# Seed demo content for one user (idempotent, [demo]-marked).
# Usage: make seed-data SEED_USER_EMAIL=x@y.com
seed-data:
	@if [ -z "$(SEED_USER_EMAIL)" ]; then \
		echo "Usage: make seed-data SEED_USER_EMAIL=x@y.com"; \
		exit 1; \
	fi
	@cd server && SEED_USER_EMAIL="$(SEED_USER_EMAIL)" npm run seed:data

_start-command:
	@docker-compose up -d --remove-orphans

start: _start-command _urls

stop:
	@docker-compose down

restart: stop start

clean:
	@docker-compose down -v --remove-orphans
