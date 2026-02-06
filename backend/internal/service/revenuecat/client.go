package revenuecat

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const baseURL = "https://api.revenuecat.com/v1"

// Client communicates with the RevenueCat REST API v1.
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a RevenueCat API client.
// apiKey should be the secret API key from the RevenueCat dashboard.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SubscriberResponse is the top-level response from GET /v1/subscribers/{app_user_id}.
type SubscriberResponse struct {
	RequestDate string     `json:"request_date"`
	Subscriber  Subscriber `json:"subscriber"`
}

// Subscriber represents a RevenueCat customer.
type Subscriber struct {
	Entitlements    map[string]Entitlement    `json:"entitlements"`
	FirstSeen       string                    `json:"first_seen"`
	LastSeen        string                    `json:"last_seen"`
	ManagementURL   *string                   `json:"management_url"`
	OriginalAppUID  *string                   `json:"original_app_user_id"`
	Subscriptions   map[string]Subscription   `json:"subscriptions"`
	NonSubscription map[string][]NonSubscription `json:"non_subscriptions"`
}

// Entitlement represents an active entitlement for a subscriber.
type Entitlement struct {
	ExpiresDate            *string `json:"expires_date"`
	GracePeriodExpiresDate *string `json:"grace_period_expires_date"`
	ProductIdentifier      string  `json:"product_identifier"`
	PurchaseDate           string  `json:"purchase_date"`
}

// Subscription represents a subscription product for a subscriber.
type Subscription struct {
	BillingIssueDetectedAt *string `json:"billing_issues_detected_at"`
	ExpiresDate            *string `json:"expires_date"`
	GracePeriodExpiresDate *string `json:"grace_period_expires_date"`
	IsSandbox              bool    `json:"is_sandbox"`
	OriginalPurchaseDate   string  `json:"original_purchase_date"`
	PeriodType             string  `json:"period_type"`
	PurchaseDate           string  `json:"purchase_date"`
	Store                  string  `json:"store"`
	UnsubscribeDetectedAt  *string `json:"unsubscribe_detected_at"`
}

// NonSubscription represents a non-subscription purchase.
type NonSubscription struct {
	ID           string `json:"id"`
	IsSandbox    bool   `json:"is_sandbox"`
	PurchaseDate string `json:"purchase_date"`
	Store        string `json:"store"`
}

// GetSubscriber fetches the current subscriber info from RevenueCat.
// This is the recommended way to get the definitive subscription state.
func (c *Client) GetSubscriber(ctx context.Context, appUserID string) (*SubscriberResponse, error) {
	url := fmt.Sprintf("%s/subscribers/%s", baseURL, appUserID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("revenuecat: create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("revenuecat: request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("revenuecat: read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("revenuecat: API returned %d: %s", resp.StatusCode, string(body))
	}

	var result SubscriberResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("revenuecat: decode response: %w", err)
	}

	return &result, nil
}

// HasActiveEntitlement checks if a subscriber has a specific active entitlement.
func (s *Subscriber) HasActiveEntitlement(entitlementID string) bool {
	ent, ok := s.Entitlements[entitlementID]
	if !ok {
		return false
	}
	if ent.ExpiresDate == nil {
		// Non-expiring entitlement (lifetime purchase)
		return true
	}
	expires, err := time.Parse(time.RFC3339, *ent.ExpiresDate)
	if err != nil {
		return false
	}
	return expires.After(time.Now())
}

// ActiveSubscription returns the first active subscription, if any.
func (s *Subscriber) ActiveSubscription() (productID string, sub Subscription, found bool) {
	now := time.Now()
	for pid, subscription := range s.Subscriptions {
		if subscription.ExpiresDate == nil {
			continue
		}
		expires, err := time.Parse(time.RFC3339, *subscription.ExpiresDate)
		if err != nil {
			continue
		}
		if expires.After(now) {
			return pid, subscription, true
		}
	}
	return "", Subscription{}, false
}
