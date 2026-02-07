# DishFlow Backend

Production-ready Go backend for DishFlow — an AI-powered recipe management platform.

## Features

- **Recipe Extraction** — Extract recipes from videos (YouTube, TikTok), webpages, and images using Gemini AI
- **Pantry Management** — Track ingredients with expiration dates and categories
- **Shopping Lists** — Create lists, add from recipes, complete items to pantry
- **Sync API** — Bidirectional sync with conflict resolution (LWW/server-wins)
- **Subscription System** — RevenueCat integration for in-app purchases

## Quick Start

```bash
# Copy environment template
cp .env.example .env

# Start development stack (PostgreSQL, Redis, API with hot reload)
make dev

# Verify it works
curl http://localhost:8080/health
```

## Requirements

| Dependency | Version | Purpose |
|------------|---------|---------|
| Docker | 20.10+ | Container runtime |
| Docker Compose | 2.0+ | Service orchestration |
| Go | 1.22+ | Optional, for local dev without Docker |

## Development

### Commands

```bash
make dev           # Start with mock Gemini (no API key needed)
make dev-live      # Start with real Gemini (requires GEMINI_API_KEY)
make logs          # Tail API logs
make test          # Run unit tests
make migrate       # Run database migrations
make db-shell      # Open PostgreSQL shell
make down          # Stop all services
```

### Project Structure

```
.
├── cmd/
│   ├── server/           # Main application entry point
│   └── e2e_test/         # End-to-end test runner
├── internal/
│   ├── config/           # Environment configuration
│   ├── handler/          # HTTP request handlers
│   ├── middleware/       # Auth, rate limiting, logging, CORS
│   ├── model/            # Domain models with validation
│   ├── repository/       # PostgreSQL data access layer
│   ├── router/           # Chi router setup
│   ├── service/          # Business logic (AI, Auth, Sync)
│   └── pkg/response/     # Standardized JSON responses
├── migrations/           # SQL migrations (golang-migrate)
├── docker/               # Dockerfile (prod) + Dockerfile.dev (hot reload)
└── scripts/              # Helper scripts for development
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Liveness probe |
| `GET /ready` | Readiness probe (checks DB + Redis) |
| `GET /api/v1/info` | API version and status |
| `POST /api/v1/extract` | Extract recipe from URL, video, or image |
| `GET /api/v1/recipes` | List user recipes |
| `POST /api/v1/sync` | Bidirectional sync endpoint |

Full API documentation available via Swagger UI at `http://localhost:8081` when running `make swagger`.

## Configuration

Key environment variables (see `.env.example` for complete list):

```bash
# Required
DATABASE_URL=postgres://dishflow:dishflow@localhost:5432/dishflow?sslmode=disable
REDIS_URL=redis://localhost:6379

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_test_...

# AI (Gemini)
GEMINI_API_KEY=your-api-key
GEMINI_MOCK_MODE=true  # Set false for production

# Optional
ADMIN_EMAILS=admin@example.com  # Unlimited extractions
```

## Architecture

The backend follows clean architecture principles:

```
HTTP Request → Middleware → Handler → Service → Repository → PostgreSQL
                                   ↘ AI Service → Gemini API
```

**Key patterns:**
- Dependency injection via interfaces
- Soft deletes with sync versioning
- Transactional operations for multi-step mutations
- Rate limiting with atomic Redis Lua scripts
- Token blacklist for logout/revocation

## License

MIT