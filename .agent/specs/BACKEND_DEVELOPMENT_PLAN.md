# DishFlow Backend - Standalone Development Plan

## Document Metadata
- **Date**: 2026-01-31
- **Purpose**: Plan for building and testing backend independently before mobile integration
- **Approach**: Docker Compose for local dev, standalone API testing

---

## Part 1: Development Philosophy

### Why Standalone First?

```
Benefits:
├── Faster iteration (no mobile rebuild cycles)
├── Proper API testing before integration
├── Catch contract issues early
├── Easier debugging (isolated environment)
├── CI/CD can run full test suite
└── Multiple developers can work in parallel
```

### Development Modes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DEVELOPMENT MODES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  MODE 1: make dev                                                       │
│  ├── Full local stack via docker compose                                │
│  ├── Real PostgreSQL, Redis                                             │
│  ├── Mock Gemini (returns canned responses)                             │
│  ├── Hot reload on code changes                                         │
│  └── Swagger UI at http://localhost:8080/docs                           │
│                                                                          │
│  MODE 2: make test                                                      │
│  ├── Ephemeral test database (docker)                                   │
│  ├── All external services mocked                                       │
│  ├── Unit + Integration + E2E tests                                     │
│  └── Coverage report                                                    │
│                                                                          │
│  MODE 3: make dev-live                                                  │
│  ├── Real Gemini API (uses your API key)                                │
│  ├── For testing actual video extraction                                │
│  └── Rate limited to avoid costs                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Project Structure

```
dishflow-backend/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point
│
├── internal/
│   ├── config/
│   │   └── config.go               # Environment config loader
│   │
│   ├── handler/                    # HTTP handlers (controllers)
│   │   ├── auth.go
│   │   ├── auth_test.go
│   │   ├── recipes.go
│   │   ├── recipes_test.go
│   │   ├── video.go
│   │   ├── video_test.go
│   │   ├── pantry.go
│   │   ├── sync.go
│   │   └── subscription.go
│   │
│   ├── service/                    # Business logic
│   │   ├── ai/
│   │   │   ├── gemini.go           # Real Gemini client
│   │   │   ├── gemini_mock.go      # Mock for testing
│   │   │   └── gemini_test.go
│   │   ├── video/
│   │   │   ├── processor.go
│   │   │   └── processor_test.go
│   │   ├── auth/
│   │   │   ├── jwt.go
│   │   │   └── jwt_test.go
│   │   └── sync/
│   │       └── sync.go
│   │
│   ├── repository/                 # Data access layer
│   │   ├── postgres/
│   │   │   ├── user.go
│   │   │   ├── user_test.go
│   │   │   ├── recipe.go
│   │   │   └── recipe_test.go
│   │   └── redis/
│   │       ├── cache.go
│   │       └── ratelimit.go
│   │
│   ├── model/                      # Domain models
│   │   ├── user.go
│   │   ├── recipe.go
│   │   └── job.go
│   │
│   ├── middleware/
│   │   ├── auth.go
│   │   ├── ratelimit.go
│   │   ├── logging.go
│   │   └── cors.go
│   │
│   └── testutil/                   # Test helpers
│       ├── fixtures.go             # Test data generators
│       ├── db.go                   # Test database setup
│       └── mocks.go                # Service mocks
│
├── migrations/                     # Database migrations
│   ├── 000001_init.up.sql
│   ├── 000001_init.down.sql
│   ├── 000002_add_subscriptions.up.sql
│   └── 000002_add_subscriptions.down.sql
│
├── api/                            # API documentation
│   ├── openapi.yaml                # OpenAPI 3.0 spec
│   └── examples/                   # Request/response examples
│       ├── video_extract.http
│       └── recipes.http
│
├── scripts/                        # Dev scripts
│   ├── seed.go                     # Seed test data
│   └── test-api.sh                 # API smoke tests
│
├── docker/
│   ├── Dockerfile                  # Production image
│   ├── Dockerfile.dev              # Dev image with hot reload
│   └── init-db.sql                 # Initial DB setup
│
├── docker compose.yml              # Full local stack
├── docker compose.test.yml         # Test environment
├── Makefile                        # Developer commands
├── go.mod
├── go.sum
├── .env.example                    # Environment template
└── README.md
```

---

## Part 3: Docker Compose Configuration

### docker compose.yml (Development)

```yaml
version: '3.8'

services:
  # Go API Server with hot reload
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DATABASE_URL=postgres://dishflow:dishflow@postgres:5432/dishflow?sslmode=disable
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY:-mock}
      - GEMINI_MOCK_MODE=${GEMINI_MOCK_MODE:-true}
      - JWT_SECRET=dev-secret-min-32-characters-long
      - LOG_LEVEL=debug
      - CORS_ORIGINS=*
    volumes:
      - .:/app
      - go-mod-cache:/go/pkg/mod
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - dishflow

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: dishflow
      POSTGRES_PASSWORD: dishflow
      POSTGRES_DB: dishflow
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./docker/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dishflow"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - dishflow

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - dishflow

  # Database migrations
  migrate:
    image: migrate/migrate:v4.17.0
    volumes:
      - ./migrations:/migrations
    command: [
      "-path=/migrations",
      "-database=postgres://dishflow:dishflow@postgres:5432/dishflow?sslmode=disable",
      "up"
    ]
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - dishflow
    profiles:
      - tools

  # Swagger UI for API exploration
  swagger:
    image: swaggerapi/swagger-ui:v5.11.0
    ports:
      - "8081:8080"
    environment:
      SWAGGER_JSON: /api/openapi.yaml
      BASE_URL: /docs
    volumes:
      - ./api:/api:ro
    networks:
      - dishflow

volumes:
  postgres-data:
  redis-data:
  go-mod-cache:

networks:
  dishflow:
    driver: bridge
```

### docker/Dockerfile.dev (Hot Reload)

```dockerfile
FROM golang:1.22-alpine

# Install air for hot reload
RUN go install github.com/air-verse/air@latest

# Install yt-dlp for video downloads
RUN apk add --no-cache ffmpeg python3 py3-pip curl
RUN pip3 install yt-dlp --break-system-packages

WORKDIR /app

# Copy go mod files for caching
COPY go.mod go.sum ./
RUN go mod download

# Air config for hot reload
COPY .air.toml .

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]
```

### docker/Dockerfile (Production)

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /server ./cmd/server

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates ffmpeg python3 py3-pip
RUN pip3 install yt-dlp --break-system-packages

COPY --from=builder /server /server
COPY --from=builder /app/migrations /migrations

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["/server"]
```

### .air.toml (Hot Reload Config)

```toml
root = "."
tmp_dir = "tmp"

[build]
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ./cmd/server"
  delay = 1000
  exclude_dir = ["assets", "tmp", "vendor", "testdata", "migrations"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html", "yaml", "yml"]
  kill_delay = "2s"
  log = "build-errors.log"
  send_interrupt = false
  stop_on_error = true

[log]
  time = false

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[misc]
  clean_on_exit = false
```

---

## Part 4: Makefile Commands

```makefile
.PHONY: dev dev-live test build clean migrate seed lint help

# Default target
help:
	@echo "DishFlow Backend Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start full local stack (mock Gemini)"
	@echo "  make dev-live     - Start with real Gemini API"
	@echo "  make down         - Stop all containers"
	@echo "  make logs         - Tail container logs"
	@echo ""
	@echo "Database:"
	@echo "  make migrate      - Run database migrations"
	@echo "  make migrate-down - Rollback last migration"
	@echo "  make seed         - Seed test data"
	@echo "  make db-reset     - Reset database (DESTRUCTIVE)"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-unit    - Run unit tests only"
	@echo "  make test-int     - Run integration tests"
	@echo "  make test-e2e     - Run E2E API tests"
	@echo "  make coverage     - Generate coverage report"
	@echo ""
	@echo "Build:"
	@echo "  make build        - Build production binary"
	@echo "  make docker-build - Build production Docker image"
	@echo ""
	@echo "Quality:"
	@echo "  make lint         - Run linters"
	@echo "  make fmt          - Format code"
	@echo "  make openapi      - Validate OpenAPI spec"

# === Development ===

dev:
	GEMINI_MOCK_MODE=true docker compose up --build

dev-live:
	@if [ -z "$$GEMINI_API_KEY" ]; then \
		echo "Error: GEMINI_API_KEY not set"; \
		echo "Run: export GEMINI_API_KEY=your-key"; \
		exit 1; \
	fi
	GEMINI_MOCK_MODE=false docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f api

# === Database ===

migrate:
	docker compose run --rm migrate

migrate-down:
	docker compose run --rm migrate -path=/migrations \
		-database=postgres://dishflow:dishflow@postgres:5432/dishflow?sslmode=disable \
		down 1

seed:
	docker compose exec api go run scripts/seed.go

db-reset:
	docker compose down -v
	docker compose up -d postgres
	sleep 3
	$(MAKE) migrate
	$(MAKE) seed

# === Testing ===

test:
	go test -v -race ./...

test-unit:
	go test -v -short ./...

test-int:
	docker compose -f docker compose.test.yml up -d
	go test -v -tags=integration ./...
	docker compose -f docker compose.test.yml down

test-e2e:
	docker compose -f docker compose.test.yml up -d
	go test -v -tags=e2e ./...
	docker compose -f docker compose.test.yml down

coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

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
	goimports -w .

openapi:
	@command -v swagger-cli >/dev/null 2>&1 || npm install -g @apidevtools/swagger-cli
	swagger-cli validate api/openapi.yaml
```

---

## Part 5: Gemini Mock Service

### internal/service/ai/gemini_mock.go

```go
package ai

import (
	"context"
	"time"
)

// MockGeminiClient returns canned responses for development
type MockGeminiClient struct {
	// Control mock behavior
	ShouldFail     bool
	ResponseDelay  time.Duration
	CustomResponse *ExtractedRecipe
}

func NewMockGeminiClient() *MockGeminiClient {
	return &MockGeminiClient{
		ResponseDelay: 2 * time.Second, // Simulate processing time
	}
}

func (m *MockGeminiClient) ExtractRecipeFromVideo(ctx context.Context, videoURI string) (*ExtractedRecipe, error) {
	// Simulate processing delay
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(m.ResponseDelay):
	}

	if m.ShouldFail {
		return nil, ErrExtractionFailed
	}

	if m.CustomResponse != nil {
		return m.CustomResponse, nil
	}

	// Return canned response
	return &ExtractedRecipe{
		Title:       "Mock Recipe: Pasta Carbonara",
		Description: "Classic Italian pasta dish with eggs, cheese, and pancetta.",
		Servings:    4,
		PrepTime:    15,
		CookTime:    20,
		Difficulty:  "medium",
		Cuisine:     "italian",
		Ingredients: []Ingredient{
			{Name: "Spaghetti", Quantity: 400, Unit: "g", Category: "pantry"},
			{Name: "Pancetta", Quantity: 200, Unit: "g", Category: "proteins"},
			{Name: "Eggs", Quantity: 4, Unit: "whole", Category: "dairy"},
			{Name: "Pecorino Romano", Quantity: 100, Unit: "g", Category: "dairy"},
			{Name: "Black Pepper", Quantity: 1, Unit: "tsp", Category: "spices"},
		},
		Steps: []Step{
			{StepNumber: 1, Instruction: "Boil water and cook pasta until al dente", DurationSeconds: 600},
			{StepNumber: 2, Instruction: "Fry pancetta until crispy", DurationSeconds: 300},
			{StepNumber: 3, Instruction: "Mix eggs and cheese in a bowl", DurationSeconds: 60},
			{StepNumber: 4, Instruction: "Combine pasta with pancetta, remove from heat", DurationSeconds: 30},
			{StepNumber: 5, Instruction: "Add egg mixture and toss quickly", DurationSeconds: 60},
		},
		Tags: []string{"pasta", "italian", "quick", "classic"},
	}, nil
}

func (m *MockGeminiClient) GenerateRecipe(ctx context.Context, prompt string) (*ExtractedRecipe, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(m.ResponseDelay):
	}

	return &ExtractedRecipe{
		Title:       "AI Generated: " + prompt[:min(30, len(prompt))],
		Description: "A delicious recipe generated based on your prompt.",
		Servings:    4,
		PrepTime:    20,
		CookTime:    30,
		Difficulty:  "easy",
		Cuisine:     "fusion",
		Ingredients: []Ingredient{
			{Name: "Main Ingredient", Quantity: 500, Unit: "g", Category: "proteins"},
			{Name: "Vegetables", Quantity: 300, Unit: "g", Category: "produce"},
			{Name: "Seasoning", Quantity: 1, Unit: "tbsp", Category: "spices"},
		},
		Steps: []Step{
			{StepNumber: 1, Instruction: "Prepare all ingredients", DurationSeconds: 300},
			{StepNumber: 2, Instruction: "Cook the main ingredient", DurationSeconds: 600},
			{StepNumber: 3, Instruction: "Add vegetables and seasonings", DurationSeconds: 300},
			{StepNumber: 4, Instruction: "Serve and enjoy", DurationSeconds: 60},
		},
	}, nil
}

func (m *MockGeminiClient) Close() error {
	return nil
}
```

### internal/service/ai/interface.go

```go
package ai

import "context"

// GeminiService interface allows swapping real/mock implementations
type GeminiService interface {
	ExtractRecipeFromVideo(ctx context.Context, videoURI string) (*ExtractedRecipe, error)
	GenerateRecipe(ctx context.Context, prompt string) (*ExtractedRecipe, error)
	Close() error
}

// NewGeminiService creates real or mock client based on config
func NewGeminiService(apiKey string, mockMode bool) (GeminiService, error) {
	if mockMode || apiKey == "mock" || apiKey == "" {
		return NewMockGeminiClient(), nil
	}
	return NewGeminiClient(apiKey)
}
```

---

## Part 6: Testing Strategy

### Test Categories

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TEST PYRAMID                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                          ┌─────────┐                                    │
│                          │  E2E    │  10% - Full API tests              │
│                         ─┴─────────┴─                                   │
│                        ┌─────────────┐                                  │
│                        │ Integration │  30% - Handler + DB tests        │
│                       ─┴─────────────┴─                                 │
│                      ┌─────────────────┐                                │
│                      │   Unit Tests    │  60% - Service/logic tests     │
│                     ─┴─────────────────┴─                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Example: Handler Integration Test

```go
// internal/handler/recipes_test.go
//go:build integration

package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"dishflow-backend/internal/testutil"
)

func TestRecipeHandler_Create(t *testing.T) {
	// Setup test database
	db := testutil.SetupTestDB(t)
	defer testutil.TeardownTestDB(t, db)

	// Create handler with real dependencies
	handler := NewRecipeHandler(db, testutil.MockGemini())

	// Create test user and get token
	token := testutil.CreateTestUser(t, db, "test@example.com")

	tests := []struct {
		name       string
		payload    map[string]interface{}
		wantStatus int
		wantErr    string
	}{
		{
			name: "valid recipe",
			payload: map[string]interface{}{
				"title":       "Test Recipe",
				"description": "A test recipe",
				"servings":    4,
				"ingredients": []map[string]interface{}{
					{"name": "Ingredient 1", "quantity": 100, "unit": "g", "category": "produce"},
				},
				"steps": []map[string]interface{}{
					{"stepNumber": 1, "instruction": "Do something"},
				},
			},
			wantStatus: http.StatusCreated,
		},
		{
			name: "missing title",
			payload: map[string]interface{}{
				"description": "No title",
			},
			wantStatus: http.StatusBadRequest,
			wantErr:    "VALIDATION_FAILED",
		},
		{
			name: "title too long",
			payload: map[string]interface{}{
				"title": string(make([]byte, 300)), // 300 chars, max is 200
			},
			wantStatus: http.StatusBadRequest,
			wantErr:    "VALIDATION_FAILED",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.payload)
			req := httptest.NewRequest(http.MethodPost, "/api/v1/recipes", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, tt.wantStatus, rr.Code)

			if tt.wantErr != "" {
				var errResp map[string]interface{}
				json.Unmarshal(rr.Body.Bytes(), &errResp)
				assert.Contains(t, errResp["error"].(map[string]interface{})["code"], tt.wantErr)
			}
		})
	}
}
```

### Example: E2E API Test

```go
// e2e/video_extraction_test.go
//go:build e2e

package e2e

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVideoExtractionFlow(t *testing.T) {
	client := NewAPIClient(t, "http://localhost:8080")

	// 1. Create anonymous session
	authResp := client.Post("/api/v1/auth/anonymous", nil)
	require.Equal(t, http.StatusOK, authResp.StatusCode)

	var auth struct {
		AccessToken string `json:"accessToken"`
	}
	json.NewDecoder(authResp.Body).Decode(&auth)
	client.SetToken(auth.AccessToken)

	// 2. Start video extraction
	extractResp := client.Post("/api/v1/video/extract", map[string]string{
		"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Mock will handle
	})
	require.Equal(t, http.StatusAccepted, extractResp.StatusCode)

	var job struct {
		JobID  string `json:"jobId"`
		Status string `json:"status"`
	}
	json.NewDecoder(extractResp.Body).Decode(&job)
	assert.Equal(t, "pending", job.Status)

	// 3. Poll for completion (mock completes in ~2 seconds)
	var finalJob struct {
		Status string                 `json:"status"`
		Recipe map[string]interface{} `json:"recipe"`
	}

	for i := 0; i < 10; i++ {
		time.Sleep(500 * time.Millisecond)

		statusResp := client.Get("/api/v1/jobs/" + job.JobID)
		require.Equal(t, http.StatusOK, statusResp.StatusCode)

		json.NewDecoder(statusResp.Body).Decode(&finalJob)
		if finalJob.Status == "completed" || finalJob.Status == "failed" {
			break
		}
	}

	assert.Equal(t, "completed", finalJob.Status)
	assert.NotEmpty(t, finalJob.Recipe["title"])
	assert.NotEmpty(t, finalJob.Recipe["ingredients"])
}
```

---

## Part 7: API Testing Tools

### api/examples/video_extract.http

```http
### Create anonymous session
POST http://localhost:8080/api/v1/auth/anonymous
Content-Type: application/json

{}

> {%
    client.global.set("token", response.body.accessToken);
%}

### Start video extraction
POST http://localhost:8080/api/v1/video/extract
Authorization: Bearer {{token}}
Content-Type: application/json
Idempotency-Key: {{$uuid}}

{
  "url": "https://www.youtube.com/watch?v=example",
  "language": "en",
  "detailLevel": "detailed"
}

> {%
    client.global.set("jobId", response.body.jobId);
%}

### Poll job status
GET http://localhost:8080/api/v1/jobs/{{jobId}}
Authorization: Bearer {{token}}

### Stream job progress (SSE)
GET http://localhost:8080/api/v1/jobs/{{jobId}}/stream
Authorization: Bearer {{token}}
Accept: text/event-stream
```

### scripts/test-api.sh

```bash
#!/bin/bash
set -e

BASE_URL=${BASE_URL:-http://localhost:8080}
echo "Testing API at $BASE_URL"

# Health check
echo -n "Health check... "
curl -sf "$BASE_URL/health" > /dev/null && echo "OK" || echo "FAILED"

# Ready check
echo -n "Ready check... "
curl -sf "$BASE_URL/ready" > /dev/null && echo "OK" || echo "FAILED"

# Create anonymous session
echo -n "Anonymous auth... "
AUTH_RESPONSE=$(curl -sf -X POST "$BASE_URL/api/v1/auth/anonymous" \
  -H "Content-Type: application/json" \
  -d '{}')
TOKEN=$(echo $AUTH_RESPONSE | jq -r '.accessToken')
if [ "$TOKEN" != "null" ]; then
  echo "OK (token: ${TOKEN:0:20}...)"
else
  echo "FAILED"
  exit 1
fi

# Test video extraction (mock mode)
echo -n "Video extraction... "
JOB_RESPONSE=$(curl -sf -X POST "$BASE_URL/api/v1/video/extract" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"url": "https://youtube.com/watch?v=test"}')
JOB_ID=$(echo $JOB_RESPONSE | jq -r '.jobId')
if [ "$JOB_ID" != "null" ]; then
  echo "OK (jobId: $JOB_ID)"
else
  echo "FAILED"
  exit 1
fi

# Poll for completion
echo -n "Waiting for job completion"
for i in {1..20}; do
  sleep 0.5
  echo -n "."
  STATUS=$(curl -sf "$BASE_URL/api/v1/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  if [ "$STATUS" = "completed" ]; then
    echo " OK"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo " FAILED"
    exit 1
  fi
done

echo ""
echo "All tests passed!"
```

---

## Part 8: Development Workflow

### Daily Workflow

```
1. Start development environment
   $ make dev

2. View logs in separate terminal
   $ make logs

3. Open Swagger UI for API exploration
   http://localhost:8081

4. Make code changes (auto-reloads)

5. Run tests frequently
   $ make test-unit   # Quick feedback
   $ make test        # Full suite before commit

6. Stop when done
   $ make down
```

### First Time Setup

```bash
# 1. Clone repository
git clone <repo>
cd dishflow-backend

# 2. Copy environment template
cp .env.example .env

# 3. Start everything
make dev

# 4. Run migrations (first time only)
make migrate

# 5. Seed test data
make seed

# 6. Verify it works
./scripts/test-api.sh
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Install dependencies
        run: go mod download

      - name: Run linter
        uses: golangci/golangci-lint-action@v4
        with:
          version: latest

      - name: Run migrations
        run: |
          go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
          migrate -path migrations -database "postgres://test:test@localhost:5432/test?sslmode=disable" up

      - name: Run tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test?sslmode=disable
          REDIS_URL: redis://localhost:6379
          GEMINI_MOCK_MODE: "true"
        run: go test -v -race -coverprofile=coverage.out ./...

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.out

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t dishflow-api:${{ github.sha }} -f docker/Dockerfile .
```

---

## Part 9: Implementation Order

### Phase 1: Foundation (Days 1-3)

```
Day 1:
├── Initialize Go module
├── Set up project structure
├── Create docker compose.yml
├── Create Makefile
├── Write Dockerfile.dev (hot reload)
└── Verify: make dev starts without errors

Day 2:
├── Database migrations (users, recipes, jobs tables)
├── Config loader (environment variables)
├── Health check endpoints (/health, /ready)
├── Basic logging middleware
└── Verify: make test-api.sh passes health checks

Day 3:
├── JWT auth service
├── Anonymous auth endpoint
├── Auth middleware
├── Rate limiting middleware (Redis)
└── Verify: Can create anonymous session and make authenticated requests
```

### Phase 2: Core Video Pipeline (Days 4-7)

```
Day 4:
├── Gemini mock service
├── Gemini interface
├── Video job model and repository
└── Verify: Unit tests pass

Day 5:
├── POST /video/extract handler
├── GET /jobs/{id} handler
├── Background job processor (goroutines)
└── Verify: Can start extraction job

Day 6:
├── SSE streaming for job progress
├── Job cancellation
├── Integration tests
└── Verify: Full mock extraction works

Day 7:
├── Real Gemini client (make dev-live)
├── yt-dlp integration
├── Error handling and retries
└── Verify: Real video extraction works (test with YouTube)
```

### Phase 3: Recipe CRUD (Days 8-10)

```
Day 8:
├── Recipe model and repository
├── GET /recipes (list with pagination)
├── GET /recipes/{id}
└── Verify: Can list and get recipes

Day 9:
├── POST /recipes
├── PUT /recipes/{id}
├── DELETE /recipes/{id}
├── Input validation
└── Verify: Full CRUD works

Day 10:
├── Favorites (toggle endpoint)
├── Recipe search and filters
├── Integration tests
└── Verify: All recipe endpoints tested
```

### Phase 4: Subscription & Quotas (Days 11-13)

```
Day 11:
├── RevenueCat webhook handler
├── Subscription model and repository
├── GET /subscription endpoint
└── Verify: Webhook receives events

Day 12:
├── Quota enforcement middleware
├── Tier-based limits
├── Usage tracking
└── Verify: Free tier limits work

Day 13:
├── Integration with video/recipe endpoints
├── Paywall error responses (402)
├── E2E tests for quota scenarios
└── Verify: Full subscription flow
```

### Phase 5: Polish & Deploy (Days 14-15)

```
Day 14:
├── OpenAPI spec completion
├── Swagger UI configuration
├── Error message improvements
├── Logging and observability
└── Verify: API docs are accurate

Day 15:
├── Production Dockerfile
├── CI/CD pipeline
├── Deploy to Railway/Fly.io
├── Smoke tests on production
└── Verify: Production deployment works
```

---

## Part 10: Success Criteria

### Before Mobile Integration

The backend is ready for mobile integration when:

- [ ] All endpoints in BACKEND_DECISIONS.md are implemented
- [ ] Test coverage > 70%
- [ ] All E2E tests pass
- [ ] `make dev` starts in < 30 seconds
- [ ] `make test` passes in < 2 minutes
- [ ] OpenAPI spec validated and matches implementation
- [ ] Can complete full video extraction flow (mock)
- [ ] Can complete real video extraction (with API key)
- [ ] Rate limiting works
- [ ] Subscription webhooks work
- [ ] Production deployment accessible

### API Contract Validation

```bash
# Generate TypeScript types from OpenAPI
npx openapi-typescript api/openapi.yaml --output ../dishflow-app/src/api/types.ts

# Mobile team can start building against types immediately
```

---

**Document Status**: Development Plan Complete
**Next Step**: Initialize repository and start Phase 1
**Last Updated**: 2026-01-31
