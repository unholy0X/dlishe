package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrInvalidClaims    = errors.New("invalid token claims")
)

// Claims represents the JWT claims for DishFlow
type Claims struct {
	UserID      uuid.UUID `json:"uid"`
	Email       string    `json:"email,omitempty"`
	IsAnonymous bool      `json:"anon,omitempty"`
	DeviceID    string    `json:"did,omitempty"`
	TokenType   string    `json:"type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// TokenPair contains both access and refresh tokens
type TokenPair struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
	TokenType    string    `json:"tokenType"`
}

// JWTService handles JWT token operations
type JWTService struct {
	secretKey       []byte
	accessExpiry    time.Duration
	refreshExpiry   time.Duration
	issuer          string
}

// NewJWTService creates a new JWT service
func NewJWTService(secretKey string, accessExpiry, refreshExpiry time.Duration) *JWTService {
	return &JWTService{
		secretKey:     []byte(secretKey),
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
		issuer:        "dishflow",
	}
}

// GenerateTokenPair creates both access and refresh tokens for a user
func (s *JWTService) GenerateTokenPair(userID uuid.UUID, email string, isAnonymous bool, deviceID string) (*TokenPair, error) {
	now := time.Now()
	accessExpiry := now.Add(s.accessExpiry)
	refreshExpiry := now.Add(s.refreshExpiry)

	// Generate access token
	accessToken, err := s.generateToken(userID, email, isAnonymous, deviceID, "access", accessExpiry)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, err := s.generateToken(userID, email, isAnonymous, deviceID, "refresh", refreshExpiry)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    accessExpiry,
		TokenType:    "Bearer",
	}, nil
}

// GenerateAccessToken creates only an access token (used when refreshing)
func (s *JWTService) GenerateAccessToken(userID uuid.UUID, email string, isAnonymous bool, deviceID string) (string, time.Time, error) {
	expiry := time.Now().Add(s.accessExpiry)
	token, err := s.generateToken(userID, email, isAnonymous, deviceID, "access", expiry)
	return token, expiry, err
}

// generateToken creates a JWT token with the given claims
func (s *JWTService) generateToken(userID uuid.UUID, email string, isAnonymous bool, deviceID string, tokenType string, expiry time.Time) (string, error) {
	claims := Claims{
		UserID:      userID,
		Email:       email,
		IsAnonymous: isAnonymous,
		DeviceID:    deviceID,
		TokenType:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(expiry),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			ID:        uuid.New().String(), // Unique token ID for revocation
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secretKey)
}

// ValidateToken validates a JWT token and returns its claims
func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	// Validate issuer
	if claims.Issuer != s.issuer {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateAccessToken validates an access token specifically
func (s *JWTService) ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != "access" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token specifically
func (s *JWTService) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != "refresh" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// GenerateRefreshTokenHash generates a hash for storing refresh tokens
func GenerateRefreshTokenHash() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// GenerateDeviceID generates a unique device identifier
func GenerateDeviceID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return base64.URLEncoding.EncodeToString(bytes)
}
