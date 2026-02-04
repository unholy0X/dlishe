package handler

import (
	"context"
	"database/sql"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/service/auth"
	"github.com/dishflow/backend/internal/service/video"
	"github.com/google/uuid"
)

// UserRepository defines the interface for user persistence
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetOrCreateAnonymous(ctx context.Context, deviceID string) (*model.User, bool, error)
	Update(ctx context.Context, user *model.User) error
	CreateSubscription(ctx context.Context, userID uuid.UUID) error
	GetSubscription(ctx context.Context, userID uuid.UUID) (*model.UserSubscription, error)
}

// RecipeRepository defines the interface for recipe persistence
type RecipeRepository interface {
	Create(ctx context.Context, recipe *model.Recipe) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Recipe, error)
	GetBySourceRecipeID(ctx context.Context, userID, sourceRecipeID uuid.UUID) (*model.Recipe, error)
	GetBySourceURL(ctx context.Context, userID uuid.UUID, sourceURL string) (*model.Recipe, error)
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Recipe, int, error)
	ListPublic(ctx context.Context, limit, offset int) ([]*model.Recipe, int, error)
	ListForRecommendations(ctx context.Context, userID uuid.UUID) ([]*model.Recipe, error)
	Update(ctx context.Context, recipe *model.Recipe) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	SetFavorite(ctx context.Context, id uuid.UUID, isFavorite bool) error
}

// PantryRepository defines the interface for pantry persistence
type PantryRepository interface {
	List(ctx context.Context, userID uuid.UUID, category *string, limit, offset int) ([]*model.PantryItem, int, error)
	ListAll(ctx context.Context, userID uuid.UUID) ([]model.PantryItem, error)
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
	CreateListWithItems(ctx context.Context, userID uuid.UUID, listInput *model.ShoppingListInput, itemsInput []*model.ShoppingItemInput) (*model.ShoppingListWithItems, error)
	UpdateList(ctx context.Context, id, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error)
	DeleteList(ctx context.Context, id, userID uuid.UUID) error
	ArchiveList(ctx context.Context, id, userID uuid.UUID, archive bool) error

	ListItems(ctx context.Context, listID uuid.UUID) ([]model.ShoppingItem, error)
	CreateItem(ctx context.Context, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error)
	UpdateItem(ctx context.Context, itemID, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error)
	ToggleItemChecked(ctx context.Context, itemID, listID uuid.UUID) (*model.ShoppingItem, error)
	DeleteItem(ctx context.Context, itemID, listID uuid.UUID) error
	DeleteAllItems(ctx context.Context, tx *sql.Tx, listID uuid.UUID) error
	CompleteList(ctx context.Context, listID, userID uuid.UUID) error

	// Transaction support for batch operations
	BeginTransaction(ctx context.Context) (*sql.Tx, error)
	CreateItemBatch(ctx context.Context, tx *sql.Tx, listID uuid.UUID, inputs []*model.ShoppingItemInput) ([]*model.ShoppingItem, error)

	// Smart Merge support
	ListItemsInLists(ctx context.Context, listIDs []uuid.UUID) ([]model.ShoppingItem, error)
	VerifyListsOwnership(ctx context.Context, userID uuid.UUID, listIDs []uuid.UUID) (bool, error)

	// Idempotency check for recipe additions
	HasRecipeItems(ctx context.Context, listID uuid.UUID, recipeName string) (bool, error)
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
	Delete(ctx context.Context, id, userID uuid.UUID) error
	DeleteAllByUser(ctx context.Context, userID uuid.UUID) error
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
	// Download downloads a video and returns (videoPath, thumbnailURL, error)
	// The thumbnailURL is the CDN link from YouTube/TikTok, not a local file
	// Context allows cancellation of download operations
	Download(ctx context.Context, url string) (string, string, error)
	GetMetadata(ctx context.Context, url string) (*video.VideoMetadata, error)
	Cleanup(path string) error
}
