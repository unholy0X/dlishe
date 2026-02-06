package model

import (
	"crypto/sha256"
	"encoding/hex"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

// CacheTTL is the default cache duration for extraction results
const CacheTTL = 30 * 24 * time.Hour // 30 days

// ExtractionCache represents a cached extraction result
type ExtractionCache struct {
	ID               uuid.UUID             `json:"id" db:"id"`
	URLHash          string                `json:"urlHash" db:"url_hash"`
	NormalizedURL    string                `json:"normalizedUrl" db:"normalized_url"`
	ExtractionResult *CachedExtractionData `json:"extractionResult" db:"extraction_result"`
	CreatedAt        time.Time             `json:"createdAt" db:"created_at"`
	ExpiresAt        time.Time             `json:"expiresAt" db:"expires_at"`
	HitCount         int                   `json:"hitCount" db:"hit_count"`
}

// CachedExtractionData contains the full extraction + enrichment result
type CachedExtractionData struct {
	// Basic recipe data from extraction
	Title       string             `json:"title"`
	Description string             `json:"description,omitempty"`
	Servings    int                `json:"servings,omitempty"`
	PrepTime    int                `json:"prepTime,omitempty"`
	CookTime    int                `json:"cookTime,omitempty"`
	Difficulty  string             `json:"difficulty,omitempty"`
	Cuisine     string             `json:"cuisine,omitempty"`
	Ingredients []CachedIngredient `json:"ingredients"`
	Steps       []CachedStep       `json:"steps"`
	Tags        []string           `json:"tags,omitempty"`
	SourceURL   string             `json:"sourceUrl,omitempty"`
	ImageURL    string             `json:"imageUrl,omitempty"`

	// Enrichment data
	Nutrition   *RecipeNutrition `json:"nutrition,omitempty"`
	DietaryInfo *DietaryInfo     `json:"dietaryInfo,omitempty"`
}

// CachedIngredient is a simplified ingredient for caching
type CachedIngredient struct {
	Name           string  `json:"name"`
	Quantity       string  `json:"quantity,omitempty"`
	Unit           string  `json:"unit,omitempty"`
	Category       string  `json:"category"`
	Section        string  `json:"section,omitempty"`
	IsOptional     bool    `json:"isOptional,omitempty"`
	Notes          string  `json:"notes,omitempty"`
	VideoTimestamp float64 `json:"videoTimestamp,omitempty"`
}

// CachedStep is a simplified step for caching
type CachedStep struct {
	StepNumber          int     `json:"stepNumber"`
	Instruction         string  `json:"instruction"`
	DurationSeconds     int     `json:"durationSeconds,omitempty"`
	Technique           string  `json:"technique,omitempty"`
	Temperature         string  `json:"temperature,omitempty"`
	VideoTimestampStart float64 `json:"videoTimestampStart,omitempty"`
	VideoTimestampEnd   float64 `json:"videoTimestampEnd,omitempty"`
}

// NewExtractionCache creates a new cache entry
func NewExtractionCache(rawURL string, data *CachedExtractionData) *ExtractionCache {
	normalized := NormalizeURL(rawURL)
	now := time.Now().UTC()

	return &ExtractionCache{
		ID:               uuid.New(),
		URLHash:          HashURL(normalized),
		NormalizedURL:    normalized,
		ExtractionResult: data,
		CreatedAt:        now,
		ExpiresAt:        now.Add(CacheTTL),
		HitCount:         0,
	}
}

// IsExpired checks if the cache entry has expired
func (c *ExtractionCache) IsExpired() bool {
	return time.Now().UTC().After(c.ExpiresAt)
}

// HashURL computes SHA256 hash of a URL for cache key
func HashURL(normalizedURL string) string {
	hash := sha256.Sum256([]byte(normalizedURL))
	return hex.EncodeToString(hash[:])
}

// NormalizeURL normalizes a URL for consistent cache lookups
func NormalizeURL(rawURL string) string {
	// Remove trailing garbage characters (quotes, commas, spaces, etc.)
	rawURL = strings.TrimSpace(rawURL)
	rawURL = strings.Trim(rawURL, `"',;`)

	// Decode common URL encodings that might cause duplicates
	rawURL = strings.ReplaceAll(rawURL, "%22", "") // Remove URL-encoded quotes
	rawURL = strings.ReplaceAll(rawURL, "%27", "") // Remove URL-encoded single quotes
	rawURL = strings.ReplaceAll(rawURL, "%2C", "") // Remove URL-encoded commas

	// Parse URL
	u, err := url.Parse(rawURL)
	if err != nil {
		return strings.ToLower(rawURL)
	}

	// Lowercase scheme and host
	u.Scheme = strings.ToLower(u.Scheme)
	u.Host = strings.ToLower(u.Host)

	// Remove www. prefix
	u.Host = strings.TrimPrefix(u.Host, "www.")

	// Standardize platform-specific URLs
	u.Host, u.Path, u.RawQuery = normalizeVideoURL(u.Host, u.Path, u.RawQuery)

	// Remove tracking and video-specific parameters
	u.RawQuery = removeTrackingParams(u.RawQuery)

	// Remove trailing slashes from path
	u.Path = strings.TrimSuffix(u.Path, "/")

	// Remove fragment
	u.Fragment = ""

	return u.String()
}

// normalizeVideoURL standardizes various video platform URL formats
func normalizeVideoURL(host, path, query string) (string, string, string) {
	// YouTube normalization
	host, path, query = normalizeYouTube(host, path, query)

	// TikTok normalization
	host, path, query = normalizeTikTok(host, path, query)

	return host, path, query
}

// normalizeYouTube standardizes various YouTube URL formats
func normalizeYouTube(host, path, query string) (string, string, string) {
	// Handle youtu.be short URLs
	if host == "youtu.be" {
		videoID := strings.TrimPrefix(path, "/")
		if videoID != "" {
			// Remove query params for canonical form
			return "youtube.com", "/watch", "v=" + videoID
		}
	}

	// Handle m.youtube.com mobile URLs
	if host == "m.youtube.com" {
		host = "youtube.com"
	}

	// Handle youtube.com/shorts/ID format
	if host == "youtube.com" && strings.HasPrefix(path, "/shorts/") {
		videoID := strings.TrimPrefix(path, "/shorts/")
		return "youtube.com", "/watch", "v=" + videoID
	}

	// Handle youtube.com/embed/ID format
	if host == "youtube.com" && strings.HasPrefix(path, "/embed/") {
		videoID := strings.TrimPrefix(path, "/embed/")
		return "youtube.com", "/watch", "v=" + videoID
	}

	// For standard /watch URLs, remove video-specific query params
	if host == "youtube.com" && path == "/watch" {
		query = removeVideoQueryParams(query, []string{"v"})
	}

	return host, path, query
}

// normalizeTikTok standardizes various TikTok URL formats
func normalizeTikTok(host, path, query string) (string, string, string) {
	// Normalize vm.tiktok.com short URLs to tiktok.com
	if host == "vm.tiktok.com" {
		host = "tiktok.com"
	}

	// Remove mobile prefix
	if host == "m.tiktok.com" {
		host = "tiktok.com"
	}

	// For TikTok, the video ID is in the path, query params are not needed
	if host == "tiktok.com" {
		query = "" // Remove all query params for TikTok videos
	}

	return host, path, query
}

// removeVideoQueryParams keeps only essential params and removes video-specific ones
func removeVideoQueryParams(rawQuery string, keepParams []string) string {
	if rawQuery == "" {
		return ""
	}

	values, err := url.ParseQuery(rawQuery)
	if err != nil {
		return rawQuery
	}

	// Video-specific params to remove (timestamps, sharing, etc.)
	removeParams := map[string]bool{
		"t":              true, // YouTube timestamp
		"start":          true, // YouTube start time
		"end":            true, // YouTube end time
		"feature":        true, // YouTube feature tracking
		"si":             true, // YouTube share identifier
		"app":            true, // TikTok app identifier
		"sender_device":  true, // TikTok device
		"is_copy_url":    true, // TikTok copy flag
		"is_from_webapp": true, // TikTok webapp flag
	}

	// Keep only specified params and remove video-specific ones
	filtered := url.Values{}
	for _, keep := range keepParams {
		if val := values.Get(keep); val != "" {
			filtered.Set(keep, val)
		}
	}

	// Remove other params
	for key := range values {
		if !removeParams[key] && !contains(keepParams, key) {
			filtered.Set(key, values.Get(key))
		}
	}

	return filtered.Encode()
}

// contains checks if a string slice contains a value
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Tracking parameters to remove from URLs
var trackingParams = regexp.MustCompile(`^(utm_|fbclid|gclid|gclsrc|dclid|msclkid|ref|source|medium|campaign)`)

// removeTrackingParams removes common tracking parameters from query string
func removeTrackingParams(rawQuery string) string {
	if rawQuery == "" {
		return ""
	}

	values, err := url.ParseQuery(rawQuery)
	if err != nil {
		return rawQuery
	}

	// Remove tracking parameters
	for key := range values {
		if trackingParams.MatchString(strings.ToLower(key)) {
			delete(values, key)
		}
	}

	// Sort remaining parameters for consistency
	var keys []string
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	// Rebuild query string
	var parts []string
	for _, key := range keys {
		for _, value := range values[key] {
			parts = append(parts, url.QueryEscape(key)+"="+url.QueryEscape(value))
		}
	}

	return strings.Join(parts, "&")
}
