# DishFlow Backend - Final Decisions

## Document Metadata
- **Date**: 2026-01-31
- **Status**: Decisions Finalized
- **Next**: Update main architecture doc, begin implementation

---

## Authentication Strategy

### Decision: OAuth-First (Future)
- **Skip password reset** for MVP
- **Future**: Google OAuth via Clerk or similar
- **MVP Auth Flow**:
  ```
  1. Anonymous usage allowed (local storage)
  2. Optional: Create account (email/password basic)
  3. Future: Add Google/Apple sign-in via Clerk
  ```

### Endpoints for MVP
```
POST /api/v1/auth/register      # Basic email/password
POST /api/v1/auth/login         # Basic email/password
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/anonymous     # For anonymous sessions
```

### Endpoints Deferred
```
POST /api/v1/auth/forgot-password   # SKIP - Add with OAuth
POST /api/v1/auth/reset-password    # SKIP - Add with OAuth
POST /api/v1/auth/google            # FUTURE - Clerk integration
POST /api/v1/auth/apple             # FUTURE - Clerk integration
```

---

## AI Features

### Decision: Include Both AI Generation Features

**Endpoints to Build**:
```
POST /api/v1/recipes/generate
{
  prompt: "Quick weeknight pasta with vegetables",
  dietary: ["vegetarian"],
  cuisine: "italian",
  maxTime: 30  // minutes
}

POST /api/v1/recipes/generate-from-ingredients
{
  ingredients: ["chicken breast", "rice", "broccoli", "soy sauce"],
  dietary: [],
  cuisine: "asian",
  servings: 4
}
```

**Use Cases**:
1. "Generate a recipe for..." - Free-form prompt
2. "What can I make with..." - Use pantry ingredients

---

## Recipe-to-Shopping Integration

### Decision: Dedicated Endpoint

```
POST /api/v1/shopping-lists/{listId}/add-from-recipe
{
  recipeId: "uuid",
  servings: 4,                    // Scale ingredients
  excludeFromPantry: true,        // Auto-exclude items in pantry
  excludeItems: ["salt", "pepper"] // Manual exclusions
}

Response:
{
  addedItems: [
    { name: "Chicken Breast", quantity: 4, unit: "pieces", category: "proteins" },
    { name: "Rice", quantity: 2, unit: "cups", category: "pantry" }
  ],
  skippedItems: [
    { name: "Salt", reason: "excluded" },
    { name: "Olive Oil", reason: "in_pantry" }
  ]
}
```

---

## Recipe Sharing

### Decision: Share Between Registered Users

**NOT public links** - Share specifically with other DishFlow users.

**Flow**:
```
1. User A taps "Share" on a recipe
2. User A enters friend's email or username
3. Backend creates share record
4. User B sees recipe in "Shared with me" section
5. User B can save a copy to their own recipes
```

**Endpoints**:
```
POST /api/v1/recipes/{id}/share
{
  recipientEmail: "friend@example.com"
  // OR
  recipientUserId: "uuid"
}

GET /api/v1/recipes/shared-with-me
→ List of recipes others shared with this user

POST /api/v1/recipes/{id}/save-shared
→ Copy a shared recipe to user's own collection

DELETE /api/v1/recipes/{id}/shares/{shareId}
→ Revoke a share
```

**Database**:
```sql
CREATE TABLE recipe_shares (
    id UUID PRIMARY KEY,
    recipe_id UUID REFERENCES recipes(id),
    owner_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    recipient_email VARCHAR(255),  -- If not yet registered
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,       -- When recipient viewed
    UNIQUE(recipe_id, recipient_id)
);
```

**Deferred**: Public shareable links (defer until needed)

---

## Data Sync Strategy

### Decision: Full Sync When Logged In

**Anonymous users**: Local SQLite only, no backend sync

**Logged-in users**: Full bidirectional sync of ALL data:
- Recipes
- Pantry items
- Shopping lists & items
- Common items (user customizations)
- Favorites
- Settings/preferences

**Any device, any time** - All data available everywhere when logged in.

```
ANONYMOUS MODE:
├── All data in local SQLite
├── No backend calls (except AI features)
├── Prompt to create account for sync
└── On account creation: upload local data to server

LOGGED IN MODE:
├── All data synced to backend
├── Accessible from any device
├── Conflict resolution for simultaneous edits
└── Offline changes queued, synced when online
```

---

## Favorites System

### Decision: Include

**Simple implementation**:
```sql
ALTER TABLE recipes ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
```

**Endpoints**:
```
POST /api/v1/recipes/{id}/favorite     # Toggle favorite
DELETE /api/v1/recipes/{id}/favorite

GET /api/v1/recipes?favorite=true      # Filter favorites
```

---

## Pricing & Monetization

### Decision: Simple Two-Tier Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DISHFLOW PRICING                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FREE TIER                              PRO TIER ($3/month)             │
│  ──────────                             ────────────────────             │
│  • Up to 5 recipes                      • Unlimited recipes              │
│  • Up to 5 video extractions*           • Unlimited video extractions    │
│  • Up to 5 pantry scans*                • Unlimited pantry scans         │
│  • Local storage only                   • Multi-device sync              │
│  • Anonymous OK                         • Share recipes with friends     │
│                                         • 7-day free trial               │
│                                                                          │
│  * Clarify: Per month or lifetime?                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**RevenueCat Entitlements**:
```
free:     Default, no purchase
pro:      dishflow_pro_monthly ($3/mo) or dishflow_pro_yearly ($30/yr?)
```

**Trigger Points**:
- Creating 6th recipe → Paywall
- 6th video extraction → Paywall
- 6th pantry scan → Paywall
- Trying to sync → Paywall (or account creation + paywall)
- Trying to share → Paywall

---

## Trial Period

### Decision: 7-Day Free Trial

- Full Pro access for 7 days
- No credit card required to start
- Reminder at day 5
- Converts to $3/month or falls back to Free

---

## Family Tier

### Decision: Defer

Not in MVP. Consider later based on demand.

---

## Anonymous Usage

### Decision: Allow

- Users can use app without account
- All data stored locally
- AI features work (video extraction, pantry scan) up to free limits
- No sync, no sharing
- Prompt to create account when:
  - Hitting free tier limits
  - Wanting to sync
  - Wanting to share

---

## Final Endpoint List

### Auth (5 endpoints)
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/anonymous
```

### Users (3 endpoints)
```
GET    /api/v1/users/me
PATCH  /api/v1/users/me
DELETE /api/v1/users/me
```

### Recipes (10 endpoints)
```
GET    /api/v1/recipes
GET    /api/v1/recipes/{id}
POST   /api/v1/recipes
PUT    /api/v1/recipes/{id}
DELETE /api/v1/recipes/{id}
POST   /api/v1/recipes/{id}/favorite
DELETE /api/v1/recipes/{id}/favorite
POST   /api/v1/recipes/generate                    # AI
POST   /api/v1/recipes/generate-from-ingredients   # AI
GET    /api/v1/recipes/shared-with-me
```

### Recipe Sharing (3 endpoints)
```
POST   /api/v1/recipes/{id}/share
POST   /api/v1/recipes/{id}/save-shared
DELETE /api/v1/recipes/{id}/shares/{shareId}
```

### Video Jobs (5 endpoints)
```
POST   /api/v1/video/extract
GET    /api/v1/jobs/{id}
GET    /api/v1/jobs/{id}/stream
POST   /api/v1/jobs/{id}/cancel
GET    /api/v1/jobs
```

### Pantry (3 endpoints)
```
POST   /api/v1/pantry/scan
GET    /api/v1/pantry/restock-suggestions
GET    /api/v1/pantry/expiring
```

### Shopping Lists (2 endpoints)
```
POST   /api/v1/shopping-lists/{id}/add-from-recipe
GET    /api/v1/shopping-lists/suggestions
```

### Sync (1 endpoint)
```
POST   /api/v1/sync
```

### Subscription (3 endpoints)
```
GET    /api/v1/subscription
POST   /api/v1/subscription/refresh
POST   /api/v1/webhooks/revenuecat
```

### Uploads (2 endpoints)
```
POST   /api/v1/uploads/image
POST   /api/v1/uploads/presign
```

### System (3 endpoints)
```
GET    /health
GET    /ready
GET    /api/v1/info
```

### TOTAL: 40 endpoints

---

## Implementation Phases (Updated)

### Phase 1: Core Backend (Week 1-2)
```
Priority: Video extraction + basic auth

├── Project setup (Go, Docker, CI/CD)
├── Database schema + migrations
├── Basic auth (register, login, anonymous)
├── Video extraction pipeline
│   ├── POST /video/extract
│   ├── GET /jobs/{id}
│   ├── yt-dlp integration
│   └── Gemini integration
├── RevenueCat webhook handler
├── Basic quota enforcement
└── Health checks
```

### Phase 2: Full API (Week 3)
```
Priority: CRUD + AI generation

├── Recipe CRUD
├── AI recipe generation
│   ├── POST /recipes/generate
│   └── POST /recipes/generate-from-ingredients
├── Pantry scan endpoint
├── Favorites
├── Rate limiting
└── Full quota system
```

### Phase 3: Sync & Sharing (Week 4)
```
Priority: Multi-device + social

├── Sync endpoint
├── Conflict resolution
├── Recipe sharing (between users)
├── Shopping list add-from-recipe
├── Subscription status endpoint
└── Mobile SyncManager
```

### Phase 4: Polish (Week 5+)
```
Priority: Production readiness

├── Image uploads
├── Restock suggestions
├── Expiring items
├── Error tracking (Sentry)
├── Monitoring (Prometheus/Grafana)
├── OpenAPI documentation
└── Performance optimization
```

---

## Questions Resolved

| Question | Decision | Rationale |
|----------|----------|-----------|
| Free tier limits: per month or lifetime? | **Per month** (resets) | More forgiving, encourages continued usage |
| Yearly pricing | **$24/year** (33% off) | Strong incentive to commit annually |
| Quota tracking for anonymous users | **Per account** | Prevents abuse via app reinstall |

---

## Staff Review Follow-ups Addressed

The following issues from staff review have been incorporated:

1. ✅ **Pricing consolidated**: $3/month, $24/year across all docs
2. ✅ **Password reset deferred**: Marked as deferred in audit doc
3. ✅ **Webhook HMAC verification**: Fixed in RevenueCat integration
4. ✅ **Input validation added**: Constraints defined in architecture doc
5. ✅ **Anonymous rate limiting**: IP-based limits at edge layer
6. ✅ **Sync batch limits**: Max 100 recipes per sync request
7. ✅ **Gemini retry logic**: Exponential backoff (3 attempts)
8. ✅ **Conflict resolution simplified**: Server-wins for MVP
9. ✅ **Health checks defined**: /health and /ready endpoints specified
10. ✅ **Family tier removed**: Deferred from all MVP docs

### Remaining Questions (Post-MVP)

1. **Video temp storage**: Railway/Fly.io disk limits - monitor in production
2. **Gemini Files cleanup**: Implement cleanup job (files auto-delete after 48h)
3. **Anonymous → Account migration**: Handle over-limit scenarios gracefully
4. **yt-dlp updates**: Pin version, update monthly, monitor breakage
5. **Webhook reliability**: Add daily reconciliation cron job

---

**Document Status**: Decisions Complete, Staff Review Incorporated
**Last Updated**: 2026-01-31
