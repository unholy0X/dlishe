package handler

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/revenuecat"
)

// SubscriptionHandler handles subscription-related endpoints
type SubscriptionHandler struct {
	userRepo *postgres.UserRepository
	rcClient *revenuecat.Client // optional
	logger   *slog.Logger
}

// NewSubscriptionHandler creates a new subscription handler
func NewSubscriptionHandler(userRepo *postgres.UserRepository, rcClient *revenuecat.Client, logger *slog.Logger) *SubscriptionHandler {
	return &SubscriptionHandler{
		userRepo: userRepo,
		rcClient: rcClient,
		logger:   logger,
	}
}

// SubscriptionResponse is the API response for subscription status.
type SubscriptionResponse struct {
	Entitlement     string  `json:"entitlement"`
	IsActive        bool    `json:"isActive"`
	ProductID       *string `json:"productId,omitempty"`
	PeriodType      *string `json:"periodType,omitempty"`
	Store           *string `json:"store,omitempty"`
	PurchasedAt     *string `json:"purchasedAt,omitempty"`
	ExpiresAt       *string `json:"expiresAt,omitempty"`
	CancelledAt     *string `json:"cancelledAt,omitempty"`
	WillRenew       bool    `json:"willRenew"`
	HasBillingIssue bool    `json:"hasBillingIssue"`
	IsSandbox       bool    `json:"isSandbox"`
	LastSyncedAt    string  `json:"lastSyncedAt"`
	Limits          Limits  `json:"limits"`
}

// Limits represents the feature limits for the user's current tier.
type Limits struct {
	VideoExtractions int  `json:"videoExtractions"`
	PantryScans      int  `json:"pantryScans"`
	MaxRecipes       int  `json:"maxRecipes"`
	MaxShoppingLists int  `json:"maxShoppingLists"`
	MultiDeviceSync  bool `json:"multiDeviceSync"`
	RecipeSharing    bool `json:"recipeSharing"`
}

// GetSubscription handles GET /api/v1/subscription
// @Summary Get current subscription status
// @Description Returns the authenticated user's subscription status and feature limits
// @Tags Subscription
// @Produce json
// @Security BearerAuth
// @Success 200 {object} SubscriptionResponse
// @Failure 401 "Unauthorized"
// @Router /subscription [get]
func (h *SubscriptionHandler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	sub, err := h.userRepo.GetSubscription(r.Context(), user.ID)
	if err != nil {
		h.logger.Error("Failed to get subscription", "error", err, "user_id", user.ID)
		response.InternalError(w)
		return
	}

	response.OK(w, toSubscriptionResponse(sub))
}

// RefreshSubscription handles POST /api/v1/subscription/refresh
// @Summary Refresh subscription from RevenueCat
// @Description Fetches the latest subscription state from RevenueCat API and updates local cache
// @Tags Subscription
// @Produce json
// @Security BearerAuth
// @Success 200 {object} SubscriptionResponse
// @Failure 401 "Unauthorized"
// @Failure 503 "RevenueCat unavailable"
// @Router /subscription/refresh [post]
func (h *SubscriptionHandler) RefreshSubscription(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	if h.rcClient == nil {
		// No RC client configured — return current DB state
		sub, err := h.userRepo.GetSubscription(r.Context(), user.ID)
		if err != nil {
			h.logger.Error("Failed to get subscription", "error", err, "user_id", user.ID)
			response.InternalError(w)
			return
		}
		response.OK(w, toSubscriptionResponse(sub))
		return
	}

	// Fetch from RevenueCat API
	ctx := r.Context()
	subscriber, err := h.rcClient.GetSubscriber(ctx, user.ID.String())
	if err != nil {
		h.logger.Error("Failed to fetch subscriber from RevenueCat",
			"error", err,
			"user_id", user.ID,
		)
		// Fallback to cached DB state
		sub, dbErr := h.userRepo.GetSubscription(ctx, user.ID)
		if dbErr != nil {
			response.InternalError(w)
			return
		}
		response.OK(w, toSubscriptionResponse(sub))
		return
	}

	// Build subscription from API response
	sub := &model.UserSubscription{
		UserID:              user.ID,
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

	if productID, activeSub, found := subscriber.Subscriber.ActiveSubscription(); found {
		sub.ProductID = &productID
		sub.PeriodType = &activeSub.PeriodType
		sub.Store = &activeSub.Store
		sub.IsSandbox = activeSub.IsSandbox
		sub.WillRenew = activeSub.UnsubscribeDetectedAt == nil
		sub.HasBillingIssue = activeSub.BillingIssueDetectedAt != nil

		if activeSub.ExpiresDate != nil {
			if t, err := time.Parse(time.RFC3339, *activeSub.ExpiresDate); err == nil {
				sub.ExpiresAt = &t
			}
		}
	}

	// Persist synced state
	if err := h.userRepo.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("Failed to upsert subscription after refresh",
			"error", err,
			"user_id", user.ID,
		)
		// Still return the fetched data even if persist fails
	}

	response.OK(w, toSubscriptionResponse(sub))
}

// toSubscriptionResponse converts a model to API response.
func toSubscriptionResponse(sub *model.UserSubscription) SubscriptionResponse {
	limits := sub.GetLimits()

	resp := SubscriptionResponse{
		Entitlement:     sub.Entitlement,
		IsActive:        sub.IsActive,
		ProductID:       sub.ProductID,
		PeriodType:      sub.PeriodType,
		Store:           sub.Store,
		WillRenew:       sub.WillRenew,
		HasBillingIssue: sub.HasBillingIssue,
		IsSandbox:       sub.IsSandbox,
		LastSyncedAt:    sub.LastSyncedAt.Format(time.RFC3339),
		Limits: Limits{
			VideoExtractions: limits.VideoExtractions,
			PantryScans:      limits.PantryScans,
			MaxRecipes:       limits.MaxRecipes,
			MaxShoppingLists: limits.MaxShoppingLists,
			MultiDeviceSync:  limits.MultiDeviceSync,
			RecipeSharing:    limits.RecipeSharing,
		},
	}

	if sub.PurchasedAt != nil {
		s := sub.PurchasedAt.Format(time.RFC3339)
		resp.PurchasedAt = &s
	}
	if sub.ExpiresAt != nil {
		s := sub.ExpiresAt.Format(time.RFC3339)
		resp.ExpiresAt = &s
	}
	if sub.CancelledAt != nil {
		s := sub.CancelledAt.Format(time.RFC3339)
		resp.CancelledAt = &s
	}

	return resp
}
