package model

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// User represents a DLISHE user
type User struct {
	ID                  uuid.UUID  `json:"id" db:"id"`
	ClerkID             *string    `json:"clerkId,omitempty" db:"clerk_id"`
	Email               *string    `json:"email,omitempty" db:"email"`
	PasswordHash        *string    `json:"-" db:"password_hash"`
	Name                *string    `json:"name,omitempty" db:"name"`
	PreferredUnitSystem string     `json:"preferredUnitSystem" db:"preferred_unit_system"`
	IsAnonymous         bool       `json:"isAnonymous" db:"is_anonymous"`
	DeviceID            *string    `json:"deviceId,omitempty" db:"device_id"`
	CreatedAt           time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time  `json:"updatedAt" db:"updated_at"`
	DeletedAt           *time.Time `json:"-" db:"deleted_at"`
}

// UserSubscription represents a user's subscription status
type UserSubscription struct {
	UserID              uuid.UUID  `json:"userId" db:"user_id"`
	Entitlement         string     `json:"entitlement" db:"entitlement"` // "free" or "pro"
	IsActive            bool       `json:"isActive" db:"is_active"`
	ProductID           *string    `json:"productId,omitempty" db:"product_id"`
	PeriodType          *string    `json:"periodType,omitempty" db:"period_type"` // "trial", "intro", "normal"
	Store               *string    `json:"store,omitempty" db:"store"`            // "APP_STORE", "PLAY_STORE"
	PurchasedAt         *time.Time `json:"purchasedAt,omitempty" db:"purchased_at"`
	ExpiresAt           *time.Time `json:"expiresAt,omitempty" db:"expires_at"`
	CancelledAt         *time.Time `json:"cancelledAt,omitempty" db:"cancelled_at"`
	WillRenew           bool       `json:"willRenew" db:"will_renew"`
	HasBillingIssue     bool       `json:"hasBillingIssue" db:"has_billing_issue"`
	IsSandbox           bool       `json:"isSandbox" db:"is_sandbox"`
	LastSyncedAt        time.Time  `json:"lastSyncedAt" db:"last_synced_at"`
	RevenueCatUpdatedAt *time.Time `json:"revenueCatUpdatedAt,omitempty" db:"revenuecat_updated_at"`
	CreatedAt           time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time  `json:"updatedAt" db:"updated_at"`
}

// UsageQuota tracks a user's usage for a specific feature
type UsageQuota struct {
	ID          uuid.UUID `json:"id" db:"id"`
	UserID      uuid.UUID `json:"userId" db:"user_id"`
	QuotaType   string    `json:"quotaType" db:"quota_type"` // "video_extractions", "pantry_scans"
	PeriodStart time.Time `json:"periodStart" db:"period_start"`
	PeriodEnd   time.Time `json:"periodEnd" db:"period_end"`
	Used        int       `json:"used" db:"used"`
	LimitValue  int       `json:"limit" db:"limit_value"`
	Entitlement string    `json:"entitlement" db:"entitlement"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
}

// RefreshToken represents a stored refresh token
type RefreshToken struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	UserID     uuid.UUID  `json:"userId" db:"user_id"`
	TokenHash  string     `json:"-" db:"token_hash"`
	DeviceName *string    `json:"deviceName,omitempty" db:"device_name"`
	ExpiresAt  time.Time  `json:"expiresAt" db:"expires_at"`
	CreatedAt  time.Time  `json:"createdAt" db:"created_at"`
	RevokedAt  *time.Time `json:"revokedAt,omitempty" db:"revoked_at"`
}

// NewAnonymousUser creates a new anonymous user
func NewAnonymousUser(deviceID string) *User {
	return &User{
		ID:          uuid.New(),
		IsAnonymous: true,
		DeviceID:    &deviceID,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
}

// QuotaLimits defines the limits for each tier
type QuotaLimits struct {
	Extractions      int // All extraction types (video, url, image)
	PantryScans      int
	MaxRecipes       int
	MaxShoppingLists int
	MultiDeviceSync  bool
	RecipeSharing    bool
}

// TierLimits maps entitlement tiers to their limits.
//
// Pricing: Free / Pro ($2.99/mo or $19.99/yr)
// Products: com.dlishe.pro.monthly, com.dlishe.pro.yearly
// RevenueCat entitlement ID: "pro"
var TierLimits = map[string]QuotaLimits{
	"free": {
		Extractions:      10,
		PantryScans:      5,
		MaxRecipes:       25,
		MaxShoppingLists: -1, // Unlimited
		MultiDeviceSync:  false,
		RecipeSharing:    false,
	},
	"pro": {
		Extractions:      -1, // Unlimited
		PantryScans:      -1,
		MaxRecipes:       -1,
		MaxShoppingLists: -1,
		MultiDeviceSync:  true,
		RecipeSharing:    true,
	},
	"admin": {
		Extractions:      -1, // Unlimited
		PantryScans:      -1,
		MaxRecipes:       -1,
		MaxShoppingLists: -1,
		MultiDeviceSync:  true,
		RecipeSharing:    true,
	},
}

// GetLimits returns the quota limits for a user's entitlement
func (u *UserSubscription) GetLimits() QuotaLimits {
	if limits, ok := TierLimits[u.Entitlement]; ok {
		return limits
	}
	return TierLimits["free"]
}

// IsAdminEmail checks if the given email is in the admin whitelist.
// Comparison is case-insensitive and trimmed. Safe for nil email pointers.
func IsAdminEmail(email *string, adminEmails []string) bool {
	if email == nil || len(adminEmails) == 0 {
		return false
	}
	normalized := strings.TrimSpace(strings.ToLower(*email))
	if normalized == "" {
		return false
	}
	for _, admin := range adminEmails {
		if admin == normalized {
			return true
		}
	}
	return false
}
