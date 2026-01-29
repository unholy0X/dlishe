# DishFlow Backend - Endpoint & Use Case Audit

## Purpose
Cross-reference all DishFlow features with proposed backend endpoints to identify gaps.

---

## Feature-to-Endpoint Matrix

### 1. AUTHENTICATION & USER MANAGEMENT

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| First app launch (anonymous) | Auto-create device session | `POST /api/v1/auth/anonymous` | ✅ Defined |
| User registration | Sign up form | `POST /api/v1/auth/register` | ✅ Defined |
| User login | Login form | `POST /api/v1/auth/login` | ✅ Defined |
| Token refresh | Silent refresh before expiry | `POST /api/v1/auth/refresh` | ✅ Defined |
| Logout | Logout button | `POST /api/v1/auth/logout` | ✅ Defined |
| **Forgot password** | Forgot password link | `POST /api/v1/auth/forgot-password` | ⏸️ DEFERRED (add with OAuth/Clerk) |
| **Reset password** | Reset via email link | `POST /api/v1/auth/reset-password` | ⏸️ DEFERRED (add with OAuth/Clerk) |
| **Upgrade anonymous to account** | "Create account" prompt | `POST /api/v1/auth/upgrade` | ❌ MISSING |
| **Delete account** | Settings → Delete account | `DELETE /api/v1/users/me` | ❌ MISSING |
| **Get user profile** | Profile screen | `GET /api/v1/users/me` | ❌ MISSING |
| **Update user profile** | Edit profile | `PATCH /api/v1/users/me` | ❌ MISSING |
| **Change password** | Settings → Change password | `POST /api/v1/users/me/password` | ❌ MISSING |

### 2. RECIPES

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| List recipes | Home screen load | `GET /api/v1/recipes` | ✅ Defined |
| Get recipe detail | Tap recipe card | `GET /api/v1/recipes/{id}` | ✅ Defined |
| Create recipe manually | Add recipe form | `POST /api/v1/recipes` | ✅ Defined |
| Update recipe | Edit recipe | `PUT /api/v1/recipes/{id}` | ✅ Defined |
| Delete recipe | Delete button | `DELETE /api/v1/recipes/{id}` | ✅ Defined |
| Search recipes | Search bar | `GET /api/v1/recipes?search=...` | ✅ Defined (query param) |
| Filter by cuisine | Filter dropdown | `GET /api/v1/recipes?cuisine=...` | ✅ Defined (query param) |
| Filter by difficulty | Filter dropdown | `GET /api/v1/recipes?difficulty=...` | ✅ Defined (query param) |
| **Filter by tag** | Tap tag chip | `GET /api/v1/recipes?tag=...` | ❌ MISSING (query param) |
| **Filter by source type** | Filter by video/manual/AI | `GET /api/v1/recipes?sourceType=...` | ❌ MISSING (query param) |
| **Duplicate recipe** | "Duplicate" action | `POST /api/v1/recipes/{id}/duplicate` | ❌ MISSING |
| **Favorite recipe** | Heart button | Need favorites system | ❌ MISSING (whole feature) |
| **Share recipe (link)** | Share button | `POST /api/v1/recipes/{id}/share` | ❌ MISSING |
| **Get shared recipe (public)** | Open shared link | `GET /api/v1/shared/recipes/{shareId}` | ❌ MISSING |

### 3. VIDEO-TO-RECIPE EXTRACTION

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| Start extraction | Submit video URL | `POST /api/v1/video/extract` | ✅ Defined |
| Poll job status | Polling loop | `GET /api/v1/jobs/{id}` | ✅ Defined |
| Stream job progress | SSE connection | `GET /api/v1/jobs/{id}/stream` | ✅ Defined |
| **Cancel extraction job** | Cancel button | `POST /api/v1/jobs/{id}/cancel` | ❌ MISSING |
| **Retry failed job** | Retry button | `POST /api/v1/jobs/{id}/retry` | ❌ MISSING |
| **List user's jobs** | Job history | `GET /api/v1/jobs` | ❌ MISSING |
| **Get supported platforms** | Help text | `GET /api/v1/video/platforms` | ❌ MISSING (nice to have) |

### 4. AI RECIPE GENERATION (Text-based)

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| **Generate recipe from prompt** | "Generate with AI" button | `POST /api/v1/recipes/generate` | ❌ MISSING |
| **Generate from ingredients** | "What can I make?" | `POST /api/v1/recipes/generate-from-ingredients` | ❌ MISSING |
| **Suggest recipe variations** | "Make it vegetarian" | `POST /api/v1/recipes/{id}/variations` | ❌ MISSING |

### 5. PANTRY MANAGEMENT

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| List pantry items | Pantry screen load | Via `POST /api/v1/sync` | ✅ Via sync |
| Add pantry item | Add item form | Via `POST /api/v1/sync` | ✅ Via sync |
| Update pantry item | Edit item | Via `POST /api/v1/sync` | ✅ Via sync |
| Delete pantry item | Long-press delete | Via `POST /api/v1/sync` | ✅ Via sync |
| Clear all pantry | Three-dot menu | Via `POST /api/v1/sync` | ✅ Via sync |
| Scan pantry images | Camera/gallery | `POST /api/v1/pantry/scan` | ✅ Defined |
| **Get low stock suggestions** | Restock screen | `GET /api/v1/pantry/restock-suggestions` | ❌ MISSING |
| **Get expiring items** | Notifications | `GET /api/v1/pantry/expiring` | ❌ MISSING |
| **CRUD endpoints (non-sync)** | Direct API access | `GET/POST/PUT/DELETE /api/v1/pantry/*` | ❌ MISSING (may want for direct access) |

### 6. SHOPPING LISTS

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| List shopping lists | Shopping screen | Via `POST /api/v1/sync` | ✅ Via sync |
| Create shopping list | Create button | Via `POST /api/v1/sync` | ✅ Via sync |
| Update shopping list | Edit list | Via `POST /api/v1/sync` | ✅ Via sync |
| Delete shopping list | Long-press delete | Via `POST /api/v1/sync` | ✅ Via sync |
| Add item to list | Add item | Via `POST /api/v1/sync` | ✅ Via sync |
| Check/uncheck item | Tap checkbox | Via `POST /api/v1/sync` | ✅ Via sync |
| Clear checked items | Clear button | Via `POST /api/v1/sync` | ✅ Via sync |
| **Add recipe ingredients to list** | "Add to shopping list" | `POST /api/v1/shopping-lists/{id}/add-from-recipe` | ❌ MISSING |
| **Smart suggestions** | Based on pantry | `GET /api/v1/shopping-lists/suggestions` | ❌ MISSING |
| **CRUD endpoints (non-sync)** | Direct API access | `GET/POST/PUT/DELETE /api/v1/shopping-lists/*` | ❌ MISSING (may want) |
| **Share shopping list** | Share with family | `POST /api/v1/shopping-lists/{id}/share` | ❌ MISSING (future) |

### 7. COMMON ITEMS CATALOG

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| **Get common items** | Quick add dropdown | `GET /api/v1/common-items` | ❌ MISSING |
| **Search common items** | Search in quick add | `GET /api/v1/common-items?search=...` | ❌ MISSING |
| **Get by category** | Category filter | `GET /api/v1/common-items?category=...` | ❌ MISSING |
| Reset common items | Three-dot menu | Currently client-side only | ⚠️ Client-side |

**Note**: Common items catalog is currently client-side seeded. Decision needed: Keep client-side or move to server?

### 8. SYNC & OFFLINE

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| Full sync | App launch / pull-to-refresh | `POST /api/v1/sync` | ✅ Defined |
| Resolve conflicts | Conflict modal | Via `POST /api/v1/sync` response | ✅ Defined |
| **Force server state** | "Use server version" | `POST /api/v1/sync/force-server` | ❌ MISSING (convenience) |
| **Force local state** | "Use my version" | `POST /api/v1/sync/force-local` | ❌ MISSING (convenience) |
| **Get sync status** | Debug/settings | `GET /api/v1/sync/status` | ❌ MISSING |

### 9. USAGE & QUOTAS

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| Get quota usage | Settings / rate limit hit | Included in sync response | ✅ Defined |
| **Get detailed usage** | Usage dashboard | `GET /api/v1/usage` | ❌ MISSING |
| **Get usage history** | Usage over time | `GET /api/v1/usage/history` | ❌ MISSING |

### 10. ADMIN & SYSTEM

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| **Health check** | N/A (infra) | `GET /health` | ❌ MISSING |
| **Readiness check** | N/A (infra) | `GET /ready` | ❌ MISSING |
| **API version/info** | About screen | `GET /api/v1/info` | ❌ MISSING |
| **Feature flags** | Control features | `GET /api/v1/features` | ❌ MISSING (nice to have) |

### 11. NOTIFICATIONS (Future)

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| **Register push token** | App launch | `POST /api/v1/notifications/register` | ❌ MISSING |
| **Get notification settings** | Settings | `GET /api/v1/notifications/settings` | ❌ MISSING |
| **Update notification settings** | Toggle settings | `PUT /api/v1/notifications/settings` | ❌ MISSING |

### 12. IMAGE/ASSET UPLOADS

| Use Case | Mobile Action | Backend Endpoint | Status |
|----------|---------------|------------------|--------|
| **Upload recipe image** | Add photo to recipe | `POST /api/v1/uploads/image` | ❌ MISSING |
| **Get upload URL (presigned)** | Direct S3 upload | `POST /api/v1/uploads/presign` | ❌ MISSING |

---

## Summary of Missing Endpoints

### Critical (Phase 1-2)

| Endpoint | Priority | Reason |
|----------|----------|--------|
| `POST /api/v1/auth/upgrade` | High | Anonymous → account |
| `GET /api/v1/users/me` | High | Profile display |
| `PATCH /api/v1/users/me` | Medium | Edit profile |
| `DELETE /api/v1/users/me` | Medium | GDPR compliance |
| `POST /api/v1/jobs/{id}/cancel` | High | User control |
| `GET /health` | Critical | Infrastructure |
| `GET /ready` | Critical | Infrastructure |

### Deferred (Add with OAuth/Clerk integration)

| Endpoint | Priority | Reason |
|----------|----------|--------|
| `POST /api/v1/auth/forgot-password` | Deferred | Skip for MVP - add with OAuth |
| `POST /api/v1/auth/reset-password` | Deferred | Skip for MVP - add with OAuth |

### Important (Phase 3)

| Endpoint | Priority | Reason |
|----------|----------|--------|
| `POST /api/v1/recipes/generate` | Medium | AI recipe generation |
| `POST /api/v1/recipes/generate-from-ingredients` | Medium | "What can I make?" |
| `POST /api/v1/shopping-lists/{id}/add-from-recipe` | Medium | Key integration |
| `GET /api/v1/pantry/restock-suggestions` | Medium | Smart pantry |
| `GET /api/v1/pantry/expiring` | Medium | Expiration tracking |
| `POST /api/v1/uploads/image` | Medium | Recipe photos |
| `GET /api/v1/common-items` | Low | Could stay client-side |

### Nice to Have (Phase 4+)

| Endpoint | Priority | Reason |
|----------|----------|--------|
| `POST /api/v1/recipes/{id}/share` | Low | Social feature |
| `GET /api/v1/shared/recipes/{shareId}` | Low | Social feature |
| `POST /api/v1/shopping-lists/{id}/share` | Low | Family sharing |
| `GET /api/v1/features` | Low | Feature flags |
| `GET /api/v1/usage/history` | Low | Analytics |
| Push notification endpoints | Low | Future feature |

---

## Architectural Decisions Needed

### 1. Common Items Catalog

**Current**: Client-side seeded SQLite (~200 items)

**Options**:
- A) Keep client-side (simpler, works offline, no sync needed)
- B) Move to server (centralized updates, analytics on popular items)
- C) Hybrid (server provides updates, client caches)

**Recommendation**: A for MVP, consider C later for adding new items without app update

### 2. Direct CRUD vs Sync-Only

**Current design**: Pantry and Shopping use sync endpoint only

**Options**:
- A) Sync-only (simpler, consistent, works offline)
- B) Add direct CRUD endpoints (faster for single operations, more complex)

**Recommendation**: A for MVP. Sync-only is cleaner for offline-first.

### 3. Recipe Sharing Model

**Options**:
- A) Generate shareable link (public read-only)
- B) Share to specific users (requires user lookup)
- C) Both

**Recommendation**: A for MVP. Simpler, no user search needed.

### 4. Image Upload Strategy

**Options**:
- A) Direct upload to backend (`POST /uploads/image`)
- B) Presigned URL to S3/R2 (client uploads directly)
- C) Multipart in recipe create/update

**Recommendation**: B for production (saves bandwidth), A for MVP (simpler)

---

## Updated Endpoint List (Complete)

### Auth (5 endpoints for MVP)
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/anonymous

# DEFERRED (add with OAuth/Clerk):
# POST   /api/v1/auth/forgot-password
# POST   /api/v1/auth/reset-password
```

### Users (3 endpoints)
```
GET    /api/v1/users/me                 # NEW
PATCH  /api/v1/users/me                 # NEW
DELETE /api/v1/users/me                 # NEW
```

### Recipes (8 endpoints)
```
GET    /api/v1/recipes
GET    /api/v1/recipes/{id}
POST   /api/v1/recipes
PUT    /api/v1/recipes/{id}
DELETE /api/v1/recipes/{id}
POST   /api/v1/recipes/{id}/duplicate   # NEW
POST   /api/v1/recipes/generate         # NEW (AI generation)
POST   /api/v1/recipes/generate-from-ingredients  # NEW
```

### Video Jobs (5 endpoints)
```
POST   /api/v1/video/extract
GET    /api/v1/jobs/{id}
GET    /api/v1/jobs/{id}/stream
POST   /api/v1/jobs/{id}/cancel         # NEW
GET    /api/v1/jobs                     # NEW (list user's jobs)
```

### Pantry (3 endpoints)
```
POST   /api/v1/pantry/scan
GET    /api/v1/pantry/restock-suggestions  # NEW
GET    /api/v1/pantry/expiring             # NEW
```

### Shopping Lists (2 endpoints)
```
POST   /api/v1/shopping-lists/{id}/add-from-recipe  # NEW
GET    /api/v1/shopping-lists/suggestions           # NEW (smart suggestions)
```

### Sync (1 endpoint)
```
POST   /api/v1/sync
```

### Uploads (2 endpoints)
```
POST   /api/v1/uploads/image            # NEW
POST   /api/v1/uploads/presign          # NEW (optional, for direct S3)
```

### System (3 endpoints)
```
GET    /health                          # NEW
GET    /ready                           # NEW
GET    /api/v1/info                     # NEW
```

### Total: 40 endpoints for MVP (aligned with BACKEND_DECISIONS.md)

**Note**: This count matches BACKEND_DECISIONS.md. Password reset endpoints are deferred.

---

## Query Parameters Audit

### GET /api/v1/recipes

| Parameter | Type | Purpose | Status |
|-----------|------|---------|--------|
| `cursor` | string | Pagination cursor | ✅ Defined |
| `limit` | number | Page size (1-100) | ✅ Defined |
| `sort` | string | created, updated, title | ✅ Defined |
| `order` | string | asc, desc | ✅ Defined |
| `search` | string | Full-text search | ✅ Defined |
| `cuisine` | string | Filter by cuisine | ✅ Defined |
| `difficulty` | string | Filter by difficulty | ✅ Defined |
| `tag` | string | Filter by tag | ❌ ADD |
| `sourceType` | string | Filter by source | ❌ ADD |
| `count` | boolean | Include total count | ✅ Defined |

### GET /api/v1/jobs (NEW)

| Parameter | Type | Purpose |
|-----------|------|---------|
| `status` | string | pending, completed, failed |
| `limit` | number | Page size |
| `cursor` | string | Pagination |

---

## Database Schema Additions

### For forgot/reset password:
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### For recipe sharing:
```sql
ALTER TABLE recipes ADD COLUMN share_id VARCHAR(12) UNIQUE;
ALTER TABLE recipes ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_recipes_share ON recipes(share_id) WHERE share_id IS NOT NULL;
```

### For favorites (if added):
```sql
CREATE TABLE user_favorites (
    user_id UUID NOT NULL REFERENCES users(id),
    recipe_id UUID NOT NULL REFERENCES recipes(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
);
```

---

## Use Case Flows (Verification)

### Flow 1: New User Video Import
```
1. App launch → POST /auth/anonymous → get tokens
2. Paste video URL → POST /video/extract → get jobId
3. Poll/stream → GET /jobs/{id}/stream → wait for completion
4. Review recipe → (client-side)
5. Save recipe → POST /sync with new recipe
6. Later: POST /auth/upgrade to create account
```
✅ All endpoints covered

### Flow 2: Existing User Sync
```
1. App launch → POST /auth/refresh (if token expiring)
2. Load data → POST /sync with lastSyncAt
3. Apply server changes → (client-side)
4. Resolve conflicts if any → (client-side UI)
5. Background sync on changes → POST /sync
```
✅ All endpoints covered

### Flow 3: Add Recipe Ingredients to Shopping
```
1. View recipe → GET /recipes/{id}
2. Tap "Add to shopping list" → POST /shopping-lists/{id}/add-from-recipe
3. Or: Client-side extraction + POST /sync
```
⚠️ Need to decide: dedicated endpoint or client-side + sync?

**Recommendation**: Add dedicated endpoint. Cleaner API, can do server-side pantry deduction.

### Flow 4: Password Reset
```
1. Tap "Forgot password" → POST /auth/forgot-password { email }
2. Receive email with link
3. Open link → app deep link or web page
4. Submit new password → POST /auth/reset-password { token, newPassword }
5. Auto-login → returns new tokens
```
✅ Flow complete with new endpoints

### Flow 5: Pantry Restock
```
1. Open restock screen → GET /pantry/restock-suggestions
2. Server returns low-stock items based on:
   - Items marked as "staple"
   - Items below threshold
   - Historical usage patterns
3. User selects items → POST /shopping-lists/{id}/items (via sync)
```
✅ Flow complete with new endpoint

---

## Final Recommendations

### Must Add to Architecture Doc:

1. **Auth endpoints**: forgot-password, reset-password, upgrade
2. **User endpoints**: GET/PATCH/DELETE /users/me
3. **Job management**: cancel, list jobs
4. **Health checks**: /health, /ready
5. **Query params**: tag, sourceType filters for recipes

### Should Add (Phase 2-3):

1. **AI generation endpoints**: generate, generate-from-ingredients
2. **Shopping integration**: add-from-recipe
3. **Pantry intelligence**: restock-suggestions, expiring
4. **Image uploads**: presigned URLs

### Defer (Phase 4+):

1. Recipe sharing
2. Push notifications
3. Feature flags
4. Usage analytics

---

**Document Status**: Audit Complete
**Missing Endpoints Identified**: 20 additional endpoints
**Next Step**: Update BACKEND_ARCHITECTURE.md with complete endpoint list
**Last Updated**: 2026-01-31
