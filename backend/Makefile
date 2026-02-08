.PHONY: dev dev-live test build clean migrate migrate-down migrate-create seed lint fmt help down logs swagger swagger-fmt deploy prod-up prod-down prod-logs prod-migrate

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
	@echo "  make e2e-test     - Run E2E recipe extraction tests"
	@echo ""
	@echo "Production:"
	@echo "  make deploy       - Deploy (build + migrate + restart)"
	@echo "  make prod-up      - Start production stack"
	@echo "  make prod-down    - Stop production stack"
	@echo "  make prod-logs    - Tail production logs"
	@echo "  make prod-migrate - Run migrations in production"
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
	GEMINI_MOCK_MODE=true ENABLE_SWAGGER=true docker compose up --build

dev-live:
	GEMINI_MOCK_MODE=false ENABLE_SWAGGER=true docker compose up --build

dev-bg:
	GEMINI_MOCK_MODE=true ENABLE_SWAGGER=true docker compose up --build -d

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

e2e-test:
	@echo "🧪 Running E2E Recipe Extraction Tests..."
	@set -a; \
	if [ -f .env ]; then \
		. ./.env; \
	fi; \
	set +a; \
	if [ -z "$$GEMINI_API_KEY" ] || [ "$$GEMINI_API_KEY" = "mock" ]; then \
		echo "❌ Error: GEMINI_API_KEY environment variable must be set and not 'mock'"; \
		echo "Export your API key: export GEMINI_API_KEY='your-key-here'"; \
		exit 1; \
	fi; \
	go run cmd/e2e_test/main.go

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

# Generate Swagger documentation from code annotations
swagger:
	@test -f $$(go env GOPATH)/bin/swag || (echo "Installing swag..." && go install github.com/swaggo/swag/cmd/swag@latest)
	$$(go env GOPATH)/bin/swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal
	@echo "Swagger docs generated in docs/"
	@echo "Run with ENABLE_SWAGGER=true to access UI at /swagger/index.html"

# Format Swagger annotations
swagger-fmt:
	@test -f $$(go env GOPATH)/bin/swag || (echo "Installing swag..." && go install github.com/swaggo/swag/cmd/swag@latest)
	$$(go env GOPATH)/bin/swag fmt

# Legacy: Start Swagger UI container (deprecated - use swagger target instead)
swagger-ui:
	docker compose --profile docs up -d swagger
	@echo "Swagger UI available at http://localhost:8081"

# === Production ===

PROD_COMPOSE = docker compose --env-file .env.prod -f docker-compose.prod.yml

deploy:
	@test -f .env.prod || (echo "Error: .env.prod not found. Copy .env.prod.example and fill in values." && exit 1)
	$(PROD_COMPOSE) build api
	$(PROD_COMPOSE) up -d postgres redis
	@echo "Waiting for postgres..."
	@sleep 3
	$(PROD_COMPOSE) run --rm migrate up
	$(PROD_COMPOSE) up -d api
	@echo "Deployment complete. Run 'make prod-logs' to check."

prod-up:
	@test -f .env.prod || (echo "Error: .env.prod not found. Copy .env.prod.example and fill in values." && exit 1)
	$(PROD_COMPOSE) up -d

prod-restart:
	$(PROD_COMPOSE) build api
	$(PROD_COMPOSE) up -d api

prod-down:
	$(PROD_COMPOSE) down

prod-logs:
	$(PROD_COMPOSE) logs -f api

prod-migrate:
	$(PROD_COMPOSE) run --rm migrate up
