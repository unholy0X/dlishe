package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// BlacklistKeyPrefix is the Redis key prefix for blacklisted tokens
	BlacklistKeyPrefix = "token:blacklist:"
)

// TokenBlacklist manages revoked JWT tokens in Redis
type TokenBlacklist struct {
	redis *redis.Client
}

// NewTokenBlacklist creates a new token blacklist service
func NewTokenBlacklist(redisClient *redis.Client) *TokenBlacklist {
	return &TokenBlacklist{
		redis: redisClient,
	}
}

// RevokeToken adds a token to the blacklist
// tokenID is the JWT ID (jti claim)
// expiresAt is when the token naturally expires (TTL matches token lifetime)
func (b *TokenBlacklist) RevokeToken(ctx context.Context, tokenID string, expiresAt time.Time) error {
	if tokenID == "" {
		return nil // Nothing to revoke
	}

	key := BlacklistKeyPrefix + tokenID

	// Calculate TTL - only keep in blacklist until token would expire anyway
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		// Token already expired, no need to blacklist
		return nil
	}

	// Set with TTL so Redis auto-cleans expired entries
	return b.redis.Set(ctx, key, "revoked", ttl).Err()
}

// RevokeAllUserTokens revokes all tokens for a user
// This is a more aggressive approach - stores user ID with longer TTL
func (b *TokenBlacklist) RevokeAllUserTokens(ctx context.Context, userID string, refreshTokenExpiry time.Duration) error {
	if userID == "" {
		return nil
	}

	key := fmt.Sprintf("token:revoke_all:%s", userID)

	// Store the timestamp when revoke-all was called
	// Any token issued before this time should be rejected
	return b.redis.Set(ctx, key, time.Now().Unix(), refreshTokenExpiry).Err()
}

// IsRevoked checks if a token has been revoked
func (b *TokenBlacklist) IsRevoked(ctx context.Context, tokenID string) (bool, error) {
	if tokenID == "" {
		return false, nil
	}

	key := BlacklistKeyPrefix + tokenID

	exists, err := b.redis.Exists(ctx, key).Result()
	if err != nil {
		// On Redis error, fail open (allow the request)
		// This is a security trade-off for availability
		// Consider logging this for monitoring
		return false, err
	}

	return exists > 0, nil
}

// IsUserRevokedSince checks if all user tokens were revoked after a given time
func (b *TokenBlacklist) IsUserRevokedSince(ctx context.Context, userID string, tokenIssuedAt time.Time) (bool, error) {
	if userID == "" {
		return false, nil
	}

	key := fmt.Sprintf("token:revoke_all:%s", userID)

	revokedAtStr, err := b.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		// No revoke-all entry, token is valid
		return false, nil
	}
	if err != nil {
		// Redis error, fail open
		return false, err
	}

	var revokedAt int64
	fmt.Sscanf(revokedAtStr, "%d", &revokedAt)

	// If token was issued before or at the revoke-all timestamp, it's revoked
	return tokenIssuedAt.Unix() <= revokedAt, nil
}
