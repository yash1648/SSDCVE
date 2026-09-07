# SSD-CVE backend — dev convenience targets
# Usage: make <target>   (from backend/)

KEYSTORE_PASSWORD ?= change-this-local-password
COMPOSE := docker compose -f ../docker-compose.yml

.PHONY: up down ps run test build clean

up:            ## start postgres + ipfs containers
	$(COMPOSE) up -d

down:          ## stop containers
	$(COMPOSE) down

ps:            ## container status
	$(COMPOSE) ps

run:           ## run the app (foreground, Ctrl+C to stop)
	SSDCVE_KEYSTORE_PASSWORD=$(KEYSTORE_PASSWORD) ./mvnw spring-boot:run

test: up       ## run all tests (starts containers first)
	SSDCVE_KEYSTORE_PASSWORD=$(KEYSTORE_PASSWORD) ./mvnw test

build:         ## package the jar
	./mvnw clean package

clean:         ## remove build output
	./mvnw clean