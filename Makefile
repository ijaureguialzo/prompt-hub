#!make

help: _header
	${info }
	@echo Opciones:
	@echo ----------------------
	@echo build / certs
	@echo start / stop / restart
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

certs:
	@traefik/crear_certs.sh prompthub.test

_start-command:
	@docker-compose up -d --remove-orphans

start: _start-command _urls

stop:
	@docker-compose down

restart: stop start

clean:
	@docker-compose down -v --remove-orphans
