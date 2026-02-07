# RevenueCat Integration Guide

## Overview

DLISHE uses RevenueCat to manage in-app subscriptions across iOS and Android.
The backend receives webhook events from RevenueCat and maintains a cached
subscription state in the `user_subscriptions` table.

## Pricing Tiers

| | Free | Pro ($2.99/mo or $19.99/yr) |
|---|---|---|
| Recipe extractions | 3/month | Unlimited |
| Pantry scans | 3/month | Unlimited |
| Saved recipes | 10 | Unlimited |
| Shopping lists | Unlimited | Unlimited |
| Multi-device sync | No | Yes |
| Recipe sharing | No | Yes |

**RevenueCat entitlement ID:** `pro`
**Product IDs:** `com.dlishe.pro.monthly`, `com.dlishe.pro.yearly`

## Architecture

```
Mobile App (RC SDK)
    |
    |  1. User purchases subscription
    v
App Store / Play Store
    |
    |  2. Store confirms purchase
    v
RevenueCat
    |
    |  3. Webhook POST to backend
    v
Backend: POST /api/v1/webhooks/revenuecat
    |
    |  4. Update user_subscriptions table
    |  5. (Optional) Fetch GET /v1/subscribers/{id} for definitive state
    v
Database: user_subscriptions
    |
    |  6. App checks subscription via API
    v
Backend: GET /api/v1/subscription
```

## RevenueCat Dashboard Setup

### 1. Create Project
- Go to https://app.revenuecat.com
- Create a new project called "DLISHE"

### 2. Add Your App
- Add iOS app (Bundle ID from Xcode)
- Add Android app (Package name from Android Studio)
- Connect App Store Connect (Shared Secret / API Key)
- Connect Google Play Console (Service Account JSON)

### 3. Create Products
In App Store Connect / Google Play Console:
- `com.dlishe.pro.monthly` — $2.99/month auto-renewable subscription
- `com.dlishe.pro.yearly` — $19.99/year auto-renewable subscription

Then import these products into RevenueCat.

### 4. Create Entitlement
- Name: `pro`
- Attach both monthly and yearly products to this entitlement
- Any active subscription to either product grants the `pro` entitlement

### 5. Create Offering
- Create a "default" offering
- Add both products (monthly + yearly) to the offering
- This is what your paywall will display

### 6. Configure Webhook
- Go to Integrations > Webhooks
- URL: `https://your-api-domain.com/api/v1/webhooks/revenuecat`
- Authorization header: `Bearer <your-chosen-webhook-secret>`
- Set the same secret as `REVENUECAT_WEBHOOK_SECRET` in your `.env`

### 7. Get API Keys
- Project Settings > API Keys
- Copy the **Secret API key** (starts with `sk_`) into `REVENUECAT_SECRET_KEY`
- Copy the **Public API key** (starts with `appl_` or `goog_`) for the mobile SDK

## Environment Variables

```env
# Server-side secret key for REST API calls (GET /v1/subscribers/{id})
# Found in: RC Dashboard > Project > API Keys > Secret API key
REVENUECAT_SECRET_KEY=sk_xxxxxxxx

# Webhook authentication — you choose this value
# Set it in RC Dashboard webhook config as the Authorization header value
REVENUECAT_WEBHOOK_SECRET=your-chosen-secret
```

## Backend API Endpoints

### GET /api/v1/subscription
Returns cached subscription status for the authenticated user.

Response:
```json
{
  "entitlement": "pro",
  "isActive": true,
  "productId": "com.dlishe.pro.monthly",
  "periodType": "NORMAL",
  "store": "APP_STORE",
  "purchasedAt": "2025-01-15T10:00:00Z",
  "expiresAt": "2025-02-15T10:00:00Z",
  "willRenew": true,
  "hasBillingIssue": false,
  "isSandbox": false,
  "lastSyncedAt": "2025-01-15T10:05:00Z",
  "limits": {
    "videoExtractions": -1,
    "pantryScans": -1,
    "maxRecipes": -1,
    "maxShoppingLists": -1,
    "multiDeviceSync": true,
    "recipeSharing": true
  }
}
```

### POST /api/v1/subscription/refresh
Forces a sync with RevenueCat API and returns updated status.
Use this when the user reports their subscription isn't reflected,
or after a restore purchase action.

### POST /api/v1/webhooks/revenuecat
Receives webhook events from RevenueCat. Not called by the app directly.

Handled event types:
- `INITIAL_PURCHASE` — new subscription
- `RENEWAL` — auto-renewed
- `CANCELLATION` — auto-renew turned off (access continues until expiry)
- `UNCANCELLATION` — auto-renew re-enabled
- `EXPIRATION` — subscription ended, downgrade to free
- `BILLING_ISSUE` — payment failed, grace period active
- `PRODUCT_CHANGE` — upgraded/downgraded plan
- `SUBSCRIPTION_PAUSED` — Play Store pause
- `SUBSCRIPTION_EXTENDED` — extended by support
- `NON_RENEWING_PURCHASE` — one-time purchase
- `REFUND_REVERSED` — refund was reversed
- `TRANSFER` — subscription moved between users
- `TEST` — dashboard test ping

## Mobile SDK Integration

### iOS (Swift)
```swift
import RevenueCat

// On app launch, after Clerk authentication
func configureRevenueCat(userID: String) {
    Purchases.logLevel = .debug
    Purchases.configure(
        with: .init(withAPIKey: "appl_your_public_key")
            .with(appUserID: userID)  // Use your backend UUID
    )
}

// Show paywall and handle purchase
func purchase(package: Package) async throws {
    let result = try await Purchases.shared.purchase(package: package)
    if !result.userCancelled {
        // Purchase successful — RC sends webhook to your backend
        // Optionally call POST /subscription/refresh to sync immediately
    }
}

// Check entitlement (client-side cache)
func checkPro() async -> Bool {
    let customerInfo = try? await Purchases.shared.customerInfo()
    return customerInfo?.entitlements["pro"]?.isActive == true
}
```

### Android (Kotlin)
```kotlin
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

// On app launch
fun configureRevenueCat(userID: String) {
    Purchases.logLevel = LogLevel.DEBUG
    Purchases.configure(
        PurchasesConfiguration.Builder(context, "goog_your_public_key")
            .appUserID(userID)  // Use your backend UUID
            .build()
    )
}
```

## Testing Without Published Apps

### 1. Test webhook endpoint with curl
```bash
curl -X POST http://localhost:8080/api/v1/webhooks/revenuecat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-webhook-secret" \
  -d '{
    "api_version": "1.0",
    "event": {
      "id": "test-event-001",
      "type": "INITIAL_PURCHASE",
      "app_user_id": "YOUR-USER-UUID-HERE",
      "original_app_user_id": "YOUR-USER-UUID-HERE",
      "product_id": "com.dlishe.pro.monthly",
      "entitlement_ids": ["pro"],
      "period_type": "NORMAL",
      "purchased_at_ms": 1706000000000,
      "expiration_at_ms": 1708678400000,
      "store": "APP_STORE",
      "environment": "SANDBOX",
      "event_timestamp_ms": 1706000000000,
      "country_code": "US",
      "currency": "USD",
      "price": 2.99,
      "price_in_purchased_currency": 2.99
    }
  }'
```

### 2. Test expiration
```bash
curl -X POST http://localhost:8080/api/v1/webhooks/revenuecat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-webhook-secret" \
  -d '{
    "api_version": "1.0",
    "event": {
      "id": "test-event-002",
      "type": "EXPIRATION",
      "app_user_id": "YOUR-USER-UUID-HERE",
      "original_app_user_id": "YOUR-USER-UUID-HERE",
      "product_id": "com.dlishe.pro.monthly",
      "entitlement_ids": ["pro"],
      "period_type": "NORMAL",
      "purchased_at_ms": 1706000000000,
      "expiration_at_ms": 1706000000000,
      "store": "APP_STORE",
      "environment": "SANDBOX",
      "event_timestamp_ms": 1706000001000,
      "expiration_reason": "UNSUBSCRIBE"
    }
  }'
```

### 3. Check subscription status
```bash
curl http://localhost:8080/api/v1/subscription \
  -H "Authorization: Bearer YOUR-CLERK-TOKEN"
```

### 4. Apple Sandbox Testing (when you have an Xcode project)
- Create sandbox test accounts in App Store Connect
- Use StoreKit Testing in Xcode for local testing (no server needed)
- Sandbox purchases trigger real webhooks to your endpoint

### 5. RevenueCat Dashboard Test
- Go to Integrations > Webhooks in the RC dashboard
- Click "Test" to send a TEST event to your endpoint

## Database Tables

### user_subscriptions
Cached subscription state, updated by webhooks and API sync.
```sql
user_id UUID PRIMARY KEY
entitlement VARCHAR(50)     -- "free" or "pro"
is_active BOOLEAN
product_id VARCHAR(100)     -- e.g. "com.dlishe.pro.monthly"
period_type VARCHAR(20)     -- "TRIAL", "INTRO", "NORMAL"
store VARCHAR(20)           -- "APP_STORE", "PLAY_STORE"
purchased_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
cancelled_at TIMESTAMPTZ
will_renew BOOLEAN
has_billing_issue BOOLEAN
is_sandbox BOOLEAN
last_synced_at TIMESTAMPTZ
revenuecat_updated_at TIMESTAMPTZ
```

### revenuecat_events
Webhook event log for idempotency. Prevents duplicate processing.
```sql
event_id VARCHAR(255) UNIQUE  -- RevenueCat event ID
event_type VARCHAR(50)        -- INITIAL_PURCHASE, RENEWAL, etc.
app_user_id VARCHAR(255)      -- User identifier
payload JSONB                 -- Full webhook payload
processed_at TIMESTAMPTZ
```

## File Reference

| File | Purpose |
|---|---|
| `internal/service/revenuecat/client.go` | REST API client for GET /v1/subscribers |
| `internal/handler/webhook.go` | Webhook endpoint, event processing, idempotency |
| `internal/handler/subscription.go` | GET /subscription, POST /subscription/refresh |
| `internal/model/user.go` | UserSubscription model, tier limits |
| `internal/repository/postgres/user.go` | DB operations: upsert, event logging |
| `internal/router/router.go` | Route wiring |
| `migrations/000002_subscriptions.up.sql` | DB schema |
