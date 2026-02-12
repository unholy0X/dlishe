# Dlishe - Technical Documentation

---

## Table of Contents

1. [Why These Choices](#why-these-choices)
2. [System Architecture](#system-architecture)
3. [Backend Deep Dive](#backend-deep-dive)
4. [Mobile App](#mobile-app)
5. [RevenueCat Integration](#revenuecat-integration)
6. [API Design](#api-design)
7. [Infrastructure](#infrastructure)

---

## Why These Choices

Before the architecture diagrams and code, I want to be honest about the **why** behind every major decision. Building a product solo during a hackathon means every choice has a cost, and I tried to be deliberate about where I spent that budget.

### Go for the Backend

I picked Go because I needed a backend that could handle **concurrent video processing, AI pipelines, and real time job polling** without collapsing under its own weight. Node.js would have been faster to prototype, but I knew from day one that Dlishe's core value is a CPU and IO bound workload. Go's goroutines gave me natural concurrency control (semaphore patterns for limiting simultaneous video downloads) without reaching for heavy infrastructure like message queues. The type system also saved me multiple times when evolving the job state machine. The compiler caught transitions I would have shipped as bugs in a dynamic language.

### PostgreSQL

Not a controversial pick, but the reasoning matters: Dlishe's data model is **deeply relational**. A recipe has ingredients, steps, nutrition, dietary info, tags, and belongs to a user who has a subscription, pantry items, shopping lists with their own items. Trying to model this in a document store would have meant either denormalizing everything (and dealing with sync nightmares) or reimplementing joins in application code. Postgres also gave me full text search on recipes for free via GIN indexes, so no need for a separate Elasticsearch instance.

I use `golang-migrate` for schema management (17 migrations and counting). Every migration is an `.up.sql` / `.down.sql` pair, version controlled, and runs automatically on deploy. No manual SQL scripts, no drift.

### Clerk for Authentication

I made a deliberate decision to **not build auth**. Clerk handles signup/signin, JWT issuance, token refresh, and session management on both mobile and web. My backend never sees a password. Every protected API request carries a Clerk JWT, which I verify server side using `clerk-sdk-go/v2`. This let me focus engineering time on the actual product instead of implementing password reset flows and rate limiting login attempts.


### RevenueCat for Subscriptions

RevenueCat was a requirement for this hackathon, but honestly I would have chosen it anyway. In app subscription management is a notoriously painful problem (receipt validation, grace periods, billing retries, cross platform entitlement sync). RevenueCat abstracts all of that behind a clean SDK and webhook system. My backend stores a cached copy of subscription state (so I'm never blocked on a RevenueCat API call during normal request flow) and stays in sync via webhooks plus periodic refresh.

---

## System Architecture

```
                                    DLISHE SYSTEM ARCHITECTURE

    +-------------------+          +-----------------------------------+          +------------------+
    |                   |  HTTPS   |                                   |          |                  |
    |   Mobile App      +--------->+         Go API Server             +--------->+   PostgreSQL 16  |
    |   (Expo/RN)       |          |         (Chi Router)              |          |                  |
    |                   |          |                                   |          |   - users         |
    |   - Clerk Auth    |          |   +---------------------------+   |          |   - recipes       |
    |   - RevenueCat    |          |   |     Middleware Stack       |   |          |   - ingredients   |
    |   - Zustand       |          |   |                           |   |          |   - steps         |
    |                   |          |   |   Request ID               |   |          |   - pantry_items  |
    +--------+----------+          |   |   Structured Logging       |   |          |   - shopping_*    |
             |                     |   |   Panic Recovery           |   |          |   - subscriptions |
             |                     |   |   CORS                     |   |          |   - usage_quotas  |
             |                     |   |   Rate Limiting (Redis)    |   |          |   - jobs          |
             v                     |   |   Clerk JWT Verification   |   |          +------------------+
    +-------------------+          |   |   Lazy User Sync           |   |
    |                   |          |   +---------------------------+   |          +------------------+
    |   Clerk           |          |                                   +--------->+   Redis 7        |
    |   (Auth Provider) |          |   +---------------------------+   |          |                  |
    |                   |          |   |     Core Services          |   |          |   - Rate limits  |
    +-------------------+          |   |                           |   |          |   - Sessions     |
                                   |   |   Recipe Intelligence      |   |          +------------------+
    +-------------------+          |   |   Video Downloader (yt-dlp)|   |
    |                   |          |   |   Thumbnail Service         |   |          +------------------+
    |   RevenueCat      +<-------->+   |   Recipe CRUD              |   +--------->+   Google Gemini  |
    |   (Subscriptions) |          |   |   Pantry Scanner           |   |          |   (AI Engine)    |
    |                   | Webhooks |   |   Shopping Lists            |   |          +------------------+
    +-------------------+  + API   |   |   Job Queue (in process)   |   |
                                   |   +---------------------------+   |
                                   +-----------------------------------+
```

### Request Lifecycle

Every API request flows through a consistent middleware stack before hitting a handler:

```
Request
  |
  v
[Request ID]  ->  Unique ID for tracing across logs
  |
  v
[Structured Logging]  ->  JSON logs with request/response bodies (sensitive fields masked)
  |
  v
[Panic Recovery]  ->  Catches panics, returns 500, logs stack trace
  |
  v
[CORS]  ->  Configured for mobile + web clients
  |
  v
[Max Body Size]  ->  52MB limit (supports video upload)
  |
  v
[Rate Limiting]  ->  Redis backed, atomic Lua script (no race conditions)
  |                   Public: 100/min by IP
  |                   Authenticated: 120/min by user ID
  |                   AI endpoints: 10/hr by user ID
  |
  v
[Clerk JWT Verify]  ->  Verifies token signature + expiry
  |
  v
[Lazy User Sync]  ->  First time user? Create DB record + free subscription.
  |                    Email/name changed in Clerk? Backfill silently.
  |
  v
[Handler]  ->  Business logic, DB queries, AI calls
  |
  v
Response
```

This stack means every authenticated request is **exactly one database lookup** in the common case (find user by `clerk_id`). New users get created transparently on their first API call, no separate "create account" endpoint needed. The mobile app just starts making authenticated requests after Clerk sign in, and the backend handles the rest.

---

## Backend Deep Dive

### Project Structure

```
backend/
  cmd/server/main.go              # Entry point, wiring, graceful shutdown
  internal/
    config/config.go              # All config from env vars, zero magic
    router/router.go              # All routes in one file, grouped by auth level
    middleware/
      clerk.go                    # JWT verification + lazy user sync
      ratelimit.go                # Redis backed rate limiting
      logging.go                  # Structured JSON logging
      cors.go, recover.go         # Standard middleware
    handler/
      recipe.go                   # Recipe CRUD + search + favorites
      unified_extraction.go       # Video/URL/image intelligence with concurrency control
      pantry.go                   # Pantry CRUD + AI scanning
      shopping.go                 # Shopping lists + items + smart merge
      subscription.go             # Subscription status + refresh
      webhook.go                  # RevenueCat webhook processing
      user.go                     # User profile + preferences
      admin.go                    # Admin stats endpoint
    model/
      user.go                     # User + UserSubscription + TierLimits
      recipe.go                   # Recipe + Ingredients + Steps + Nutrition
      job.go                      # Job state machine
      pantry.go, shopping.go      # Domain models
    repository/postgres/          # All SQL lives here, nowhere else
      user.go, recipe.go, etc.
    service/
      ai/
        interface.go              # RecipeExtractor, PantryScanner, RecipeRecommender
        gemini.go                 # Google Gemini implementation
      video/downloader.go         # yt-dlp wrapper for video processing
      thumbnail/downloader.go     # Thumbnail download + local serving
      revenuecat/client.go        # RevenueCat REST API client
  migrations/                     # 17 numbered SQL migrations
  docker/                         # Production + dev Dockerfiles
  Makefile                        # Dev, test, deploy targets
```

The structure follows a clean separation: **handlers** orchestrate, **services** contain business logic, **repositories** own the SQL. it's the minimum structure that lets me change the AI provider (Gemini today, maybe Claude tomorrow) without touching my HTTP layer.

### Database Schema (Key Tables)

```
users
  id              UUID PRIMARY KEY
  clerk_id        VARCHAR(255) UNIQUE      -- Clerk external ID
  email           VARCHAR(255)
  name            VARCHAR(255)
  preferred_unit  VARCHAR(20)              -- "metric" | "imperial"
  is_anonymous    BOOLEAN
  created_at      TIMESTAMPTZ
  deleted_at      TIMESTAMPTZ              -- soft delete

user_subscriptions
  user_id         UUID PRIMARY KEY -> users(id)
  entitlement     VARCHAR(20)              -- "free" | "pro"
  is_active       BOOLEAN
  product_id      VARCHAR(100)             -- "com.dlishe.pro.monthly"
  period_type     VARCHAR(20)              -- "trial" | "intro" | "normal"
  store           VARCHAR(20)              -- "APP_STORE" | "PLAY_STORE"
  purchased_at    TIMESTAMPTZ
  expires_at      TIMESTAMPTZ
  will_renew      BOOLEAN
  has_billing_issue BOOLEAN
  last_synced_at  TIMESTAMPTZ

revenuecat_events
  id              SERIAL PRIMARY KEY
  event_id        VARCHAR(255) UNIQUE      -- idempotency key
  event_type      VARCHAR(50)
  app_user_id     VARCHAR(255)
  payload         JSONB                    -- full webhook body
  created_at      TIMESTAMPTZ

recipes
  id              UUID PRIMARY KEY
  user_id         UUID -> users(id)
  title           VARCHAR(500)             -- GIN full text index
  description     TEXT
  servings        INTEGER
  prep_time       INTEGER                  -- minutes
  cook_time       INTEGER                  -- minutes
  difficulty      VARCHAR(20)
  cuisine         VARCHAR(100)
  source_type     VARCHAR(20)              -- "manual" | "video" | "ai" | "photo" | "cloned"
  source_url      TEXT
  is_public       BOOLEAN
  is_featured     BOOLEAN
  nutrition       JSONB
  dietary_info    JSONB
  tags            TEXT[]

intelligence_jobs
  id              UUID PRIMARY KEY
  user_id         UUID -> users(id)
  job_type        VARCHAR(20)              -- "url" | "image" | "video"
  status          VARCHAR(20)              -- pending -> downloading -> processing
                                           --   -> extracting -> completed | failed | cancelled
  progress        INTEGER                  -- 0-100
  result_recipe_id UUID -> recipes(id)     -- set on completion

usage_quotas
  user_id         UUID -> users(id)
  quota_type      VARCHAR(50)              -- "extraction" | "pantry_scan"
  month           DATE                     -- first of month
  used_count      INTEGER
  UNIQUE(user_id, quota_type, month)
```



### Recipe Intelligence Pipeline

The intelligence system handles three input types through a single unified endpoint:

```
POST /api/v1/recipes/extract
  Body: { "type": "url" | "image" | "video", "source": "..." }

                    +-------------------+
                    | Unified Handler   |
                    | (validates input, |
                    |  checks quotas,   |
                    |  creates job)     |
                    +---------+---------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
        +----------+   +----------+   +------------+
        | URL      |   | Image    |   | Video      |
        | Pipeline |   | Pipeline |   | Pipeline   |
        +----------+   +----------+   +------------+
        |              |              |
        | Fetch HTML   | Decode      | Platform
        | Parse page   | image       | aware
        | Extract      |             | routing
        | recipe       | Send to     | (see below)
        | metadata     | Gemini      |
        |              |             |
        v              v             v
        +--------- Gemini AI --------+
        | Structured recipe parsing   |
        | (title, ingredients, steps, |
        |  nutrition, dietary info)   |
        +----------------------------+
                    |
                    v
              +----------+
              | Enrich   |
              | (nutrition|
              |  + dietary|
              |  analysis)|
              +----------+
                    |
                    v
              Recipe saved to DB
              Job marked "completed"
              Client polls GET /jobs/{id}
```

**Concurrency control** is critical here. Video downloads are resource heavy (yt-dlp + ffmpeg), so I use Go's `semaphore.Weighted` to limit concurrent video jobs to 20 and URL/image jobs to 30. This prevents a surge of requests from overwhelming the server. Excess requests queue naturally on the semaphore instead of failing. No external queue needed.

### YouTube vs TikTok: Two Different Paths

Not all video platforms are equal, and I learned this the hard way. YouTube and TikTok go through completely different processing paths, and the reason is practical.

**YouTube** gets a fast path. Gemini's API natively understands YouTube URLs, so I skip the entire download step. The handler detects the YouTube hostname, fetches metadata via YouTube's public oEmbed API (title, author, thumbnail), and passes the raw URL directly to Gemini as a `FileData` reference. Gemini fetches the video itself. No yt-dlp, no ffmpeg, no temp files, no upload. This also sidesteps the "sign in to confirm you're not a bot" errors that yt-dlp increasingly hits on YouTube in server environments.

**TikTok** (and any other platform) goes through the full pipeline. The handler calls yt-dlp to download the video as mp4 (capped at 720p, Gemini doesn't need 4K), runs `yt-dlp --dump-json` for metadata and `--get-thumbnail` for the thumbnail URL. Then it uploads the local file to Gemini's Files API and polls until processing completes (up to 10 minutes). After the recipe is extracted, it cleans up both the local file and the remote Gemini upload.

The same AI prompt runs on both paths. The only difference is how the video gets to Gemini.

| | YouTube | TikTok / others |
|---|---|---|
| Download | None, URL passed directly | yt-dlp downloads mp4 to disk |
| Metadata | YouTube oEmbed API | yt-dlp --dump-json |
| Thumbnail | oEmbed thumbnail_url | yt-dlp --get-thumbnail |
| Gemini input | Native URL reference | File upload + poll for processing |
| Cleanup | None | Delete local file + remote Gemini file |

Instagram is rejected upfront at the validation layer. Meta blocks all server side access to Reels, so rather than failing silently after a 30 second timeout, the API returns a clear `PLATFORM_NOT_SUPPORTED` error immediately.


---

## Mobile App

### Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Expo (managed) | SDK 54 |
| Runtime | React Native | 0.81.5 (New Architecture) |
| UI Layer | React | 19 |
| Routing | Expo Router | 6 (file based) |
| Auth | Clerk React Native SDK | v2 |
| Subscriptions | react-native-purchases | v9 (RevenueCat) |
| State | Zustand | v5 |
| Secure Storage | expo-secure-store | |
| Error Tracking | Sentry | @sentry/react-native |
| Image Handling | expo-image, expo-image-picker | |

### App Structure

```
mobile/
  app/
    _layout.jsx          # Root: ClerkProvider, ErrorBoundary, AuthGate, RC init
    index.jsx            # Sign in (unauthenticated landing)
    sign-up.jsx          # Sign up
    home.jsx             # Dashboard: featured, recent, categories, AI suggestions
    recipies.jsx         # User's recipe library
    pantry.jsx           # Pantry inventory management
    shopping.jsx         # Shopping lists overview
    shoppingList.jsx     # Individual shopping list with items
    recipe/[id].jsx      # Recipe detail + cooking mode
  components/
    BottomSheetModal.jsx     # Reusable bottom sheet (visible/onClose pattern)
    SwipeNavigator.jsx       # Swipe based tab navigation (PanResponder)
    FloatingNav.jsx          # Bottom navigation bar
    ErrorBoundary.jsx        # Catches React render errors
    UserSync.jsx             # Syncs Clerk profile to backend
    ImageCapture.jsx         # Camera/library picker
    paywall/
      PaywallSheet.jsx       # Subscription upgrade flow
    home/
      ProfileName.jsx, MealCategoryGrid.jsx, SuggestionRow.jsx, ...
    recipies/
      AddRecipeSheetContent.jsx
    pantry/
      PantryItemSheet.jsx, ...
  store/
    recipeStore.js           # Recipe CRUD + search
    pantryStore.js           # Pantry items
    shoppingStore.js         # Shopping lists + items
    extractStore.js          # Intelligence job polling
    suggestedStore.js        # Public suggested recipes
    featuredStore.js         # Curated featured recipes
    subscriptionStore.js     # Entitlements, purchases, offerings
    userStore.js             # User profile
  services/
    api.js                   # Base HTTP client (apiFetch + authFetch)
    recipes.js               # Recipe API calls
    extract.js               # Intelligence API calls (120s timeout)
    pantry.js                # Pantry API calls (120s timeout)
    shopping.js              # Shopping list API calls
    subscription.js          # Subscription API calls
    user.js                  # User API calls
```

### State Management Pattern

Every Zustand store follows the same pattern:

```javascript
// 1. Fresh Clerk token on every API call (never stale)
const { getToken } = useAuth();

// 2. Store actions accept getToken, fetch token just in time
await useRecipeStore.getState().fetchRecipes({ getToken });

// 3. Inside the store:
fetchRecipes: async ({ getToken }) => {
  const recipes = await fetchUserRecipes(getToken);  // services/recipes.js
  set({ recipes, loading: false });
}
```

This pattern means **tokens are always fresh**, we never cache a JWT that might expire mid session. The `getToken()` call goes to Clerk's SDK, which handles refresh transparently.




---

## RevenueCat Integration

I treated RevenueCat as an opportunity to build a proper subscription layer

### How It's Wired

```
    PURCHASE FLOW                               WEBHOOK FLOW
    ============                               =============

    User taps "Subscribe"                      RevenueCat processes event
         |                                          |
         v                                          v
    [RevenueCat SDK]                           [POST /api/v1/webhooks/revenuecat]
    Purchases.purchasePackage()                     |
         |                                          v
         | (handles Apple/Google                [Authenticate]
         |  payment sheet)                      Bearer token == REVENUECAT_WEBHOOK_SECRET
         |                                          |
         v                                          v
    Purchase confirmed                         [Idempotency Check]
    by App Store / Play Store                  event_id already in revenuecat_events?
         |                                     Yes -> skip (return 200)
         |                                     No  -> continue
         v                                          |
    [Mobile App]                                    v
    subscriptionStore.purchasePackage()        [Resolve User]
         |                                     Try app_user_id as UUID -> DB lookup
         |  1. SDK purchase call               Try app_user_id as Clerk ID -> DB lookup
         |  2. POST /subscription/refresh      Try original_app_user_id -> same
         |  3. Update local state              Try aliases[] -> same
         |  4. Persist to SecureStore               |
         v                                          v
    User sees "Pro" immediately               [Map Event -> Subscription State]
                                               INITIAL_PURCHASE -> active, pro, willRenew
                                               RENEWAL          -> active, pro, willRenew
                                               CANCELLATION     -> active, pro, !willRenew
                                               EXPIRATION       -> !active, free
                                               BILLING_ISSUE    -> active, pro, flagged
                                               TRANSFER         -> sender=free, receiver=pro
                                                    |
                                                    v
                                               [Upsert user_subscriptions]
                                               ON CONFLICT (user_id) DO UPDATE
                                                    |
                                                    v
                                               [Log event for idempotency]
                                                    |
                                                    v
                                               [Async: fetch definitive state from RC API]
                                               (goroutine, non blocking)
```


### Products & Tiers

| Tier | Price | Limits |
|------|-------|--------|
| **Free** | $0 | 20 recipe intelligence ops/mo, 25 pantry scans/mo, 25 saved recipes |
| **Pro Monthly** | $2.99/mo | Unlimited everything |
| **Pro Annual** | $19.99/yr | Unlimited everything |

Limits are enforced server side via `usage_quotas` table. The mobile app receives remaining counts in the subscription response and shows the paywall proactively when a limit is approached.

---

## API Design


 **RESTful with pragmatic shortcuts.**


### Full Endpoint Map

```
PUBLIC (no auth, rate limited 100/min by IP)
  GET  /health                              Health check
  GET  /ready                               Readiness check
  GET  /api/v1/info                         App info
  GET  /api/v1/thumbnails/*                 Serve recipe thumbnails
  GET  /api/v1/recipes/suggested            Public suggested recipes
  GET  /api/v1/recipes/featured             Curated featured recipes
  GET  /api/v1/recipes/search/public        Public recipe search

AUTHENTICATED (rate limited 120/min by user)
  Users
    GET   /api/v1/users/me                  Current user profile
    PATCH /api/v1/users/me/preferences      Update preferences (unit system)

  Recipes
    GET    /api/v1/recipes/                 List user's recipes
    POST   /api/v1/recipes/                 Create recipe (manual)
    GET    /api/v1/recipes/search           Search user's recipes (full text)
    GET    /api/v1/recipes/recommendations  AI powered recommendations
    POST   /api/v1/recipes/extract          Recipe intelligence (URL/image/video)
    GET    /api/v1/recipes/{id}             Get recipe detail
    PUT    /api/v1/recipes/{id}             Update recipe
    DELETE /api/v1/recipes/{id}             Delete recipe (soft)
    POST   /api/v1/recipes/{id}/favorite    Toggle favorite
    POST   /api/v1/recipes/{id}/save        Clone public recipe to library

  Jobs
    GET    /api/v1/jobs/                    List user's jobs
    GET    /api/v1/jobs/{id}                Get job status (for polling)
    POST   /api/v1/jobs/{id}/cancel         Cancel running job
    DELETE /api/v1/jobs/{id}                Delete job
    DELETE /api/v1/jobs/                    Delete all user's jobs

  Pantry  (scan endpoint: 10/hr rate limit)
    GET    /api/v1/pantry/                  List pantry items
    POST   /api/v1/pantry/                  Add pantry item
    GET    /api/v1/pantry/{id}              Get pantry item
    PUT    /api/v1/pantry/{id}              Update pantry item
    DELETE /api/v1/pantry/{id}              Delete pantry item
    POST   /api/v1/pantry/scan             AI pantry scan from photo

  Shopping Lists
    GET    /api/v1/shopping-lists/                         List shopping lists
    POST   /api/v1/shopping-lists/                         Create list
    POST   /api/v1/shopping-lists/smart-merge              AI powered ingredient merge
    GET    /api/v1/shopping-lists/{id}                     Get list
    PUT    /api/v1/shopping-lists/{id}                     Update list
    DELETE /api/v1/shopping-lists/{id}                     Delete list
    POST   /api/v1/shopping-lists/{id}/archive             Archive list
    POST   /api/v1/shopping-lists/{id}/add-from-recipe     Add recipe ingredients
    GET    /api/v1/shopping-lists/{id}/items                List items
    POST   /api/v1/shopping-lists/{id}/items                Add item
    PUT    /api/v1/shopping-lists/{id}/items/{itemId}       Update item
    DELETE /api/v1/shopping-lists/{id}/items/{itemId}       Delete item
    POST   /api/v1/shopping-lists/{id}/items/{itemId}/check Toggle checked
    POST   /api/v1/shopping-lists/{id}/complete             Complete list

  Subscription
    GET    /api/v1/subscription              Current subscription + limits
    POST   /api/v1/subscription/refresh      Force sync from RevenueCat API

  Sync
    POST   /api/v1/sync                     Sync endpoint (multi device)

WEBHOOKS
    POST   /api/v1/webhooks/revenuecat      RevenueCat event processing

ADMIN (API key auth)
    GET    /api/v1/admin/stats               Usage statistics
```

That's **45 endpoints** across 7 resource groups. Each one rate limited and documented with Swagger annotations (available at `/swagger/` when `ENABLE_SWAGGER=true`).


---

## Infrastructure

Multistage Docker build: `golang:1.24-alpine` compiles the Go binaries, then a minimal `alpine:3.19` runtime installs `ffmpeg`, `python3`, and `yt-dlp` for video processing. Production stack is the Go API server, PostgreSQL 16, and Redis 7, all behind a reverse proxy. Migrations run automatically on deploy via `make deploy` (build, migrate, restart). Server is configured with connection pooling (100 open, 25 idle), graceful shutdown on SIGINT/SIGTERM, structured JSON logging with sensitive field masking, and log rotation via lumberjack.

---

*Built during RevenueCat Shipyard Creator Contest. Every architectural decision has a reason. Every edge case has a handler. The foundation is here, and what gets built on top of it is what matters next.*

