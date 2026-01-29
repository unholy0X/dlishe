# DishFlow Backend Architecture - Senior Staff Engineer Design

## Document Metadata
- **Author**: Senior Staff Engineer (API Design + Mobile Backend)
- **Date**: 2026-01-31
- **Status**: Architecture Design Complete, Ready for Review
- **Stack Decision**: Go (primary) with Python fallback for ML tasks
- **Target**: Independent backend service with REST API

---

## Executive Summary

### The Question: Should DishFlow Have a Backend?

**Current State**: DishFlow is a local-first app with SQLite + direct Gemini API calls from mobile.

**Proposed State**: Independent Go backend service that the mobile app connects to via REST API.

### Verdict: YES, with Caveats

| Factor | Without Backend | With Backend | Winner |
|--------|-----------------|--------------|--------|
| **Video Processing** | Limited (Gemini URL only) | Full (yt-dlp, any platform) | Backend |
| **API Key Security** | Exposed in app bundle | Server-side only | Backend |
| **Cost Control** | No rate limiting per user | Full quota management | Backend |
| **Offline Support** | Works offline | Requires network for AI features | Tie (AI always needs network) |
| **Sync Across Devices** | Not possible | Full sync capability | Backend |
| **App Store Review** | May flag API key in bundle | Clean | Backend |
| **Development Speed** | Faster MVP | More infrastructure | No Backend |
| **Operational Cost** | $0/month | $5-50/month | No Backend |

**Recommendation**: Implement backend for **Phase 1 MVP** with these priorities:
1. Video-to-recipe extraction (primary driver)
2. Centralized Gemini API management
3. Future-proof for sync and multi-device

---

## Part 1: Architecture Decision Record (ADR)

### ADR-001: Backend vs Direct API

**Context**: DishFlow needs video processing capabilities. Gemini can analyze videos, but:
- TikTok/Instagram URLs require yt-dlp download first
- API keys shouldn't ship in mobile app bundles
- Future features (sync, sharing) require server state

**Decision**: Build independent backend service in Go.

**Consequences**:
- (+) Full video platform support via yt-dlp
- (+) API keys never leave server
- (+) Foundation for sync, sharing, collaboration
- (+) Rate limiting, cost control, usage analytics
- (-) Additional infrastructure to maintain
- (-) Network dependency for AI features
- (-) Added latency for API calls

### ADR-002: Go vs Python

**Context**: Both are viable. Python has better ML/AI ecosystem, Go has better performance/deployment.

| Criteria | Go | Python | Notes |
|----------|-----|--------|-------|
| Performance | Excellent | Good | Go 10x faster for concurrent requests |
| Deployment | Single binary | Virtual env + deps | Go dramatically simpler |
| Gemini SDK | Official SDK available | Official SDK available | Tie |
| yt-dlp integration | Shell exec / CGO | Native library | Python easier |
| Memory footprint | ~10-50MB | ~100-500MB | Go wins for cost |
| Team expertise | Assumed good | Assumed good | Depends on team |
| Concurrency | Goroutines (excellent) | asyncio (good) | Go wins |

**Decision**: **Go** for the main API server, with Python microservice for video download if yt-dlp integration proves difficult in Go.

**Rationale**:
- Single binary deployment (no Python version conflicts)
- Lower memory = cheaper hosting
- Excellent concurrency for handling multiple video processing jobs
- yt-dlp can be called via `exec.Command()` (yt-dlp is a CLI tool anyway)

### ADR-003: REST vs GraphQL vs gRPC

**Context**: Mobile clients need efficient API communication.

| Criteria | REST | GraphQL | gRPC |
|----------|------|---------|------|
| Payload efficiency | Good (with field selection) | Excellent (query what you need) | Excellent (protobuf) |
| Caching | Excellent (HTTP caching) | Complex (POST requests) | Complex |
| Mobile SDK support | Universal | Requires Apollo/Relay | Requires protobuf |
| Learning curve | Low | Medium | Medium-High |
| Tooling | Mature | Mature | Mature |
| Streaming | SSE/WebSocket | Subscriptions | Native |

**Decision**: **REST** with JSON for v1, evaluate GraphQL for v2 if payload optimization needed.

**Rationale**:
- REST is universally understood
- HTTP caching works out of the box
- React Native has excellent REST support (fetch, axios)
- Streaming via SSE for long-running video processing
- GraphQL overhead not justified for current API surface

---

## Part 2: System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│   │  iOS App     │    │ Android App  │    │  Web (future)│             │
│   │  (Expo)      │    │  (Expo)      │    │  (React)     │             │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘             │
│          │                   │                   │                      │
│          └───────────────────┼───────────────────┘                      │
│                              │ HTTPS                                    │
│                              ▼                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                         EDGE LAYER                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                    Cloudflare / API Gateway                       │  │
│   │  • TLS Termination                                                │  │
│   │  • DDoS Protection                                                │  │
│   │  • Rate Limiting (per IP)                                         │  │
│   │  • Geographic Routing                                             │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                       APPLICATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                    DishFlow API Server (Go)                       │  │
│   │                                                                   │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │
│   │  │   Auth      │  │   Recipes   │  │   Video     │              │  │
│   │  │   Handler   │  │   Handler   │  │   Handler   │              │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘              │  │
│   │                                                                   │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │
│   │  │   Pantry    │  │   Shopping  │  │   Sync      │              │  │
│   │  │   Handler   │  │   Handler   │  │   Handler   │              │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘              │  │
│   │                                                                   │  │
│   │  ┌───────────────────────────────────────────────────────────┐  │  │
│   │  │                    Service Layer                           │  │  │
│   │  │  • VideoProcessor  • RecipeExtractor  • AIService          │  │  │
│   │  │  • SyncService     • UserService      • NotificationSvc    │  │  │
│   │  └───────────────────────────────────────────────────────────┘  │  │
│   │                                                                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│          │                   │                   │                      │
│          ▼                   ▼                   ▼                      │
├─────────────────────────────────────────────────────────────────────────┤
│                       EXTERNAL SERVICES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│   │  Gemini API  │    │  yt-dlp      │    │  Redis       │             │
│   │  (AI/Vision) │    │  (video dl)  │    │  (cache/jobs)│             │
│   └──────────────┘    └──────────────┘    └──────────────┘             │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                      PostgreSQL                                   │  │
│   │  • Users, Auth tokens                                             │  │
│   │  • Recipes (server copy for sync)                                 │  │
│   │  • Video processing jobs                                          │  │
│   │  • Usage quotas                                                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                      Object Storage (S3/R2)                       │  │
│   │  • Downloaded videos (temporary)                                  │  │
│   │  • Recipe images/thumbnails                                       │  │
│   │  • User uploads                                                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### API Server (Go)
```
cmd/
├── server/
│   └── main.go              # Entry point, server setup
│
internal/
├── config/
│   └── config.go            # Environment config, secrets
│
├── handler/                  # HTTP handlers (controllers)
│   ├── auth.go              # Login, register, refresh token
│   ├── recipes.go           # CRUD recipes, AI generation
│   ├── video.go             # Video-to-recipe extraction
│   ├── pantry.go            # Pantry sync
│   ├── shopping.go          # Shopping lists sync
│   └── sync.go              # Bidirectional sync endpoint
│
├── service/                  # Business logic
│   ├── ai/
│   │   ├── gemini.go        # Gemini API client wrapper
│   │   └── recipe_extractor.go  # Video-to-recipe logic
│   ├── video/
│   │   ├── downloader.go    # yt-dlp wrapper
│   │   └── processor.go     # Video processing orchestrator
│   ├── sync/
│   │   └── sync.go          # Conflict resolution, delta sync
│   └── user/
│       └── user.go          # User management
│
├── repository/               # Data access
│   ├── postgres/
│   │   ├── user.go
│   │   ├── recipe.go
│   │   └── video_job.go
│   └── redis/
│       ├── cache.go
│       └── job_queue.go
│
├── model/                    # Domain models
│   ├── user.go
│   ├── recipe.go
│   ├── ingredient.go
│   ├── video_job.go
│   └── sync.go
│
├── middleware/               # HTTP middleware
│   ├── auth.go              # JWT validation
│   ├── ratelimit.go         # Per-user rate limiting
│   ├── logging.go           # Request logging
│   └── cors.go              # CORS headers
│
└── pkg/                      # Shared utilities
    ├── validator/
    ├── errors/
    └── response/
```

### 2.3 Video Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    VIDEO-TO-RECIPE PIPELINE                              │
└─────────────────────────────────────────────────────────────────────────┘

Mobile App                     Go Backend                     External
───────────                    ──────────                     ────────

    │                              │                              │
    │  POST /api/v1/video/extract  │                              │
    │  { url: "youtube.com/..." }  │                              │
    │─────────────────────────────>│                              │
    │                              │                              │
    │  202 Accepted                │                              │
    │  { jobId: "abc123",          │                              │
    │    statusUrl: "/jobs/abc123" │                              │
    │    estimatedSeconds: 45 }    │                              │
    │<─────────────────────────────│                              │
    │                              │                              │
    │                              │  ┌────────────────────────┐  │
    │                              │  │ Background Worker      │  │
    │                              │  └───────────┬────────────┘  │
    │                              │              │               │
    │                              │              │ 1. Validate URL
    │                              │              │    (is it a video?)
    │                              │              │               │
    │                              │              │ 2. Check if YouTube
    │                              │              │    (Gemini native)
    │                              │              │    OR other platform
    │                              │              │    (needs download)
    │                              │              │               │
    │                              │              │───────────────────────>│
    │                              │              │    yt-dlp download     │
    │                              │              │    (TikTok/Instagram)  │
    │                              │              │<───────────────────────│
    │                              │              │    video.mp4           │
    │                              │              │               │
    │                              │              │ 3. Upload to Gemini    │
    │                              │              │    Files API (if large)│
    │                              │              │               │
    │                              │              │───────────────────────>│
    │                              │              │  Gemini generateContent│
    │                              │              │  with video + schema   │
    │                              │              │<───────────────────────│
    │                              │              │  Structured recipe JSON│
    │                              │              │               │
    │                              │              │ 4. Post-process:       │
    │                              │              │    - Validate schema   │
    │                              │              │    - Match ingredients │
    │                              │              │      to common items   │
    │                              │              │    - Extract thumbnail │
    │                              │              │    - Store result      │
    │                              │              │               │
    │                              │              │ 5. Update job status   │
    │                              │  ┌───────────┴────────────┐  │
    │                              │  │ Job: COMPLETED         │  │
    │                              │  │ Result: {...recipe}    │  │
    │                              │  └────────────────────────┘  │
    │                              │                              │
    │  GET /api/v1/jobs/abc123     │                              │
    │  (polling or SSE stream)     │                              │
    │─────────────────────────────>│                              │
    │                              │                              │
    │  200 OK                      │                              │
    │  { status: "completed",      │                              │
    │    recipe: {                 │                              │
    │      title: "...",           │                              │
    │      ingredients: [...],     │                              │
    │      steps: [...]            │                              │
    │    }                         │                              │
    │  }                           │                              │
    │<─────────────────────────────│                              │
    │                              │                              │
```

---

## Part 3: API Contract Design

### 3.1 API Versioning Strategy

**Decision**: URL-based versioning (`/api/v1/...`)

**Rationale**:
- Explicit, visible in logs and debugging
- Easy to route different versions to different handlers
- Mobile apps may run old versions for years

### 3.2 Authentication

**Flow**: JWT with refresh tokens

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUTH FLOW                                        │
└─────────────────────────────────────────────────────────────────────────┘

1. REGISTRATION
   POST /api/v1/auth/register
   { email, password, name }
   → { user, accessToken (15min), refreshToken (30 days) }

2. LOGIN
   POST /api/v1/auth/login
   { email, password }
   → { user, accessToken, refreshToken }

3. TOKEN REFRESH (silent, before access token expires)
   POST /api/v1/auth/refresh
   { refreshToken }
   → { accessToken, refreshToken (rotated) }

4. LOGOUT
   POST /api/v1/auth/logout
   Authorization: Bearer <accessToken>
   { refreshToken }
   → 204 No Content (invalidates refresh token)

5. ANONYMOUS MODE (for users who don't want accounts)
   POST /api/v1/auth/anonymous
   → { deviceId, accessToken (90 days), isAnonymous: true }
   Note: Anonymous users can later upgrade to full account
```

**Anonymous User Quota Abuse Prevention**:
```
SECURITY: Quotas are tracked per ACCOUNT ID, not per device.

Flow:
1. First app launch → POST /auth/anonymous → creates user_id="usr_xyz"
2. Quotas tracked against usr_xyz in database
3. App reinstall → same device_id → POST /auth/anonymous
   → Backend looks up existing user by device_id → returns same usr_xyz
4. Quota NOT reset

Additional protections:
- IP-based rate limiting on /auth/anonymous (10/hour per IP)
- Device fingerprinting stored in anonymous user record
- Suspicious patterns flagged (many anonymous accounts, same IP)

When anonymous user upgrades to full account:
- user_id stays the same (usr_xyz)
- All quotas transfer (no reset)
- is_anonymous flag set to false
```

**Token Structure**:
```go
type Claims struct {
    UserID     string `json:"uid"`
    Email      string `json:"email,omitempty"`
    IsAnonymous bool  `json:"anon,omitempty"`
    DeviceID   string `json:"did,omitempty"`
    jwt.RegisteredClaims
}
```

### 3.3 Endpoint Specification

#### 3.3.1 Video Extraction

```yaml
# POST /api/v1/video/extract
# Start video-to-recipe extraction job

Request:
  Headers:
    Authorization: Bearer <token>
    Idempotency-Key: <uuid>  # Prevents duplicate jobs
    Content-Type: application/json
  Body:
    url: string              # Video URL (required)
    language: string         # "en" | "fr" | "es" | "auto" (default: "auto")
    detailLevel: string      # "quick" | "detailed" (default: "detailed")

Response (202 Accepted):
  jobId: string              # UUID for polling
  status: "pending"
  statusUrl: string          # "/api/v1/jobs/{jobId}"
  streamUrl: string          # "/api/v1/jobs/{jobId}/stream" (SSE)
  estimatedSeconds: number   # Rough estimate based on video length
  createdAt: string          # ISO 8601

Error Responses:
  400 Bad Request:
    code: "INVALID_URL" | "UNSUPPORTED_PLATFORM"
    message: string
  401 Unauthorized:
    code: "TOKEN_EXPIRED" | "INVALID_TOKEN"
  429 Too Many Requests:
    code: "RATE_LIMITED"
    retryAfter: number       # seconds
  503 Service Unavailable:
    code: "GEMINI_UNAVAILABLE" | "PROCESSING_QUEUE_FULL"
```

```yaml
# GET /api/v1/jobs/{jobId}
# Poll job status

Response (200 OK - Pending):
  jobId: string
  status: "pending" | "downloading" | "processing" | "extracting"
  progress: number           # 0-100
  message: string            # Human-readable status
  updatedAt: string

Response (200 OK - Completed):
  jobId: string
  status: "completed"
  recipe:
    title: string
    description: string
    servings: number
    prepTime: number         # minutes
    cookTime: number         # minutes
    difficulty: "easy" | "medium" | "hard"
    cuisine: string
    sourceUrl: string
    thumbnailUrl: string
    ingredients:
      - name: string
        quantity: number
        unit: string
        category: string     # matches DishFlow's 12 categories
        isOptional: boolean
        notes: string
    steps:
      - stepNumber: number
        instruction: string
        durationSeconds: number
        technique: string
        temperature: string
        videoTimestamp:
          start: number      # seconds
          end: number
  completedAt: string
  processingTimeMs: number

Response (200 OK - Failed):
  jobId: string
  status: "failed"
  error:
    code: "VIDEO_TOO_LONG" | "NOT_A_RECIPE" | "EXTRACTION_FAILED" | "DOWNLOAD_FAILED"
    message: string
    retryable: boolean
  failedAt: string
```

```yaml
# GET /api/v1/jobs/{jobId}/stream
# SSE stream for real-time progress (alternative to polling)

Event Stream:
  event: progress
  data: { status: "downloading", progress: 15, message: "Downloading video..." }

  event: progress
  data: { status: "processing", progress: 40, message: "Analyzing audio..." }

  event: progress
  data: { status: "extracting", progress: 75, message: "Extracting ingredients..." }

  event: complete
  data: { status: "completed", recipe: {...} }

  event: error
  data: { status: "failed", error: {...} }
```

#### 3.3.2 Recipes

```yaml
# GET /api/v1/recipes
# List user's recipes with pagination

Request:
  Headers:
    Authorization: Bearer <token>
  Query:
    cursor: string           # Cursor for pagination (opaque)
    limit: number            # 1-100, default 20
    sort: string             # "created" | "updated" | "title"
    order: string            # "asc" | "desc"
    search: string           # Full-text search
    cuisine: string          # Filter by cuisine
    difficulty: string       # Filter by difficulty

Response (200 OK):
  recipes:
    - id: string
      title: string
      description: string
      thumbnailUrl: string
      difficulty: string
      totalTime: number
      cuisine: string
      ingredientCount: number
      sourceType: string     # "manual" | "video" | "ai" | "photo"
      createdAt: string
      updatedAt: string
  pagination:
    nextCursor: string       # null if no more pages
    hasMore: boolean
    totalCount: number       # Only if requested with ?count=true
```

```yaml
# GET /api/v1/recipes/{id}
# Get full recipe details

Response (200 OK):
  id: string
  title: string
  description: string
  servings: number
  prepTime: number
  cookTime: number
  totalTime: number
  difficulty: string
  cuisine: string
  thumbnailUrl: string
  sourceType: string
  sourceUrl: string          # Original video URL if from video
  sourceMetadata:
    channelName: string
    videoTitle: string
  ingredients:
    - id: string
      name: string
      quantity: number
      unit: string
      category: string
      isOptional: boolean
      notes: string
      videoTimestamp: number # When mentioned in video
  steps:
    - id: string
      stepNumber: number
      instruction: string
      durationSeconds: number
      technique: string
      temperature: string
      videoTimestamp:
        start: number
        end: number
  tags: string[]
  createdAt: string
  updatedAt: string
  syncVersion: number        # For conflict detection
```

```yaml
# POST /api/v1/recipes
# Create new recipe

Request:
  Headers:
    Authorization: Bearer <token>
    Idempotency-Key: <uuid>
  Body:
    title: string
    description: string
    servings: number
    prepTime: number
    cookTime: number
    difficulty: string
    cuisine: string
    ingredients: [...]
    steps: [...]
    tags: string[]

Response (201 Created):
  id: string
  ... (full recipe object)
```

```yaml
# PUT /api/v1/recipes/{id}
# Update recipe (full replace)

Request:
  Headers:
    Authorization: Bearer <token>
    If-Match: <syncVersion>  # Optimistic locking
  Body:
    ... (full recipe object)

Response (200 OK):
  ... (updated recipe)

Response (409 Conflict):
  code: "VERSION_CONFLICT"
  message: "Recipe was modified by another client"
  serverVersion:
    ... (current server state)
  yourVersion:
    ... (what you tried to save)
```

```yaml
# DELETE /api/v1/recipes/{id}
# Soft delete recipe

Response (204 No Content)

# Hard delete after 30 days, or:
# DELETE /api/v1/recipes/{id}?permanent=true
```

#### 3.3.3 Sync Endpoint

```yaml
# POST /api/v1/sync
# Bidirectional sync for offline-first

Request:
  Headers:
    Authorization: Bearer <token>
  Body:
    lastSyncAt: string       # ISO 8601, last successful sync
    deviceId: string         # Unique device identifier
    changes:
      recipes:
        created: Recipe[]    # New recipes created offline
        updated: Recipe[]    # Modified recipes (with syncVersion)
        deleted: string[]    # IDs of deleted recipes
      pantryItems:
        created: PantryItem[]
        updated: PantryItem[]
        deleted: string[]
      shoppingLists:
        created: ShoppingList[]
        updated: ShoppingList[]
        deleted: string[]
      shoppingItems:
        created: ShoppingItem[]
        updated: ShoppingItem[]
        deleted: string[]

Response (200 OK):
  serverTime: string         # Use as lastSyncAt for next sync
  changes:
    recipes:
      created: Recipe[]      # New from other devices
      updated: Recipe[]      # Modified on server
      deleted: string[]      # Deleted on server
    pantryItems: ...
    shoppingLists: ...
    shoppingItems: ...
  conflicts:                 # Items that need manual resolution
    recipes:
      - localVersion: Recipe
        serverVersion: Recipe
        conflictType: "update_update" | "update_delete" | "delete_update"
        suggestedResolution: "keep_local" | "keep_server" | "merge"
    pantryItems: ...
  quotaUsage:
    recipesUsed: number
    recipesLimit: number
    videoExtractionsToday: number
    videoExtractionsLimit: number
```

#### 3.3.4 Pantry AI Scan

```yaml
# POST /api/v1/pantry/scan
# Scan pantry images to detect items

Request:
  Headers:
    Authorization: Bearer <token>
    Content-Type: multipart/form-data
  Body:
    images: File[]           # Up to 5 images
    existingItems: string[]  # IDs of items already in pantry (for deduplication)

Response (200 OK):
  detectedItems:
    - name: string
      quantity: number
      unit: string
      category: string
      confidence: number     # 0-1
      matchedCommonItem:     # If matched to catalog
        id: string
        name: string
      boundingBox:           # Optional, for UI highlight
        x: number
        y: number
        width: number
        height: number
      imageIndex: number     # Which image (0-indexed)
  processingTimeMs: number
```

#### 3.3.5 Subscription & Billing (RevenueCat Integration)

```yaml
# GET /api/v1/subscription
# Get current subscription status and quotas

Request:
  Headers:
    Authorization: Bearer <token>

Response (200 OK):
  entitlement: "free" | "pro"
  expiresAt: string           # ISO 8601, null if free
  willRenew: boolean
  productId: string           # e.g., "dishflow_pro_monthly"
  store: "APP_STORE" | "PLAY_STORE"
  trialEndsAt: string         # If in trial period
  quotas:
    videoExtractions:
      used: number
      limit: number           # -1 = unlimited
      resetsAt: string        # ISO 8601
    pantryScans:
      used: number
      limit: number
      resetsAt: string
    recipes:
      count: number
      limit: number

# POST /api/v1/subscription/refresh
# Force refresh subscription status from RevenueCat

Request:
  Headers:
    Authorization: Bearer <token>

Response (200 OK):
  # Same as GET /subscription

# POST /api/v1/webhooks/revenuecat
# RevenueCat webhook receiver (server-to-server)

Request:
  Headers:
    X-RevenueCat-Signature: <hmac-signature>
  Body:
    # RevenueCat webhook payload

Response (200 OK):
  # Always return 200 to acknowledge receipt
  # Processing happens asynchronously
```

### 3.4 Input Validation Constraints

**SECURITY: All inputs must be validated to prevent DoS and injection attacks.**

```yaml
# Video Extraction
video_url:
  max_length: 2048 characters
  allowed_schemes: ["https"]
  allowed_domains: ["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "vimeo.com"]

# Recipe
recipe:
  title:
    max_length: 200 characters
    required: true
  description:
    max_length: 5000 characters
  servings:
    min: 1
    max: 100
  prep_time:
    max: 10080 minutes (1 week)
  cook_time:
    max: 10080 minutes (1 week)
  ingredients:
    max_count: 100 items per recipe
    name_max_length: 200 characters
    notes_max_length: 500 characters
  steps:
    max_count: 50 steps per recipe
    instruction_max_length: 2000 characters
  tags:
    max_count: 20 tags
    tag_max_length: 50 characters

# Pantry/Shopping
item_name:
  max_length: 200 characters
quantity:
  max: 99999.999
unit:
  max_length: 50 characters

# Image Uploads
image:
  max_size: 10 MB
  allowed_types: ["image/jpeg", "image/png", "image/webp"]
  max_dimensions: 4096x4096 pixels

# Sync Batch Limits (prevents DoS via oversized payloads)
sync_request:
  max_recipes_per_batch: 100
  max_pantry_items_per_batch: 500
  max_shopping_items_per_batch: 500
  max_total_payload_size: 5 MB
```

### 3.5 Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message for developers",
    "details": {
      "field": "specific field that caused error",
      "reason": "validation_failed"
    },
    "requestId": "uuid-for-support",
    "timestamp": "2026-01-31T12:00:00Z"
  }
}
```

**Standard Error Codes**:
| HTTP | Code | Description |
|------|------|-------------|
| 400 | `VALIDATION_FAILED` | Request body/params invalid |
| 400 | `INVALID_URL` | Video URL malformed or unsupported |
| 401 | `TOKEN_EXPIRED` | Access token expired, refresh needed |
| 401 | `INVALID_TOKEN` | Token malformed or revoked |
| 403 | `FORBIDDEN` | Valid token but no permission |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `VERSION_CONFLICT` | Optimistic locking failed |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error (we log, user retries) |
| 503 | `SERVICE_UNAVAILABLE` | Downstream service down |

### 3.6 Rate Limiting

```yaml
# Rate limit headers on every response
X-RateLimit-Limit: 100          # Requests per window
X-RateLimit-Remaining: 95       # Remaining in current window
X-RateLimit-Reset: 1706700000   # Unix timestamp when window resets

# Per-endpoint limits (per user)
/api/v1/video/extract: 10/day   # Video extraction is expensive
/api/v1/pantry/scan: 50/day     # Image scanning
/api/v1/recipes/*: 1000/hour    # General CRUD
/api/v1/sync: 100/hour          # Sync operations

# IP-based limits (at Cloudflare edge layer)
# SECURITY: Prevents abuse via anonymous session creation
/api/v1/auth/anonymous:
  per_ip: 10/hour               # Max 10 anonymous sessions per IP per hour
  per_ip_daily: 50/day          # Max 50 per day
  burst: 5                      # Max 5 rapid requests

# Anonymous user quota tracking
# SECURITY: Quotas tracked per account ID, not device
# When anonymous user creates account, quotas transfer
# Prevents quota reset via app reinstall
```

---

## Part 4: Database Schema

### 4.1 PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(255),  -- For anonymous users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- Soft delete
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_device ON users(device_id) WHERE is_anonymous = TRUE;

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,  -- Hashed token
    device_name VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

-- Recipes
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    servings INTEGER,
    prep_time INTEGER,  -- minutes
    cook_time INTEGER,  -- minutes
    difficulty VARCHAR(20),  -- easy, medium, hard
    cuisine VARCHAR(100),
    thumbnail_url TEXT,
    source_type VARCHAR(20) DEFAULT 'manual',  -- manual, video, ai, photo
    source_url TEXT,
    source_metadata JSONB,  -- { channelName, videoTitle, etc }
    tags TEXT[],
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_recipes_user ON recipes(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_updated ON recipes(user_id, updated_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_search ON recipes USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Recipe ingredients
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3),
    unit VARCHAR(50),
    category VARCHAR(50) NOT NULL,  -- DishFlow's 12 categories
    is_optional BOOLEAN DEFAULT FALSE,
    notes TEXT,
    video_timestamp INTEGER,  -- seconds into video
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- Recipe steps
CREATE TABLE recipe_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    duration_seconds INTEGER,
    technique VARCHAR(100),
    temperature VARCHAR(50),
    video_timestamp_start INTEGER,
    video_timestamp_end INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id);

-- Video processing jobs
CREATE TABLE video_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    video_url TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'auto',
    detail_level VARCHAR(20) DEFAULT 'detailed',
    status VARCHAR(20) DEFAULT 'pending',  -- pending, downloading, processing, extracting, completed, failed
    progress INTEGER DEFAULT 0,
    status_message TEXT,
    result_recipe_id UUID REFERENCES recipes(id),
    error_code VARCHAR(50),
    error_message TEXT,
    idempotency_key VARCHAR(255),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_jobs_user ON video_jobs(user_id);
CREATE INDEX idx_video_jobs_idempotency ON video_jobs(user_id, idempotency_key);
CREATE INDEX idx_video_jobs_status ON video_jobs(status) WHERE status IN ('pending', 'downloading', 'processing', 'extracting');

-- Pantry items (server copy for sync)
CREATE TABLE pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity DECIMAL(10, 3),
    unit VARCHAR(50),
    expiration_date DATE,
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pantry_items_user ON pantry_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pantry_items_sync ON pantry_items(user_id, updated_at) WHERE deleted_at IS NULL;

-- Shopping lists
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_template BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_shopping_lists_user ON shopping_lists(user_id) WHERE deleted_at IS NULL;

-- Shopping items
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3),
    unit VARCHAR(50),
    category VARCHAR(50),
    is_checked BOOLEAN DEFAULT FALSE,
    recipe_name VARCHAR(255),  -- If added from a recipe
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_shopping_items_list ON shopping_items(list_id) WHERE deleted_at IS NULL;

-- Usage quotas
CREATE TABLE usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    quota_type VARCHAR(50) NOT NULL,  -- video_extractions, pantry_scans
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    used INTEGER DEFAULT 0,
    limit_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usage_quotas_unique ON usage_quotas(user_id, quota_type, period_start);
```

### 4.2 Redis Schema

```
# Session/Token Store
auth:token:{userId}:{tokenId} -> { refreshToken hash, expiresAt, deviceName }
TTL: 30 days

# Rate Limiting
ratelimit:{userId}:{endpoint} -> counter
TTL: based on window (1 hour or 1 day)

# Job Queue
jobs:pending -> sorted set (jobId, priority)
jobs:processing:{workerId} -> set of jobIds being processed
jobs:data:{jobId} -> hash { status, progress, result, error }
TTL: 24 hours after completion

# Cache
cache:recipe:{recipeId} -> serialized recipe JSON
TTL: 1 hour

cache:user:{userId}:quota -> { videoExtractions: 5, pantryScans: 20 }
TTL: until midnight

# Video Download Dedup
video:downloading:{urlHash} -> jobId (prevents duplicate downloads)
TTL: 1 hour
```

---

## Part 5: Sync Strategy (Offline-First)

### 5.1 Conflict Resolution

DishFlow uses **Last-Write-Wins (LWW)** for all data in MVP, with notifications for recipe conflicts.

```
Conflict Resolution Matrix (MVP - Simplified):

╔════════════════════╤═══════════════════════════════════════════════════╗
║ Conflict Type      │ Resolution Strategy                                ║
╠════════════════════╪═══════════════════════════════════════════════════╣
║ Pantry Items       │ Last-Write-Wins (LWW) - low value, high frequency ║
╟────────────────────┼───────────────────────────────────────────────────╢
║ Shopping Items     │ Last-Write-Wins (LWW) - transient data            ║
╟────────────────────┼───────────────────────────────────────────────────╢
║ Shopping Lists     │ LWW for metadata, merge for items (union)         ║
╟────────────────────┼───────────────────────────────────────────────────╢
║ Recipes (MVP)      │ Server-wins with notification to user             ║
║                    │ - Toast: "Recipe updated on another device"       ║
║                    │ - Local changes saved to "drafts" for review      ║
╟────────────────────┼───────────────────────────────────────────────────╢
║ Recipes (Future)   │ Manual resolution with diff UI (post-MVP)         ║
║                    │ - Show side-by-side comparison                    ║
║                    │ - Options: Keep local, Keep server, Merge         ║
╚════════════════════╧═══════════════════════════════════════════════════╝

NOTE: Three-way merge UI deferred to v1.1 to reduce MVP complexity.
MVP approach: Server-wins is acceptable for single-user scenarios.
Multi-device conflicts will be rare for individual users.
```

### 5.2 Sync Flow

```go
// Simplified sync algorithm (server-side)

func (s *SyncService) Sync(ctx context.Context, req SyncRequest) (*SyncResponse, error) {
    user := auth.UserFromContext(ctx)

    // 1. Get all server changes since last sync
    serverChanges, err := s.repo.GetChangesSince(user.ID, req.LastSyncAt)
    if err != nil {
        return nil, err
    }

    // 2. Apply client changes, detect conflicts
    var conflicts []Conflict
    for _, change := range req.Changes.Recipes.Updated {
        serverVersion, err := s.repo.GetRecipe(change.ID)
        if err != nil {
            continue
        }

        if serverVersion.SyncVersion > change.SyncVersion {
            // Conflict: server was updated after client's version
            conflicts = append(conflicts, Conflict{
                LocalVersion:  change,
                ServerVersion: serverVersion,
                ConflictType:  "update_update",
            })
            continue
        }

        // No conflict, apply change
        change.SyncVersion = serverVersion.SyncVersion + 1
        s.repo.UpdateRecipe(change)
    }

    // 3. Apply creates (always succeed, generate server ID)
    for _, recipe := range req.Changes.Recipes.Created {
        recipe.ID = uuid.New().String()
        recipe.SyncVersion = 1
        s.repo.CreateRecipe(recipe)
    }

    // 4. Apply deletes (soft delete)
    for _, id := range req.Changes.Recipes.Deleted {
        s.repo.SoftDeleteRecipe(id)
    }

    return &SyncResponse{
        ServerTime: time.Now().UTC(),
        Changes:    serverChanges,
        Conflicts:  conflicts,
    }, nil
}
```

### 5.3 Client-Side Sync Manager

```typescript
// React Native sync manager (simplified)

class SyncManager {
  private lastSyncAt: string | null = null;
  private pendingChanges: ChangeSet = { recipes: [], pantryItems: [], ... };

  async queueChange(type: 'recipe' | 'pantry', action: 'create' | 'update' | 'delete', data: any) {
    // Store in SQLite pending_changes table
    await db.insertPendingChange({ type, action, data, createdAt: new Date() });
  }

  async sync(): Promise<SyncResult> {
    // 1. Gather all pending changes from SQLite
    const pendingChanges = await db.getPendingChanges();

    // 2. Call server sync endpoint
    const response = await api.post('/sync', {
      lastSyncAt: this.lastSyncAt,
      deviceId: this.deviceId,
      changes: this.formatChanges(pendingChanges),
    });

    // 3. Apply server changes to local SQLite
    for (const recipe of response.changes.recipes.created) {
      await db.upsertRecipe(recipe);
    }
    // ... repeat for updates, deletes, other types

    // 4. Handle conflicts (prompt user or auto-resolve)
    if (response.conflicts.length > 0) {
      await this.resolveConflicts(response.conflicts);
    }

    // 5. Clear synced pending changes
    await db.clearPendingChanges(pendingChanges.map(c => c.id));

    // 6. Update sync timestamp
    this.lastSyncAt = response.serverTime;
    await AsyncStorage.setItem('lastSyncAt', this.lastSyncAt);

    return { success: true, conflictsResolved: response.conflicts.length };
  }
}
```

---

## Part 6: Gemini Integration

### 6.1 Gemini Client (Go)

```go
package ai

import (
    "context"
    "encoding/json"

    "github.com/google/generative-ai-go/genai"
    "google.golang.org/api/option"
)

type GeminiClient struct {
    client *genai.Client
    model  *genai.GenerativeModel
}

func NewGeminiClient(apiKey string) (*GeminiClient, error) {
    ctx := context.Background()
    client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
    if err != nil {
        return nil, err
    }

    model := client.GenerativeModel("gemini-2.0-flash")

    // Configure for structured output
    model.ResponseMIMEType = "application/json"
    model.ResponseSchema = &genai.Schema{
        Type: genai.TypeObject,
        Properties: map[string]*genai.Schema{
            "title":       {Type: genai.TypeString},
            "description": {Type: genai.TypeString},
            "servings":    {Type: genai.TypeInteger},
            "prepTime":    {Type: genai.TypeInteger},
            "cookTime":    {Type: genai.TypeInteger},
            "difficulty": {
                Type: genai.TypeString,
                Enum: []string{"easy", "medium", "hard"},
            },
            "cuisine": {Type: genai.TypeString},
            "ingredients": {
                Type: genai.TypeArray,
                Items: &genai.Schema{
                    Type: genai.TypeObject,
                    Properties: map[string]*genai.Schema{
                        "name":       {Type: genai.TypeString},
                        "quantity":   {Type: genai.TypeNumber},
                        "unit":       {Type: genai.TypeString},
                        "category": {
                            Type: genai.TypeString,
                            Enum: []string{
                                "dairy", "produce", "proteins", "bakery",
                                "pantry", "spices", "condiments", "beverages",
                                "snacks", "frozen", "household", "other",
                            },
                        },
                        "isOptional": {Type: genai.TypeBoolean},
                        "notes":      {Type: genai.TypeString},
                    },
                    Required: []string{"name", "quantity", "unit", "category"},
                },
            },
            "steps": {
                Type: genai.TypeArray,
                Items: &genai.Schema{
                    Type: genai.TypeObject,
                    Properties: map[string]*genai.Schema{
                        "stepNumber":           {Type: genai.TypeInteger},
                        "instruction":          {Type: genai.TypeString},
                        "durationSeconds":      {Type: genai.TypeInteger},
                        "technique":            {Type: genai.TypeString},
                        "temperature":          {Type: genai.TypeString},
                        "videoTimestampStart":  {Type: genai.TypeNumber},
                        "videoTimestampEnd":    {Type: genai.TypeNumber},
                    },
                    Required: []string{"stepNumber", "instruction"},
                },
            },
            "tags": {
                Type:  genai.TypeArray,
                Items: &genai.Schema{Type: genai.TypeString},
            },
        },
        Required: []string{"title", "ingredients", "steps"},
    }

    return &GeminiClient{client: client, model: model}, nil
}

func (g *GeminiClient) ExtractRecipeFromVideo(ctx context.Context, videoURI string) (*ExtractedRecipe, error) {
    prompt := `You are a professional chef and recipe extraction expert.
Analyze this cooking video completely — watch and listen to the ENTIRE video.

Extract a full structured recipe including:
- Recipe title and description
- All ingredients with exact quantities, units, and categories
- Step-by-step instructions mapped to video timestamps
- Cooking techniques, temperatures, and timing for each step

Rules:
- If the chef says "a pinch of salt", estimate: quantity=0.25, unit="tsp"
- If the chef says "some olive oil", estimate: quantity=1, unit="tbsp"
- Map every ingredient to exactly one of the 12 category values
- Video timestamps should be in seconds from start`

    // Create video part
    videoPart := genai.FileData{
        MIMEType: "video/mp4",
        URI:      videoURI,  // gs:// URI or uploaded file URI
    }

    resp, err := g.model.GenerateContent(ctx, genai.Text(prompt), videoPart)
    if err != nil {
        return nil, err
    }

    // Response is guaranteed to be valid JSON matching our schema
    var recipe ExtractedRecipe
    if err := json.Unmarshal([]byte(resp.Candidates[0].Content.Parts[0].(genai.Text)), &recipe); err != nil {
        return nil, err
    }

    return &recipe, nil
}

func (g *GeminiClient) Close() error {
    return g.client.Close()
}
```

### 6.2 Video Processing Service

```go
package video

import (
    "context"
    "os/exec"
    "path/filepath"
    "time"
)

type VideoProcessor struct {
    gemini     *ai.GeminiClient
    storage    *storage.Client
    tempDir    string
}

type ProcessResult struct {
    Recipe       *ai.ExtractedRecipe
    ThumbnailURL string
    Duration     int
}

// Retry configuration for Gemini API calls
const (
    maxRetries     = 3
    initialBackoff = 1 * time.Second
    maxBackoff     = 8 * time.Second
)

func (v *VideoProcessor) Process(ctx context.Context, job *model.VideoJob) (*ProcessResult, error) {
    // 1. Determine if we need to download
    needsDownload := !isYouTubeURL(job.VideoURL)

    var videoURI string

    if needsDownload {
        // 2a. Download via yt-dlp (TikTok, Instagram, etc.)
        localPath, err := v.downloadVideo(ctx, job.VideoURL)
        if err != nil {
            return nil, fmt.Errorf("download failed: %w", err)
        }
        defer os.Remove(localPath)

        // 3. Upload to Gemini Files API
        videoURI, err = v.uploadToGemini(ctx, localPath)
        if err != nil {
            return nil, fmt.Errorf("upload failed: %w", err)
        }
    } else {
        // 2b. YouTube: Gemini can access directly
        videoURI = job.VideoURL
    }

    // 4. Extract recipe via Gemini with retry logic
    recipe, err := v.extractWithRetry(ctx, videoURI)
    if err != nil {
        return nil, fmt.Errorf("extraction failed: %w", err)
    }

    // 5. Extract and upload thumbnail
    thumbnailURL, err := v.extractThumbnail(ctx, job.VideoURL)
    if err != nil {
        // Non-fatal, continue without thumbnail
        log.Warn("thumbnail extraction failed", "error", err)
    }

    return &ProcessResult{
        Recipe:       recipe,
        ThumbnailURL: thumbnailURL,
    }, nil
}

func (v *VideoProcessor) downloadVideo(ctx context.Context, url string) (string, error) {
    outputPath := filepath.Join(v.tempDir, uuid.New().String()+".mp4")

    cmd := exec.CommandContext(ctx, "yt-dlp",
        "-f", "best[ext=mp4]/best",
        "-o", outputPath,
        "--no-playlist",
        "--max-filesize", "500M",
        url,
    )

    if err := cmd.Run(); err != nil {
        return "", err
    }

    return outputPath, nil
}

func isYouTubeURL(url string) bool {
    return strings.Contains(url, "youtube.com") || strings.Contains(url, "youtu.be")
}

// extractWithRetry implements exponential backoff for Gemini API failures
func (v *VideoProcessor) extractWithRetry(ctx context.Context, videoURI string) (*ai.ExtractedRecipe, error) {
    var lastErr error
    backoff := initialBackoff

    for attempt := 0; attempt < maxRetries; attempt++ {
        recipe, err := v.gemini.ExtractRecipeFromVideo(ctx, videoURI)
        if err == nil {
            return recipe, nil
        }

        lastErr = err

        // Don't retry on non-retryable errors
        if isNonRetryableError(err) {
            return nil, fmt.Errorf("extraction failed (non-retryable): %w", err)
        }

        // Log retry attempt
        log.Warn("Gemini extraction failed, retrying",
            "attempt", attempt+1,
            "max_attempts", maxRetries,
            "backoff", backoff,
            "error", err,
        )

        // Wait before retry (with context cancellation check)
        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        case <-time.After(backoff):
        }

        // Exponential backoff with cap
        backoff *= 2
        if backoff > maxBackoff {
            backoff = maxBackoff
        }
    }

    return nil, fmt.Errorf("extraction failed after %d attempts: %w", maxRetries, lastErr)
}

// isNonRetryableError checks if error should not be retried
func isNonRetryableError(err error) bool {
    errStr := err.Error()
    // Don't retry on invalid content, safety blocks, or quota exceeded
    return strings.Contains(errStr, "SAFETY") ||
           strings.Contains(errStr, "INVALID_ARGUMENT") ||
           strings.Contains(errStr, "NOT_A_RECIPE") ||
           strings.Contains(errStr, "quota")
}
```

---

## Part 7: Infrastructure & Deployment

### 7.1 Deployment Options

| Option | Cost/mo | Pros | Cons |
|--------|---------|------|------|
| **Railway** | $5-20 | Easy deploy, auto-scaling | Limited free tier |
| **Fly.io** | $5-20 | Global edge, great DX | Steeper learning curve |
| **Render** | $7-25 | Managed Postgres, simple | Slower cold starts |
| **DigitalOcean App Platform** | $5-25 | Simple, Postgres included | Less flexible |
| **AWS ECS Fargate** | $20-100 | Full AWS ecosystem | Complex, overkill for MVP |

**Recommendation**: **Railway** or **Fly.io** for MVP, migrate to AWS/GCP at scale.

### 7.2 Docker Configuration

```dockerfile
# Dockerfile
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Runtime image
FROM alpine:3.19

RUN apk add --no-cache ca-certificates ffmpeg python3 py3-pip
RUN pip3 install yt-dlp --break-system-packages

COPY --from=builder /server /server

EXPOSE 8080
CMD ["/server"]
```

### 7.3 Environment Configuration

```bash
# .env.production
PORT=8080
DATABASE_URL=postgres://user:pass@host:5432/dishflow?sslmode=require
REDIS_URL=redis://host:6379
GEMINI_API_KEY=your-gemini-api-key
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=720h
STORAGE_BUCKET=dishflow-assets
STORAGE_ENDPOINT=https://s3.amazonaws.com
LOG_LEVEL=info
CORS_ORIGINS=https://dishflow.app
RATE_LIMIT_VIDEO=10
RATE_LIMIT_SCAN=50
```

### 7.4 Health Check Endpoints

**Required for Kubernetes/Railway/Fly.io orchestration:**

```yaml
# Liveness probe - is the process alive?
GET /health
Response (200 OK):
  {
    "status": "ok",
    "timestamp": "2026-01-31T12:00:00Z"
  }

# Returns 200 if process is running
# Returns 503 if process is unhealthy
# Used by orchestrator to decide if container should be restarted

# Readiness probe - can this instance accept traffic?
GET /ready
Response (200 OK):
  {
    "status": "ready",
    "checks": {
      "postgres": "ok",
      "redis": "ok",
      "gemini": "ok"       # Optional: can be "degraded" if Gemini slow
    },
    "timestamp": "2026-01-31T12:00:00Z"
  }

Response (503 Service Unavailable):
  {
    "status": "not_ready",
    "checks": {
      "postgres": "failed",  # Connection refused
      "redis": "ok",
      "gemini": "ok"
    },
    "timestamp": "2026-01-31T12:00:00Z"
  }

# Returns 200 if all critical dependencies (postgres, redis) are reachable
# Returns 503 if any critical dependency is down
# Used by orchestrator to remove instance from load balancer

# API info endpoint
GET /api/v1/info
Response (200 OK):
  {
    "name": "DishFlow API",
    "version": "1.0.0",
    "environment": "production",
    "features": {
      "video_extraction": true,
      "ai_generation": true,
      "sync": true
    }
  }
```

```go
// Health check implementation
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status":    "ok",
        "timestamp": time.Now().UTC(),
    })
}

func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
    checks := make(map[string]string)

    // Check PostgreSQL
    if err := h.db.PingContext(r.Context()); err != nil {
        checks["postgres"] = "failed"
    } else {
        checks["postgres"] = "ok"
    }

    // Check Redis
    if err := h.redis.Ping(r.Context()).Err(); err != nil {
        checks["redis"] = "failed"
    } else {
        checks["redis"] = "ok"
    }

    // Check Gemini (optional, degraded is acceptable)
    checks["gemini"] = "ok" // Don't block on Gemini for readiness

    // Determine overall status
    status := "ready"
    httpStatus := http.StatusOK

    if checks["postgres"] == "failed" || checks["redis"] == "failed" {
        status = "not_ready"
        httpStatus = http.StatusServiceUnavailable
    }

    w.WriteHeader(httpStatus)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status":    status,
        "checks":    checks,
        "timestamp": time.Now().UTC(),
    })
}
```

---

## Part 8: Implementation Phases

### Phase 1: Core Backend (Week 1-2)

```
Priority: Get video-to-recipe working end-to-end

Tasks:
├── Project setup
│   ├── Go module, folder structure
│   ├── Docker + docker-compose for local dev
│   ├── CI/CD pipeline (GitHub Actions)
│   └── Environment config
│
├── Database
│   ├── PostgreSQL schema (users, recipes, jobs)
│   ├── Migrations with golang-migrate
│   └── Repository layer
│
├── Auth (simplified)
│   ├── Anonymous auth (device ID based)
│   ├── JWT generation/validation
│   └── Middleware
│
├── Video extraction
│   ├── POST /api/v1/video/extract
│   ├── GET /api/v1/jobs/{id}
│   ├── yt-dlp integration
│   ├── Gemini video analysis
│   └── Background worker (goroutines or Redis queue)
│
└── Mobile integration
    ├── Update DishFlow to call backend
    ├── Video URL input screen
    ├── Processing progress screen
    └── Review extracted recipe screen
```

### Phase 2: Full Recipe API (Week 3)

```
Priority: CRUD operations + mobile sync foundation

Tasks:
├── Recipe endpoints
│   ├── GET /api/v1/recipes (list with pagination)
│   ├── GET /api/v1/recipes/{id}
│   ├── POST /api/v1/recipes
│   ├── PUT /api/v1/recipes/{id}
│   └── DELETE /api/v1/recipes/{id}
│
├── Rate limiting
│   ├── Redis-based rate limiter
│   ├── Per-user quotas
│   └── Rate limit headers
│
└── Testing
    ├── Unit tests for services
    ├── Integration tests for handlers
    └── E2E test for video extraction
```

### Phase 3: Sync & Full Auth (Week 4)

```
Priority: Multi-device support, real accounts

Tasks:
├── Full auth
│   ├── Email/password registration
│   ├── Login
│   ├── Password reset
│   └── Anonymous → account upgrade
│
├── Sync endpoint
│   ├── POST /api/v1/sync
│   ├── Conflict detection
│   ├── Delta sync
│   └── Mobile SyncManager
│
├── Pantry & Shopping sync
│   ├── Pantry items table
│   ├── Shopping lists/items tables
│   └── Sync for all entity types
│
└── Production hardening
    ├── Structured logging
    ├── Error tracking (Sentry)
    ├── Metrics (Prometheus)
    └── Health checks
```

### Phase 4: Polish & Scale (Week 5+)

```
Priority: Production readiness

Tasks:
├── Pantry AI scan endpoint
│   ├── POST /api/v1/pantry/scan
│   └── Image upload handling
│
├── Performance optimization
│   ├── Connection pooling
│   ├── Query optimization
│   ├── Caching layer
│   └── CDN for thumbnails
│
├── Monitoring & Alerting
│   ├── Dashboard (Grafana)
│   ├── Alerts for errors, latency
│   └── Cost monitoring
│
└── Documentation
    ├── OpenAPI spec
    ├── Developer guide
    └── Deployment runbook
```

---

## Part 9: Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Gemini rate limits hit | Medium | High | Implement queue, backoff, caching |
| yt-dlp breaks (platform changes) | Medium | Medium | Monitor, have fallback, update frequently |
| Video processing timeout | Medium | Medium | Chunked processing for long videos |
| Sync conflicts | Low | High | Clear UI for conflict resolution |
| Database growth | Low | Medium | Archival policy, soft deletes, cleanup jobs |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Hosting costs spike | Low | Medium | Usage quotas, monitoring, alerts |
| API key leaked | Low | Critical | Key rotation, secrets management |
| Downtime | Low | High | Health checks, multiple replicas, monitoring |
| Data loss | Very Low | Critical | Backups, point-in-time recovery |

---

## Part 10: Cost Projections

### Infrastructure (per month)

| Service | Provider | Cost |
|---------|----------|------|
| API Server | Railway/Fly.io | $5-15 |
| PostgreSQL | Railway/Supabase | $0-10 |
| Redis | Upstash/Railway | $0-5 |
| Object Storage | Cloudflare R2 | $0-5 |
| Domain + SSL | Cloudflare | $0 |
| **Total (MVP)** | | **$5-35/month** |

### API Costs (per 1000 users)

| Operation | Frequency | Cost per user |
|-----------|-----------|---------------|
| Video extraction | 5/month | $0.15 (Gemini) |
| Pantry scan | 10/month | $0.05 (Gemini) |
| Storage | 50MB/month | $0.001 |
| Bandwidth | 100MB/month | $0.01 |
| **Total** | | **~$0.21/user/month** |

At 1000 users: ~$210/month API + ~$35 infra = **~$245/month**
At 10000 users: ~$2100/month API + ~$100 infra = **~$2200/month**

---

## Part 11: Decision Summary

### Recommended Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DISHFLOW BACKEND STACK                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Language:        Go 1.22+                                              │
│  Framework:       Chi (router) + standard library                       │
│  Database:        PostgreSQL 16                                         │
│  Cache:           Redis 7                                               │
│  Storage:         Cloudflare R2 (S3-compatible)                         │
│  AI:              Google Gemini 2.0 Flash                               │
│  Video Download:  yt-dlp (CLI)                                          │
│  Auth:            JWT (access + refresh tokens)                         │
│  Hosting:         Railway or Fly.io                                     │
│  CI/CD:           GitHub Actions                                        │
│  Monitoring:      Prometheus + Grafana (or Railway metrics)             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why This Is a Good Design

1. **Separation of Concerns**: Mobile app stays local-first, backend handles AI and sync
2. **Security**: API keys never leave the server, proper auth flow
3. **Scalability**: Stateless API server can scale horizontally
4. **Cost Efficiency**: Go's low memory footprint, efficient Gemini usage
5. **Mobile-Optimized**: Designed for unreliable networks, offline-first sync
6. **Future-Proof**: Foundation for sharing, collaboration, web client

### Proceed?

**Recommendation: YES, proceed with this architecture.**

The benefits (security, sync, full video platform support) outweigh the costs (infrastructure, complexity) for a production app targeting real users.

---

**Document Status**: Architecture Design Complete
**Next Step**: Begin Phase 1 implementation
**Last Updated**: 2026-01-31
