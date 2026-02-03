# DishFlow Backend

Go backend API for DishFlow - the AI-powered recipe management app.

## Quick Start

```bash
# Start development environment (with mock Gemini)
make dev

# View logs
make logs

# Run API tests
make test-api

# Stop everything
make down
```

## Requirements

- Docker & Docker Compose
- Go 1.22+ (for local development without Docker)

## Development

### First Time Setup

```bash
# Copy environment template
cp .env.example .env

# Start all services
make dev

# Run migrations (automatic on first start, or manually)
make migrate

# Verify it works
curl http://localhost:8080/health
```

### Available Commands

```bash
make help          # Show all commands
make dev           # Start with mock Gemini
make dev-live      # Start with real Gemini (needs GEMINI_API_KEY)
make logs          # Tail API logs
make test          # Run tests
make migrate       # Run database migrations
make db-shell      # Open PostgreSQL shell
```

### Project Structure

```
.
├── cmd/server/          # Application entry point
├── internal/
│   ├── config/          # Configuration
│   ├── handler/         # HTTP handlers
│   ├── middleware/      # HTTP middleware
│   ├── model/           # Domain models
│   ├── repository/      # Data access layer
│   ├── router/          # Route setup
│   ├── service/         # Business logic
│   └── pkg/             # Shared utilities
├── migrations/          # Database migrations
├── docker/              # Docker configurations
├── api/                 # OpenAPI specification
└── scripts/             # Development scripts
```

## API Documentation

- Swagger UI: http://localhost:8081 (run `make swagger`)
- Health check: http://localhost:8080/health
- API info: http://localhost:8080/api/v1/info

## Configuration

See `.env.example` for all available environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `GEMINI_API_KEY` - Google Gemini API key (or "mock")
- `GEMINI_MOCK_MODE` - Set to "true" for development

## Architecture

See `/Users/naoufal/shipyard/dishflow/.agent/specs/` for detailed architecture documentation:

- `BACKEND_ARCHITECTURE.md` - Full technical design
- `BACKEND_DECISIONS.md` - All finalized decisions
- `BACKEND_DEVELOPMENT_PLAN.md` - Implementation plan
- `REVENUECAT_INTEGRATION.md` - Subscription system

## Status

See `TRACKING.md` for current implementation status.
``

docker cp backend-api-1:/app/logs/dishflow-backend.jsonl ./logs/