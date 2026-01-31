.PHONY: dev dev-live test build clean migrate migrate-down migrate-create seed lint fmt help down logs

# Default target
help:
	@echo "DishFlow Backend Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start full local stack (mock Gemini)"
	@echo "  make dev-live     - Start with real Gemini API"
	@echo "  make down         - Stop all containers"
	@echo "  make logs         - Tail container logs"
	@echo "  make restart      - Restart API container"
	@echo ""
	@echo "Database:"
	@echo "  make migrate      - Run database migrations"
	@echo "  make migrate-down - Rollback last migration"
	@echo "  make migrate-create name=xyz - Create new migration"
	@echo "  make seed         - Seed test data"
	@echo "  make db-reset     - Reset database (DESTRUCTIVE)"
	@echo "  make db-shell     - Open psql shell"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-unit    - Run unit tests only"
	@echo "  make test-int     - Run integration tests"
	@echo "  make test-cover   - Run tests with coverage"
	@echo "  make test-api     - Run API smoke tests"
	@echo ""
	@echo "Build:"
	@echo "  make build        - Build production binary"
	@echo "  make docker-build - Build production Docker image"
	@echo ""
	@echo "Quality:"
	@echo "  make lint         - Run linters"
	@echo "  make fmt          - Format code"

# === Development ===

dev:
	GEMINI_MOCK_MODE=true docker compose up --build

dev-live:
	GEMINI_MOCK_MODE=false docker compose up --build

dev-bg:
	GEMINI_MOCK_MODE=true docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f api

restart:
	docker compose restart api

# === Database ===

migrate:
	docker compose run --rm migrate up

migrate-down:
	docker compose run --rm migrate down 1

migrate-create:
	@if [ -z "$(name)" ]; then \
		echo "Error: name is required"; \
		echo "Usage: make migrate-create name=add_users_table"; \
		exit 1; \
	fi
	@touch migrations/$$(date +%Y%m%d%H%M%S)_$(name).up.sql
	@touch migrations/$$(date +%Y%m%d%H%M%S)_$(name).down.sql
	@echo "Created migrations/$$(date +%Y%m%d%H%M%S)_$(name).up.sql"
	@echo "Created migrations/$$(date +%Y%m%d%H%M%S)_$(name).down.sql"

seed:
	docker compose exec api go run scripts/seed.go

db-reset:
	docker compose down -v
	docker compose up -d postgres redis
	@echo "Waiting for postgres..."
	@sleep 3
	$(MAKE) migrate
	@echo "Database reset complete"

db-shell:
	docker compose exec postgres psql -U dishflow -d dishflow

# === Testing ===

test:
	go test -v -race ./...

test-unit:
	go test -v -short ./...

test-int:
	go test -v -tags=integration ./...

test-cover:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

test-api:
	@chmod +x scripts/test-api.sh
	./scripts/test-api.sh

# === Build ===

build:
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/server ./cmd/server

docker-build:
	docker build -t dishflow-api:latest -f docker/Dockerfile .

# === Quality ===

lint:
	golangci-lint run ./...

fmt:
	go fmt ./...
	@which goimports > /dev/null && goimports -w . || echo "goimports not installed, skipping"

# === Utilities ===

deps:
	go mod tidy
	go mod download

swagger:
	docker compose --profile docs up -d swagger
	@echo "Swagger UI available at http://localhost:8081"
