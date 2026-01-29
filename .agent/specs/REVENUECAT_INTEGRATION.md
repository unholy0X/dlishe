# RevenueCat Integration Analysis - Impact on DishFlow Backend

## Document Metadata
- **Date**: 2026-01-31
- **Purpose**: Analyze RevenueCat monetization impact on backend architecture
- **Sources**: RevenueCat official documentation

---

## Part 1: How RevenueCat Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REVENUECAT ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  iOS App     │       │ RevenueCat   │       │  App Store   │
│  (SDK)       │◄─────►│ Servers      │◄─────►│  / Play Store│
└──────────────┘       └──────┬───────┘       └──────────────┘
                              │
                              │ Webhooks
                              │ REST API
                              ▼
                       ┌──────────────┐
                       │  DishFlow    │
                       │  Backend     │
                       └──────────────┘
```

### What RevenueCat Handles (Client-Side)

| Responsibility | RevenueCat SDK |
|----------------|----------------|
| Display paywalls | ✅ Yes |
| Process purchases | ✅ Yes (App Store/Play Store) |
| Restore purchases | ✅ Yes |
| Check entitlements | ✅ Yes (cached locally) |
| Handle receipts | ✅ Yes |
| Manage trials | ✅ Yes |
| Cross-platform sync | ✅ Yes |

### What Our Backend Needs to Handle

| Responsibility | Our Backend |
|----------------|-------------|
| Receive webhooks | ✅ Required |
| Store subscription status | ✅ Required (for server-side checks) |
| Verify before expensive ops | ✅ Required (video extraction) |
| Feature gating per tier | ✅ Required |
| Usage quotas per tier | ✅ Required |
| Link RC user to our user | ✅ Required |

---

## Part 2: Key RevenueCat Concepts

### User ID Strategy

**Critical Decision**: RevenueCat App User ID should match our backend user ID.

```
ANONYMOUS USER FLOW:
1. App launch → RevenueCat SDK creates anonymous ID (e.g., "$RCAnonymousID:abc123")
2. Our backend creates anonymous user → gets our user ID (e.g., "usr_xyz789")
3. Call Purchases.configure() with our user ID
4. RevenueCat now tracks "usr_xyz789"

ACCOUNT UPGRADE FLOW:
1. User creates account → our backend creates full user (still "usr_xyz789")
2. RevenueCat already knows this ID → subscription transfers automatically
3. If user had different RC ID before login → TRANSFER event sent via webhook
```

**Recommendation**: Always identify users with OUR user ID in RevenueCat:
```typescript
// On app launch, after getting our backend user ID
await Purchases.logIn(ourBackendUserId);
```

### Entitlements Model

**DishFlow Entitlements Structure** (aligned with BACKEND_DECISIONS.md):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DISHFLOW ENTITLEMENT MODEL                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ENTITLEMENT: "free"                                                    │
│  ├── Video extractions: 5/month                                         │
│  ├── Pantry scans: 5/month                                              │
│  ├── Recipes: 5 max                                                     │
│  ├── Shopping lists: Unlimited                                          │
│  ├── Sync: None (local storage only)                                    │
│  └── Anonymous usage allowed                                            │
│                                                                          │
│  ENTITLEMENT: "pro"                                                     │
│  ├── Video extractions: Unlimited                                       │
│  ├── Pantry scans: Unlimited                                            │
│  ├── Recipes: Unlimited                                                 │
│  ├── Shopping lists: Unlimited                                          │
│  ├── Sync: Multi-device                                                 │
│  ├── Recipe sharing with friends                                        │
│  └── 7-day free trial                                                   │
│                                                                          │
│  NOTE: Family tier deferred - not in MVP                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Products → Entitlements Mapping

```
PRODUCTS (configured in App Store Connect):
├── dishflow_pro_monthly   ($3/mo)   → unlocks "pro"
└── dishflow_pro_yearly    ($24/yr)  → unlocks "pro" (33% savings)

NOTE: Family tier products deferred until post-MVP
```

---

## Part 3: Backend Integration Requirements

### 3.1 Webhook Endpoint

**Required**: `POST /api/v1/webhooks/revenuecat`

```go
// Webhook event structure
type RevenueCatWebhook struct {
    APIVersion string `json:"api_version"` // "1.0"
    Event      struct {
        Type                   string `json:"type"` // INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc.
        ID                     string `json:"id"`   // Unique event ID (for idempotency)
        AppUserID              string `json:"app_user_id"`
        OriginalAppUserID      string `json:"original_app_user_id"`
        ProductID              string `json:"product_id"`
        EntitlementIDs         []string `json:"entitlement_ids"`
        PeriodType             string `json:"period_type"` // TRIAL, INTRO, NORMAL
        PurchasedAtMs          int64  `json:"purchased_at_ms"`
        ExpirationAtMs         int64  `json:"expiration_at_ms"`
        Store                  string `json:"store"` // APP_STORE, PLAY_STORE
        Environment            string `json:"environment"` // PRODUCTION, SANDBOX
        IsFamilyShare          bool   `json:"is_family_share"`
        TransferredFrom        []string `json:"transferred_from"` // For TRANSFER events
        TransferredTo          []string `json:"transferred_to"`
    } `json:"event"`
}
```

**Webhook Event Types to Handle**:

| Event | Action |
|-------|--------|
| `INITIAL_PURCHASE` | Create/update subscription record, grant entitlement |
| `RENEWAL` | Extend subscription, reset usage quotas |
| `CANCELLATION` | Mark subscription as cancelled (still active until expiry) |
| `EXPIRATION` | Revoke entitlement, downgrade to free |
| `BILLING_ISSUE` | Flag account, may send email |
| `PRODUCT_CHANGE` | Update subscription tier |
| `TRANSFER` | Move subscription to different user |
| `UNCANCELLATION` | Remove cancellation flag |

**Webhook Handler Pattern**:

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "io"
)

func (h *WebhookHandler) HandleRevenueCat(w http.ResponseWriter, r *http.Request) {
    // 1. Read body for signature verification
    body, err := io.ReadAll(r.Body)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        return
    }

    // 2. Verify HMAC signature (SECURITY: proper signature verification)
    signature := r.Header.Get("X-RevenueCat-Signature")
    if !h.verifySignature(body, signature) {
        log.Warn("Invalid webhook signature", "signature", signature)
        w.WriteHeader(http.StatusUnauthorized)
        return
    }

    // 3. Parse webhook
    var webhook RevenueCatWebhook
    if err := json.Unmarshal(body, &webhook); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        return
    }

    // 4. Check idempotency (have we processed this event ID before?)
    if h.repo.EventExists(webhook.Event.ID) {
        w.WriteHeader(http.StatusOK) // Already processed, return success
        return
    }

    // 5. Process event (async to respond quickly)
    go h.processEvent(webhook)

    // 6. Return 200 immediately
    w.WriteHeader(http.StatusOK)
}

// verifySignature validates the HMAC-SHA256 signature from RevenueCat
func (h *WebhookHandler) verifySignature(body []byte, signature string) bool {
    if signature == "" {
        return false
    }

    mac := hmac.New(sha256.New, []byte(h.config.RevenueCatWebhookSecret))
    mac.Write(body)
    expectedSignature := hex.EncodeToString(mac.Sum(nil))

    // Use constant-time comparison to prevent timing attacks
    return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

func (h *WebhookHandler) processEvent(webhook RevenueCatWebhook) {
    // Call RevenueCat REST API to get latest subscriber status
    // This is the recommended pattern from RevenueCat
    subscriber, err := h.revenuecat.GetSubscriber(webhook.Event.AppUserID)
    if err != nil {
        log.Error("Failed to get subscriber", "error", err)
        return
    }

    // Update our database with latest status
    h.repo.UpdateSubscription(webhook.Event.AppUserID, subscriber)

    // Record event as processed
    h.repo.RecordEvent(webhook.Event.ID)
}
```

### 3.2 RevenueCat REST API Client

**Required for server-side verification**:

```go
type RevenueCatClient struct {
    baseURL   string
    secretKey string
    client    *http.Client
}

func (c *RevenueCatClient) GetSubscriber(appUserID string) (*Subscriber, error) {
    req, _ := http.NewRequest("GET",
        fmt.Sprintf("%s/v1/subscribers/%s", c.baseURL, appUserID),
        nil,
    )
    req.Header.Set("Authorization", "Bearer "+c.secretKey)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Subscriber Subscriber `json:"subscriber"`
    }
    json.NewDecoder(resp.Body).Decode(&result)

    return &result.Subscriber, nil
}

type Subscriber struct {
    Entitlements map[string]Entitlement `json:"entitlements"`
    Subscriptions map[string]Subscription `json:"subscriptions"`
    FirstSeen    time.Time `json:"first_seen"`
}

type Entitlement struct {
    ExpiresDate        *time.Time `json:"expires_date"`
    PurchaseDate       time.Time  `json:"purchase_date"`
    ProductIdentifier  string     `json:"product_identifier"`
}
```

### 3.3 Database Schema Additions

```sql
-- User subscription status (cached from RevenueCat)
CREATE TABLE user_subscriptions (
    user_id UUID PRIMARY KEY REFERENCES users(id),

    -- Current status
    entitlement VARCHAR(50) DEFAULT 'free',  -- 'free', 'pro' (family tier deferred)
    is_active BOOLEAN DEFAULT TRUE,

    -- Subscription details
    product_id VARCHAR(100),
    period_type VARCHAR(20),  -- 'trial', 'intro', 'normal'
    store VARCHAR(20),        -- 'APP_STORE', 'PLAY_STORE', 'STRIPE'

    -- Dates
    purchased_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Flags
    will_renew BOOLEAN DEFAULT TRUE,
    has_billing_issue BOOLEAN DEFAULT FALSE,
    is_sandbox BOOLEAN DEFAULT FALSE,

    -- Sync tracking
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    revenuecat_updated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_expires ON user_subscriptions(expires_at);
CREATE INDEX idx_user_subscriptions_entitlement ON user_subscriptions(entitlement);

-- Webhook event log (for idempotency)
CREATE TABLE revenuecat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,  -- RevenueCat's event ID
    event_type VARCHAR(50) NOT NULL,
    app_user_id VARCHAR(255) NOT NULL,
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revenuecat_events_user ON revenuecat_events(app_user_id);

-- Usage quotas (tier-aware)
ALTER TABLE usage_quotas ADD COLUMN entitlement VARCHAR(50) DEFAULT 'free';
```

### 3.4 Subscription Reconciliation (Handles Missed Webhooks)

**IMPORTANT**: RevenueCat webhooks can be delayed or missed. Run a daily reconciliation job.

```go
// ReconcileSubscriptions syncs all active subscriptions with RevenueCat
// Run daily via cron job to catch any missed webhooks
func (s *SubscriptionService) ReconcileSubscriptions(ctx context.Context) error {
    // Get all users with subscriptions expiring in the next 7 days
    // or that haven't been synced in 24 hours
    users, err := s.repo.GetUsersNeedingReconciliation()
    if err != nil {
        return err
    }

    for _, user := range users {
        // Rate limit API calls (RevenueCat allows 10 req/sec)
        time.Sleep(100 * time.Millisecond)

        // Fetch latest status from RevenueCat
        subscriber, err := s.revenuecat.GetSubscriber(user.ID)
        if err != nil {
            log.Error("Failed to fetch subscriber", "user_id", user.ID, "error", err)
            continue
        }

        // Update our cache with latest status
        if err := s.repo.UpdateFromRevenueCat(user.ID, subscriber); err != nil {
            log.Error("Failed to update subscription", "user_id", user.ID, "error", err)
        }
    }

    return nil
}

// GetUsersNeedingReconciliation returns users that need status refresh
func (r *SubscriptionRepo) GetUsersNeedingReconciliation() ([]User, error) {
    return r.db.Query(`
        SELECT u.id, u.email
        FROM users u
        JOIN user_subscriptions s ON u.id = s.user_id
        WHERE
            -- Subscriptions expiring soon (might have renewed)
            (s.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days')
            OR
            -- Haven't synced in 24 hours
            (s.last_synced_at < NOW() - INTERVAL '24 hours' AND s.entitlement = 'pro')
            OR
            -- Has billing issues (check if resolved)
            (s.has_billing_issue = true)
    `)
}
```

**Cron Schedule**: Run daily at 3 AM UTC

```yaml
# docker-compose.yml or k8s CronJob
reconcile-subscriptions:
  schedule: "0 3 * * *"  # Daily at 3 AM
  command: /server --task=reconcile-subscriptions
```

### 3.5 Subscription-Aware Middleware

```go
// Middleware to check subscription before expensive operations
func (m *Middleware) RequireEntitlement(required string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := auth.UserFromContext(r.Context())

            // Get cached subscription status
            sub, err := m.subscriptionRepo.Get(user.ID)
            if err != nil || !sub.IsActive {
                sub = &Subscription{Entitlement: "free"}
            }

            // Check if user has required entitlement
            if !hasEntitlement(sub.Entitlement, required) {
                respondError(w, http.StatusPaymentRequired, "UPGRADE_REQUIRED",
                    "This feature requires a Pro subscription")
                return
            }

            // Add subscription to context for downstream handlers
            ctx := context.WithValue(r.Context(), "subscription", sub)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// Entitlement hierarchy: pro > free (family tier deferred)
func hasEntitlement(current, required string) bool {
    levels := map[string]int{"free": 0, "pro": 1}
    return levels[current] >= levels[required]
}
```

### 3.5 Quota Enforcement by Tier

**Aligned with BACKEND_DECISIONS.md** - limits reset monthly:

```go
type QuotaLimits struct {
    VideoExtractions int  // Per month, resets on billing cycle
    PantryScans      int  // Per month, resets on billing cycle
    MaxRecipes       int  // Total limit
    MaxShoppingLists int  // Total limit (-1 = unlimited)
    MultiDeviceSync  bool
    RecipeSharing    bool
}

var TierLimits = map[string]QuotaLimits{
    "free": {
        VideoExtractions: 5,   // 5/month per BACKEND_DECISIONS.md
        PantryScans:      5,   // 5/month per BACKEND_DECISIONS.md
        MaxRecipes:       5,   // 5 max per BACKEND_DECISIONS.md
        MaxShoppingLists: -1,  // Unlimited
        MultiDeviceSync:  false,
        RecipeSharing:    false,
    },
    "pro": {
        VideoExtractions: -1,  // Unlimited
        PantryScans:      -1,  // Unlimited
        MaxRecipes:       -1,  // Unlimited
        MaxShoppingLists: -1,  // Unlimited
        MultiDeviceSync:  true,
        RecipeSharing:    true,
    },
    // NOTE: pro_family tier deferred - not in MVP
}
```

---

## Part 4: Updated API Design

### New Endpoints for RevenueCat

```yaml
# Webhook receiver
POST /api/v1/webhooks/revenuecat
  Authorization: <webhook-secret>
  → 200 OK (always, to prevent retries)

# Get current subscription status (for app to verify)
GET /api/v1/subscription
  Authorization: Bearer <token>
  → {
      entitlement: "pro",
      expiresAt: "2026-02-28T00:00:00Z",
      willRenew: true,
      productId: "dishflow_pro_monthly",
      store: "APP_STORE",
      quotas: {
        videoExtractions: { used: 5, limit: 30 },
        pantryScans: { used: 12, limit: -1 },
        recipes: { used: 45, limit: -1 }
      }
    }

# Force refresh from RevenueCat (if app thinks status is stale)
POST /api/v1/subscription/refresh
  Authorization: Bearer <token>
  → (calls RevenueCat API, updates cache, returns latest status)
```

### Modified Endpoints with Tier Checks

```yaml
# Video extraction - check quota before processing
POST /api/v1/video/extract
  - Check user's entitlement
  - Check remaining video extractions this month
  - Free: 5/month, Pro: unlimited
  - If free tier and limit reached → 402 PAYMENT_REQUIRED

# Pantry scan - check quota
POST /api/v1/pantry/scan
  - Check remaining pantry scans this month
  - Free: 5/month, Pro: unlimited

# Create recipe - check max recipes
POST /api/v1/recipes
  - Free: max 5 total
  - Pro: unlimited

# Sync - requires Pro tier
POST /api/v1/sync
  - Free: no sync (local storage only)
  - Pro: full multi-device sync

# Recipe sharing - requires Pro tier
POST /api/v1/recipes/{id}/share
  - Free: not available → 402 PAYMENT_REQUIRED
  - Pro: share with other registered users
```

---

## Part 5: Mobile SDK Integration

### React Native Setup

```bash
npx expo install react-native-purchases
```

```typescript
// lib/revenuecat.ts
import Purchases from 'react-native-purchases';

const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_xxxxx',
  android: 'goog_xxxxx',
});

export async function initializeRevenueCat(userId?: string) {
  await Purchases.configure({
    apiKey: REVENUECAT_API_KEY!,
    appUserID: userId, // Our backend user ID
  });
}

export async function identifyUser(userId: string) {
  await Purchases.logIn(userId);
}

export async function getCustomerInfo() {
  return await Purchases.getCustomerInfo();
}

export async function checkEntitlement(entitlementId: string): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active[entitlementId] !== undefined;
}

export async function purchasePackage(packageToPurchase: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
  return customerInfo;
}
```

### Integration with Backend Auth

```typescript
// After backend login
async function handleLogin(email: string, password: string) {
  // 1. Login to our backend
  const { user, accessToken } = await api.post('/auth/login', { email, password });

  // 2. Identify user in RevenueCat with OUR user ID
  await identifyUser(user.id);

  // 3. Store tokens
  await SecureStore.setItemAsync('accessToken', accessToken);

  return user;
}

// After anonymous auth
async function handleAnonymousAuth() {
  // 1. Get anonymous session from backend
  const { user, accessToken } = await api.post('/auth/anonymous');

  // 2. Identify in RevenueCat
  await identifyUser(user.id);

  return user;
}
```

---

## Part 6: Implementation Impact Summary

### Backend Changes Required

| Component | Change | Priority |
|-----------|--------|----------|
| New endpoint | `POST /webhooks/revenuecat` | **Critical** |
| New endpoint | `GET /subscription` | **Critical** |
| New endpoint | `POST /subscription/refresh` | Medium |
| New table | `user_subscriptions` | **Critical** |
| New table | `revenuecat_events` | **Critical** |
| New service | `RevenueCatClient` | **Critical** |
| Middleware | `RequireEntitlement()` | **Critical** |
| Update | Quota system (tier-aware) | **Critical** |
| Update | All expensive endpoints (check tier) | **Critical** |

### Environment Variables to Add

```bash
REVENUECAT_SECRET_KEY=sk_xxxxxxxx        # For REST API calls
REVENUECAT_WEBHOOK_SECRET=whsec_xxxxxx   # For webhook validation
REVENUECAT_API_URL=https://api.revenuecat.com
```

### Security Considerations

1. **Webhook signature verification**: Use HMAC-SHA256 with constant-time comparison (see handler code above)
2. **Idempotency**: Track processed event IDs to prevent duplicate processing
3. **Secret key protection**: Never expose `sk_` keys, store in environment variables
4. **Fallback**: If RevenueCat is down, use cached subscription status (grace period)
5. **Sandbox detection**: Handle sandbox purchases differently in production
6. **Periodic reconciliation**: Cron job to sync subscription status from RevenueCat API (handles missed webhooks)

---

## Part 7: Pricing Tiers (FINAL - per BACKEND_DECISIONS.md)

### DishFlow Pricing

| Tier | Price | Entitlement |
|------|-------|-------------|
| **Free** | $0 | `free` |
| **Pro Monthly** | $3/mo | `pro` |
| **Pro Yearly** | $24/yr (33% savings) | `pro` |

**Note**: Family tier deferred until post-MVP based on user demand.

### Feature Matrix (FINAL)

| Feature | Free | Pro |
|---------|------|-----|
| Video extractions | 5/mo | ∞ |
| Pantry scans | 5/mo | ∞ |
| Recipes | 5 max | ∞ |
| Shopping lists | ∞ | ∞ |
| Multi-device sync | ❌ | ✅ |
| Recipe sharing | ❌ | ✅ |
| 7-day free trial | - | ✅ |

**Paywall Triggers** (when free limit reached):
- Creating 6th recipe
- 6th video extraction in a month
- 6th pantry scan in a month
- Attempting to sync
- Attempting to share a recipe

---

## Part 8: Questions Resolved

| Question | Decision |
|----------|----------|
| Free tier video extractions | **5/month** (resets monthly) |
| Trial period | **7-day free trial** of Pro |
| Family tier | **Deferred** - not in MVP |
| Lifetime purchase | **Deferred** - evaluate later |
| Sync on free tier | **Disabled** - local storage only |
| Quota tracking for anonymous | **Per account** - prevents abuse |

---

**Document Status**: Aligned with BACKEND_DECISIONS.md
**Impact**: Significant - adds webhook handling, subscription storage, tier-based quotas
**Last Updated**: 2026-01-31

---

## Sources

- [RevenueCat Installation](https://www.revenuecat.com/docs/getting-started/installation)
- [RevenueCat Webhooks](https://www.revenuecat.com/docs/integrations/webhooks)
- [RevenueCat User IDs](https://www.revenuecat.com/docs/customers/user-ids)
- [RevenueCat Entitlements](https://www.revenuecat.com/docs/getting-started/entitlements)
- [RevenueCat Customer Info](https://www.revenuecat.com/docs/customers/customer-info)
- [RevenueCat API Authentication](https://www.revenuecat.com/docs/projects/authentication)
