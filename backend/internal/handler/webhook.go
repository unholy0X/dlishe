package handler

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/dishflow/backend/internal/config"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/service/revenuecat"
	"github.com/google/uuid"
)

// maxReasonableExpiry is the maximum expiration date we accept from RevenueCat.
// Anything beyond this is treated as a lifetime purchase (stored as nil).
// RevenueCat sometimes sends sandbox/lifetime subs with expiry dates decades in the future.
const maxExpiryYears = 3

// WebhookHandler handles external webhooks
type WebhookHandler struct {
	cfg      *config.Config
	logger   *slog.Logger
	userRepo UserRepository
	rcClient *revenuecat.Client // optional, used to fetch definitive state
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(cfg *config.Config, logger *slog.Logger, userRepo UserRepository, rcClient *revenuecat.Client) *WebhookHandler {
	return &WebhookHandler{
		cfg:      cfg,
		logger:   logger,
		userRepo: userRepo,
		rcClient: rcClient,
	}
}

// RevenueCatWebhook represents the full webhook payload from RevenueCat.
// Docs: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
type RevenueCatWebhook struct {
	APIVersion string              `json:"api_version"`
	Event      RevenueCatEventBody `json:"event"`
}

// RevenueCatEventBody contains all fields sent in a webhook event.
type RevenueCatEventBody struct {
	ID                        string            `json:"id"`
	Type                      string            `json:"type"`
	AppID                     string            `json:"app_id"`
	AppUserID                 string            `json:"app_user_id"`
	OriginalAppUserID         string            `json:"original_app_user_id"`
	Aliases                   []string          `json:"aliases"`
	ProductID                 string            `json:"product_id"`
	NewProductID              string            `json:"new_product_id,omitempty"` // PRODUCT_CHANGE only
	EntitlementIDs            []string          `json:"entitlement_ids"`
	PeriodType                string            `json:"period_type"`
	PurchasedAtMs             *int64            `json:"purchased_at_ms"`
	ExpirationAtMs            *int64            `json:"expiration_at_ms"`
	GracePeriodExpirationAtMs *int64            `json:"grace_period_expiration_at_ms,omitempty"`
	AutoResumeAtMs            *int64            `json:"auto_resume_at_ms,omitempty"` // SUBSCRIPTION_PAUSED
	Store                     string            `json:"store"`
	Environment               string            `json:"environment"`
	EventTimestampMs          int64             `json:"event_timestamp_ms"`
	IsTrialConversion         *bool             `json:"is_trial_conversion,omitempty"`
	IsFamilyShare             bool              `json:"is_family_share"`
	CountryCode               string            `json:"country_code"`
	Currency                  string            `json:"currency"`
	Price                     float64           `json:"price"`
	PriceInPurchasedCurrency  float64           `json:"price_in_purchased_currency"`
	TaxPercentage             float64           `json:"tax_percentage"`
	CommissionPercentage      float64           `json:"commission_percentage"`
	TakeHomePercentage        float64           `json:"takehome_percentage"`
	TransactionID             string            `json:"transaction_id"`
	OriginalTransactionID     string            `json:"original_transaction_id"`
	PresentedOfferingID       string            `json:"presented_offering_id"`
	OfferCode                 string            `json:"offer_code"`
	CancelReason              string            `json:"cancel_reason,omitempty"`
	ExpirationReason          string            `json:"expiration_reason,omitempty"`
	SubscriberAttributes      map[string]RCAttr `json:"subscriber_attributes"`
	TransferredFrom           []string          `json:"transferred_from,omitempty"` // TRANSFER only
	TransferredTo             []string          `json:"transferred_to,omitempty"`   // TRANSFER only
}

// RCAttr is a RevenueCat subscriber attribute.
type RCAttr struct {
	Value       string `json:"value"`
	UpdatedAtMs int64  `json:"updated_at_ms"`
}

// HandleRevenueCat handles POST /api/v1/webhooks/revenuecat
// @Summary Handle RevenueCat webhook
// @Description Receives subscription updates from RevenueCat
// @Tags Webhooks
// @Accept json
// @Produce json
// @Success 200 "Webhook processed"
// @Failure 401 "Unauthorized"
// @Failure 500 "Internal Server Error"
// @Router /webhooks/revenuecat [post]
func (h *WebhookHandler) HandleRevenueCat(w http.ResponseWriter, r *http.Request) {
	// 1. Authenticate the webhook source
	if h.cfg.RevenueCatWebhookSecret == "" {
		h.logger.Error("RevenueCat webhook secret not configured, rejecting request")
		response.Unauthorized(w, "Webhook not configured")
		return
	}
	authHeader := r.Header.Get("Authorization")
	if authHeader != "Bearer "+h.cfg.RevenueCatWebhookSecret {
		h.logger.Warn("Unauthorized webhook attempt", "ip", r.RemoteAddr)
		response.Unauthorized(w, "Invalid webhook secret")
		return
	}

	// 2. Read raw body (we need it for both parsing and idempotency logging)
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("Failed to read webhook body", "error", err)
		response.BadRequest(w, "Failed to read body")
		return
	}

	var payload RevenueCatWebhook
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		h.logger.Error("Failed to decode webhook payload", "error", err)
		response.BadRequest(w, "Invalid JSON")
		return
	}

	event := payload.Event
	ctx := r.Context()

	h.logger.Info("Received RevenueCat event",
		"event_id", event.ID,
		"type", event.Type,
		"app_user_id", event.AppUserID,
		"product_id", event.ProductID,
		"environment", event.Environment,
	)

	// 3. Handle TEST events from RevenueCat dashboard
	if event.Type == "TEST" {
		h.logger.Info("Received TEST webhook from RevenueCat")
		response.OK(w, map[string]string{"status": "test_received"})
		return
	}

	// 4. Idempotency check — skip if this event was already processed
	if event.ID != "" {
		processed, err := h.userRepo.IsEventProcessed(ctx, event.ID)
		if err != nil {
			h.logger.Error("Failed to check event idempotency", "error", err)
			// Don't fail the webhook — proceed but log the error
		} else if processed {
			h.logger.Info("Skipping duplicate event", "event_id", event.ID)
			response.OK(w, map[string]string{"status": "already_processed"})
			return
		}
	}

	// 5. For TRANSFER events, handle sender and receiver separately
	if event.Type == "TRANSFER" {
		h.handleTransferEvent(ctx, &event, rawBody)
		response.OK(w, map[string]string{"status": "processed"})
		return
	}

	// 6. Resolve User ID — try all available identifiers from the event
	userID, found := h.resolveUserID(ctx, &event)
	if !found {
		h.logger.Warn("Webhook for unknown user, ignoring",
			"app_user_id", event.AppUserID,
			"original_app_user_id", event.OriginalAppUserID,
			"aliases", event.Aliases,
			"type", event.Type,
		)
		// Return 200 so RevenueCat doesn't retry
		response.OK(w, map[string]string{"status": "ignored_unknown_user"})
		return
	}

	// 7. Build subscription update from event
	subUpdate := h.buildSubscriptionUpdate(userID, &event)

	// 8. Apply event-specific logic
	h.applyEventLogic(subUpdate, &event)

	// 9. Persist subscription state
	if err := h.userRepo.UpsertSubscription(ctx, subUpdate); err != nil {
		h.logger.Error("Failed to upsert subscription", "error", err, "user_id", userID)
		response.InternalError(w)
		return
	}

	// 10. Log event for idempotency
	if event.ID != "" {
		if err := h.userRepo.LogEvent(ctx, event.ID, event.Type, event.AppUserID, json.RawMessage(rawBody)); err != nil {
			h.logger.Error("Failed to log event", "error", err, "event_id", event.ID)
			// Non-fatal: the subscription was already updated
		}
	}

	// 11. Optionally sync definitive state from RevenueCat API (best practice)
	// This runs async so we can respond 200 quickly.
	if h.rcClient != nil {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					h.logger.Error("Panic in syncFromAPI", "error", r, "user_id", userID)
				}
			}()
			h.syncFromAPI(userID, event.AppUserID)
		}()
	}

	response.OK(w, map[string]string{"status": "processed"})
}

// handleTransferEvent processes TRANSFER events by explicitly handling the
// recipient (activate pro) and sender (deactivate to free) as separate operations.
// This prevents the bug where both sender and receiver get upgraded.
func (h *WebhookHandler) handleTransferEvent(ctx context.Context, event *RevenueCatEventBody, rawBody []byte) {
	h.logger.Info("Processing TRANSFER event",
		"transferred_from", event.TransferredFrom,
		"transferred_to", event.TransferredTo,
		"app_user_id", event.AppUserID,
	)

	// 1. Deactivate subscription for the SENDER (transferred_from)
	for _, fromID := range event.TransferredFrom {
		senderID, found := h.resolveCandidate(ctx, fromID)
		if !found {
			h.logger.Warn("TRANSFER sender not found in DB, skipping deactivation",
				"transferred_from_id", fromID)
			continue
		}

		senderSub := &model.UserSubscription{
			UserID:              senderID,
			IsActive:            false,
			Entitlement:         "free",
			WillRenew:           false,
			HasBillingIssue:     false,
			LastSyncedAt:        time.Now().UTC(),
			RevenueCatUpdatedAt: ptr(time.Now().UTC()),
			IsSandbox:           event.Environment == "SANDBOX",
		}

		if err := h.userRepo.UpsertSubscription(ctx, senderSub); err != nil {
			h.logger.Error("Failed to deactivate TRANSFER sender",
				"error", err, "sender_id", senderID)
		} else {
			h.logger.Info("TRANSFER: deactivated sender",
				"sender_id", senderID, "transferred_from_id", fromID)
		}
	}

	// 2. Activate subscription for the RECEIVER (transferred_to)
	for _, toID := range event.TransferredTo {
		receiverID, found := h.resolveCandidate(ctx, toID)
		if !found {
			h.logger.Warn("TRANSFER receiver not found in DB, skipping activation",
				"transferred_to_id", toID)
			continue
		}

		receiverSub := h.buildSubscriptionUpdate(receiverID, event)
		receiverSub.IsActive = true
		receiverSub.Entitlement = "pro"
		receiverSub.WillRenew = true
		receiverSub.HasBillingIssue = false

		if err := h.userRepo.UpsertSubscription(ctx, receiverSub); err != nil {
			h.logger.Error("Failed to activate TRANSFER receiver",
				"error", err, "receiver_id", receiverID)
		} else {
			h.logger.Info("TRANSFER: activated receiver",
				"receiver_id", receiverID, "transferred_to_id", toID)
		}

		// Sync receiver from API for definitive state
		if h.rcClient != nil {
			go func(uid uuid.UUID, appID string) {
				defer func() {
					if r := recover(); r != nil {
						h.logger.Error("Panic in syncFromAPI", "error", r, "user_id", uid)
					}
				}()
				h.syncFromAPI(uid, appID)
			}(receiverID, toID)
		}
	}

	// 3. If neither sender nor receiver found, try app_user_id as fallback
	// (RC sometimes puts the recipient in app_user_id for TRANSFER events)
	if len(event.TransferredTo) == 0 {
		userID, found := h.resolveUserID(ctx, event)
		if found {
			h.logger.Warn("TRANSFER event with no transferred_to, falling back to app_user_id",
				"user_id", userID, "app_user_id", event.AppUserID)
			sub := h.buildSubscriptionUpdate(userID, event)
			sub.IsActive = true
			sub.Entitlement = "pro"
			sub.WillRenew = true
			if err := h.userRepo.UpsertSubscription(ctx, sub); err != nil {
				h.logger.Error("Failed to upsert TRANSFER fallback", "error", err, "user_id", userID)
			}
		}
	}

	// 4. Log event for idempotency
	if event.ID != "" {
		if err := h.userRepo.LogEvent(ctx, event.ID, event.Type, event.AppUserID, json.RawMessage(rawBody)); err != nil {
			h.logger.Error("Failed to log TRANSFER event", "error", err, "event_id", event.ID)
		}
	}
}

// resolveCandidate resolves a single candidate ID to a user UUID.
// It tries parsing as UUID first, then looks up by Clerk ID.
func (h *WebhookHandler) resolveCandidate(ctx context.Context, candidate string) (uuid.UUID, bool) {
	if candidate == "" || strings.HasPrefix(candidate, "$RCAnonymousID:") {
		return uuid.UUID{}, false
	}

	// Try as UUID
	if uid, err := uuid.Parse(candidate); err == nil {
		return uid, true
	}

	// Try as Clerk ID
	if user, err := h.userRepo.GetByClerkID(ctx, candidate); err == nil {
		return user.ID, true
	}

	return uuid.UUID{}, false
}

// resolveUserID tries all available identifiers from a webhook event to find the user.
// It checks app_user_id, original_app_user_id, and aliases.
// TRANSFER event fields (transferred_to/from) are NOT included here —
// they are handled separately in handleTransferEvent to avoid upgrading the sender.
func (h *WebhookHandler) resolveUserID(ctx context.Context, event *RevenueCatEventBody) (uuid.UUID, bool) {
	// Collect all candidate IDs to try, in priority order
	candidates := make([]string, 0, 8)

	// Primary: app_user_id
	if event.AppUserID != "" {
		candidates = append(candidates, event.AppUserID)
	}

	// Secondary: original_app_user_id
	if event.OriginalAppUserID != "" && event.OriginalAppUserID != event.AppUserID {
		candidates = append(candidates, event.OriginalAppUserID)
	}

	// Tertiary: aliases
	for _, alias := range event.Aliases {
		candidates = append(candidates, alias)
	}

	// Try each candidate: first as UUID, then as Clerk ID
	seen := make(map[string]bool, len(candidates))
	for _, candidate := range candidates {
		if candidate == "" || seen[candidate] {
			continue
		}
		seen[candidate] = true

		if uid, found := h.resolveCandidate(ctx, candidate); found {
			return uid, true
		}
	}

	return uuid.UUID{}, false
}

// buildSubscriptionUpdate creates the base UserSubscription from event metadata.
// Expiry dates are validated — dates more than maxExpiryYears in the future are
// treated as lifetime purchases and stored as nil.
func (h *WebhookHandler) buildSubscriptionUpdate(userID uuid.UUID, event *RevenueCatEventBody) *model.UserSubscription {
	sub := &model.UserSubscription{
		UserID:              userID,
		RevenueCatUpdatedAt: ptr(time.Now().UTC()),
		LastSyncedAt:        time.Now().UTC(),
		IsSandbox:           event.Environment == "SANDBOX",
	}

	if event.Store != "" {
		sub.Store = &event.Store
	}
	if event.ProductID != "" {
		sub.ProductID = &event.ProductID
	}
	if event.PeriodType != "" {
		sub.PeriodType = &event.PeriodType
	}
	if event.PurchasedAtMs != nil && *event.PurchasedAtMs > 0 {
		t := time.UnixMilli(*event.PurchasedAtMs).UTC()
		sub.PurchasedAt = &t
	}
	if event.ExpirationAtMs != nil && *event.ExpirationAtMs > 0 {
		t := time.UnixMilli(*event.ExpirationAtMs).UTC()
		sub.ExpiresAt = h.sanitizeExpiryDate(t)
	}

	return sub
}

// sanitizeExpiryDate validates an expiration date.
// Returns nil for dates unreasonably far in the future (lifetime/sandbox artifacts).
// Returns a pointer to the date if it's within the acceptable range.
func (h *WebhookHandler) sanitizeExpiryDate(t time.Time) *time.Time {
	now := time.Now().UTC()

	maxExpiry := now.AddDate(maxExpiryYears, 0, 0)
	if t.After(maxExpiry) {
		h.logger.Warn("Expiry date too far in future, treating as lifetime (nil)",
			"raw_expiry", t.Format(time.RFC3339),
			"max_allowed", maxExpiry.Format(time.RFC3339),
		)
		return nil
	}

	return &t
}

// applyEventLogic sets IsActive, Entitlement, WillRenew, etc. based on event type.
// TRANSFER events are handled separately in handleTransferEvent and never reach here.
func (h *WebhookHandler) applyEventLogic(sub *model.UserSubscription, event *RevenueCatEventBody) {
	switch event.Type {

	case "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION":
		sub.IsActive = true
		sub.Entitlement = h.resolveEntitlement(event)
		sub.WillRenew = true
		sub.HasBillingIssue = false
		sub.CancelledAt = nil

	case "NON_RENEWING_PURCHASE":
		sub.IsActive = true
		sub.Entitlement = h.resolveEntitlement(event)
		sub.WillRenew = false

	case "PRODUCT_CHANGE":
		// User upgraded or downgraded. The new product takes effect at next renewal.
		// Use the new_product_id going forward.
		sub.IsActive = true
		sub.Entitlement = h.resolveEntitlement(event)
		sub.WillRenew = true
		if event.NewProductID != "" {
			sub.ProductID = &event.NewProductID
		}

	case "CANCELLATION":
		// Auto-renew turned off. User still has access until expiration_at.
		sub.WillRenew = false
		now := time.Now().UTC()
		sub.CancelledAt = &now
		// Keep IsActive=true and current entitlement — access continues until expiry
		sub.IsActive = true
		sub.Entitlement = h.resolveEntitlement(event)

	case "EXPIRATION":
		sub.IsActive = false
		sub.Entitlement = "free"
		sub.WillRenew = false

	case "BILLING_ISSUE":
		sub.HasBillingIssue = true
		// Keep access active during grace period
		sub.IsActive = true
		sub.Entitlement = h.resolveEntitlement(event)

	case "SUBSCRIPTION_PAUSED":
		// Play Store only — user paused, access ends
		sub.IsActive = false
		sub.Entitlement = "free"
		// WillRenew stays true since the user intends to resume
		sub.WillRenew = true

	case "SUBSCRIPTION_EXTENDED":
		// Extended by Apple/support — reactivate
		sub.IsActive = true
		sub.Entitlement = h.resolveEntitlement(event)

	case "REFUND_REVERSED":
		// A refund was reversed, user gets access back
		sub.IsActive = true
		sub.Entitlement = h.resolveEntitlement(event)

	default:
		// Unknown or new event type — log and accept (don't cause retries)
		h.logger.Warn("Unhandled RevenueCat event type", "type", event.Type)
	}
}

// resolveEntitlement checks the event's entitlement_ids to determine the tier.
func (h *WebhookHandler) resolveEntitlement(event *RevenueCatEventBody) string {
	for _, eid := range event.EntitlementIDs {
		if eid == "pro" {
			return "pro"
		}
	}
	// If the event has entitlement_ids but none match "pro", use what RC sent.
	// This handles future tiers gracefully.
	if len(event.EntitlementIDs) > 0 {
		return event.EntitlementIDs[0]
	}
	// Fallback: any purchase event without entitlement_ids implies pro
	return "pro"
}

// syncFromAPI fetches the definitive subscriber state from RevenueCat API
// and updates the local database. This is the recommended approach per RC docs.
// Expiry dates from the API are also validated.
func (h *WebhookHandler) syncFromAPI(userID uuid.UUID, appUserID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	subscriber, err := h.rcClient.GetSubscriber(ctx, appUserID)
	if err != nil {
		h.logger.Error("Failed to fetch subscriber from RevenueCat API",
			"error", err,
			"app_user_id", appUserID,
		)
		return
	}

	// Determine definitive state from API response
	sub := &model.UserSubscription{
		UserID:              userID,
		LastSyncedAt:        time.Now().UTC(),
		RevenueCatUpdatedAt: ptr(time.Now().UTC()),
	}

	if subscriber.Subscriber.HasActiveEntitlement("pro") {
		sub.IsActive = true
		sub.Entitlement = "pro"
	} else {
		sub.IsActive = false
		sub.Entitlement = "free"
	}

	// Get active subscription details
	if productID, activeSub, found := subscriber.Subscriber.ActiveSubscription(); found {
		sub.ProductID = &productID
		sub.PeriodType = &activeSub.PeriodType
		sub.Store = &activeSub.Store
		sub.IsSandbox = activeSub.IsSandbox
		sub.WillRenew = activeSub.UnsubscribeDetectedAt == nil
		sub.HasBillingIssue = activeSub.BillingIssueDetectedAt != nil

		if activeSub.ExpiresDate != nil {
			if t, err := time.Parse(time.RFC3339, *activeSub.ExpiresDate); err == nil {
				sub.ExpiresAt = h.sanitizeExpiryDate(t)
			}
		}
	}

	if err := h.userRepo.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("Failed to sync subscription from API",
			"error", err,
			"user_id", userID,
		)
	} else {
		h.logger.Info("Synced subscription from RevenueCat API",
			"user_id", userID,
			"entitlement", sub.Entitlement,
			"is_active", sub.IsActive,
			"expires_at", sub.ExpiresAt,
		)
	}
}

func ptr[T any](v T) *T {
	return &v
}
