package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/dishflow/backend/internal/model"
)

var (
	ErrCacheNotFound = errors.New("cache entry not found")
	ErrCacheExpired  = errors.New("cache entry expired")
)

// ExtractionCacheRepository handles extraction cache database operations
type ExtractionCacheRepository struct {
	db *sql.DB
}

// NewExtractionCacheRepository creates a new extraction cache repository
func NewExtractionCacheRepository(db *sql.DB) *ExtractionCacheRepository {
	return &ExtractionCacheRepository{db: db}
}

// Get retrieves a cache entry by URL hash
// Returns ErrCacheNotFound if not found, ErrCacheExpired if expired
func (r *ExtractionCacheRepository) Get(ctx context.Context, urlHash string) (*model.ExtractionCache, error) {
	query := `
		SELECT id, url_hash, normalized_url, extraction_result, created_at, expires_at, hit_count
		FROM extraction_cache
		WHERE url_hash = $1
	`

	cache := &model.ExtractionCache{}
	var resultJSON []byte

	err := r.db.QueryRowContext(ctx, query, urlHash).Scan(
		&cache.ID,
		&cache.URLHash,
		&cache.NormalizedURL,
		&resultJSON,
		&cache.CreatedAt,
		&cache.ExpiresAt,
		&cache.HitCount,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCacheNotFound
		}
		return nil, err
	}

	// Check if expired
	if cache.IsExpired() {
		// Delete expired entry
		go r.Delete(context.Background(), urlHash)
		return nil, ErrCacheExpired
	}

	// Unmarshal extraction result
	if resultJSON != nil {
		cache.ExtractionResult = &model.CachedExtractionData{}
		if err := json.Unmarshal(resultJSON, cache.ExtractionResult); err != nil {
			// Corrupted cache data - treat as cache miss and delete the entry
			go r.Delete(context.Background(), urlHash)
			return nil, ErrCacheNotFound
		}
	}

	return cache, nil
}

// GetByURL retrieves a cache entry by raw URL (normalizes internally)
func (r *ExtractionCacheRepository) GetByURL(ctx context.Context, rawURL string) (*model.ExtractionCache, error) {
	normalized := model.NormalizeURL(rawURL)
	urlHash := model.HashURL(normalized)
	return r.Get(ctx, urlHash)
}

// Set creates or updates a cache entry
func (r *ExtractionCacheRepository) Set(ctx context.Context, cache *model.ExtractionCache) error {
	resultJSON, err := json.Marshal(cache.ExtractionResult)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO extraction_cache (id, url_hash, normalized_url, extraction_result, created_at, expires_at, hit_count)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (url_hash) DO UPDATE SET
			extraction_result = EXCLUDED.extraction_result,
			created_at = EXCLUDED.created_at,
			expires_at = EXCLUDED.expires_at
	`

	_, err = r.db.ExecContext(ctx, query,
		cache.ID,
		cache.URLHash,
		cache.NormalizedURL,
		resultJSON,
		cache.CreatedAt,
		cache.ExpiresAt,
		cache.HitCount,
	)

	return err
}

// IncrementHitCount increments the hit count for a cache entry
func (r *ExtractionCacheRepository) IncrementHitCount(ctx context.Context, urlHash string) error {
	query := `UPDATE extraction_cache SET hit_count = hit_count + 1 WHERE url_hash = $1`
	_, err := r.db.ExecContext(ctx, query, urlHash)
	return err
}

// Delete removes a cache entry by URL hash
func (r *ExtractionCacheRepository) Delete(ctx context.Context, urlHash string) error {
	query := `DELETE FROM extraction_cache WHERE url_hash = $1`
	_, err := r.db.ExecContext(ctx, query, urlHash)
	return err
}

// DeleteExpired removes all expired cache entries
// Returns the number of entries deleted
func (r *ExtractionCacheRepository) DeleteExpired(ctx context.Context) (int64, error) {
	query := `DELETE FROM extraction_cache WHERE expires_at < $1`
	result, err := r.db.ExecContext(ctx, query, time.Now().UTC())
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// GetStats returns cache statistics
func (r *ExtractionCacheRepository) GetStats(ctx context.Context) (*CacheStats, error) {
	query := `
		SELECT
			COUNT(*) as total_entries,
			COALESCE(SUM(hit_count), 0) as total_hits,
			COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries
		FROM extraction_cache
	`

	stats := &CacheStats{}
	err := r.db.QueryRowContext(ctx, query).Scan(
		&stats.TotalEntries,
		&stats.TotalHits,
		&stats.ExpiredEntries,
	)
	if err != nil {
		return nil, err
	}

	return stats, nil
}

// CacheStats contains extraction cache statistics
type CacheStats struct {
	TotalEntries   int64 `json:"totalEntries"`
	TotalHits      int64 `json:"totalHits"`
	ExpiredEntries int64 `json:"expiredEntries"`
}
