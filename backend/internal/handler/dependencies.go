package handler

import (
	"context"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/service/auth"
	"github.com/google/uuid"
)

// UserRepository defines the interface for user persistence
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetOrCreateAnonymous(ctx context.Context, deviceID string) (*model.User, bool, error)
	CreateSubscription(ctx context.Context, userID uuid.UUID) error
	GetSubscription(ctx context.Context, userID uuid.UUID) (*model.UserSubscription, error)
}

// RecipeRepository defines the interface for recipe persistence
type RecipeRepository interface {
	Create(ctx context.Context, recipe *model.Recipe) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Recipe, error)
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Recipe, int, error)
	Update(ctx context.Context, recipe *model.Recipe) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	SetFavorite(ctx context.Context, id uuid.UUID, isFavorite bool) error
}

// PantryRepository defines the interface for pantry persistence
type PantryRepository interface {
	List(ctx context.Context, userID uuid.UUID, category *string) ([]*model.PantryItem, error)
	Get(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.PantryItem, error)
	Create(ctx context.Context, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error)
	Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	GetExpiring(ctx context.Context, userID uuid.UUID, days int) ([]*model.PantryItem, error)
}

// ShoppingRepository defines the interface for shopping list persistence
type ShoppingRepository interface {
	ListLists(ctx context.Context, userID uuid.UUID, includeArchived bool) ([]*model.ShoppingList, error)
	GetList(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingList, error)
	GetListWithItems(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingListWithItems, error)
	CreateList(ctx context.Context, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error)
	UpdateList(ctx context.Context, id, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error)
	DeleteList(ctx context.Context, id, userID uuid.UUID) error
	ArchiveList(ctx context.Context, id, userID uuid.UUID, archive bool) error

	ListItems(ctx context.Context, listID uuid.UUID) ([]model.ShoppingItem, error)
	CreateItem(ctx context.Context, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error)
	UpdateItem(ctx context.Context, itemID, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error)
	ToggleItemChecked(ctx context.Context, itemID, listID uuid.UUID) (*model.ShoppingItem, error)
	DeleteItem(ctx context.Context, itemID, listID uuid.UUID) error
	CompleteList(ctx context.Context, listID, userID uuid.UUID) error
}

// JobRepository defines the interface for job persistence
type JobRepository interface {
	Create(ctx context.Context, job *model.VideoJob) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.VideoJob, error)
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.VideoJob, error)
	UpdateProgress(ctx context.Context, id uuid.UUID, status model.JobStatus, progress int, message string) error
	MarkCompleted(ctx context.Context, id uuid.UUID, resultRecipeID uuid.UUID) error
	MarkFailed(ctx context.Context, id uuid.UUID, errorCode, errorMessage string) error
	MarkCancelled(ctx context.Context, id uuid.UUID) error
}

// JWTService defines the interface for JWT operations
type JWTService interface {
	GenerateTokenPair(userID uuid.UUID, email string, isAnonymous bool, deviceID string) (*auth.TokenPair, error)
	ValidateAccessToken(tokenString string) (*auth.Claims, error)
	ValidateRefreshToken(tokenString string) (*auth.Claims, error)
}

// TokenBlacklist defines the interface for token blacklisting
type TokenBlacklist interface {
	RevokeToken(ctx context.Context, tokenID string, expiresAt time.Time) error
	RevokeAllUserTokens(ctx context.Context, userID string, duration time.Duration) error
	IsRevoked(ctx context.Context, tokenID string) (bool, error)
}

// VideoDownloader defines the interface for video downloading
type VideoDownloader interface {
	Download(url string) (string, string, error)
	Cleanup(path string) error
}
