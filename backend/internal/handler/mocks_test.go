package handler

import (
	"context"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/dishflow/backend/internal/service/auth"
	"github.com/google/uuid"
)

// --- Mock Repositories ---

type mockUserRepository struct {
	CreateFunc               func(ctx context.Context, user *model.User) error
	GetByIDFunc              func(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmailFunc           func(ctx context.Context, email string) (*model.User, error)
	GetOrCreateAnonymousFunc func(ctx context.Context, deviceID string) (*model.User, bool, error)
	CreateSubscriptionFunc   func(ctx context.Context, userID uuid.UUID) error
	GetSubscriptionFunc      func(ctx context.Context, userID uuid.UUID) (*model.UserSubscription, error)
}

func (m *mockUserRepository) Create(ctx context.Context, user *model.User) error {
	return m.CreateFunc(ctx, user)
}
func (m *mockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return m.GetByIDFunc(ctx, id)
}
func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	return m.GetByEmailFunc(ctx, email)
}
func (m *mockUserRepository) GetOrCreateAnonymous(ctx context.Context, deviceID string) (*model.User, bool, error) {
	return m.GetOrCreateAnonymousFunc(ctx, deviceID)
}
func (m *mockUserRepository) CreateSubscription(ctx context.Context, userID uuid.UUID) error {
	if m.CreateSubscriptionFunc == nil {
		return nil
	}
	return m.CreateSubscriptionFunc(ctx, userID)
}
func (m *mockUserRepository) GetSubscription(ctx context.Context, userID uuid.UUID) (*model.UserSubscription, error) {
	if m.GetSubscriptionFunc == nil {
		return &model.UserSubscription{Entitlement: "free", IsActive: true}, nil
	}
	return m.GetSubscriptionFunc(ctx, userID)
}

type mockRecipeRepository struct {
	CreateFunc      func(ctx context.Context, recipe *model.Recipe) error
	GetByIDFunc     func(ctx context.Context, id uuid.UUID) (*model.Recipe, error)
	ListByUserFunc  func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Recipe, int, error)
	UpdateFunc      func(ctx context.Context, recipe *model.Recipe) error
	SoftDeleteFunc  func(ctx context.Context, id uuid.UUID) error
	SetFavoriteFunc func(ctx context.Context, id uuid.UUID, isFavorite bool) error
}

func (m *mockRecipeRepository) Create(ctx context.Context, recipe *model.Recipe) error {
	if m.CreateFunc == nil {
		return nil
	}
	return m.CreateFunc(ctx, recipe)
}
func (m *mockRecipeRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Recipe, error) {
	if m.GetByIDFunc == nil {
		return &model.Recipe{}, nil
	}
	return m.GetByIDFunc(ctx, id)
}
func (m *mockRecipeRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Recipe, int, error) {
	if m.ListByUserFunc == nil {
		return nil, 0, nil
	}
	return m.ListByUserFunc(ctx, userID, limit, offset)
}
func (m *mockRecipeRepository) Update(ctx context.Context, recipe *model.Recipe) error {
	if m.UpdateFunc == nil {
		return nil
	}
	return m.UpdateFunc(ctx, recipe)
}
func (m *mockRecipeRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	if m.SoftDeleteFunc == nil {
		return nil
	}
	return m.SoftDeleteFunc(ctx, id)
}
func (m *mockRecipeRepository) SetFavorite(ctx context.Context, id uuid.UUID, isFavorite bool) error {
	if m.SetFavoriteFunc == nil {
		return nil
	}
	return m.SetFavoriteFunc(ctx, id, isFavorite)
}

type mockPantryRepository struct {
	ListFunc        func(ctx context.Context, userID uuid.UUID, category *string) ([]*model.PantryItem, error)
	GetFunc         func(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.PantryItem, error)
	CreateFunc      func(ctx context.Context, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error)
	UpdateFunc      func(ctx context.Context, id uuid.UUID, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error)
	DeleteFunc      func(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	GetExpiringFunc func(ctx context.Context, userID uuid.UUID, days int) ([]*model.PantryItem, error)
}

func (m *mockPantryRepository) List(ctx context.Context, userID uuid.UUID, category *string) ([]*model.PantryItem, error) {
	return m.ListFunc(ctx, userID, category)
}
func (m *mockPantryRepository) Get(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.PantryItem, error) {
	return m.GetFunc(ctx, id, userID)
}
func (m *mockPantryRepository) Create(ctx context.Context, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error) {
	return m.CreateFunc(ctx, userID, input)
}
func (m *mockPantryRepository) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error) {
	return m.UpdateFunc(ctx, id, userID, input)
}
func (m *mockPantryRepository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return m.DeleteFunc(ctx, id, userID)
}
func (m *mockPantryRepository) GetExpiring(ctx context.Context, userID uuid.UUID, days int) ([]*model.PantryItem, error) {
	return m.GetExpiringFunc(ctx, userID, days)
}

type mockShoppingRepository struct {
	ListListsFunc         func(ctx context.Context, userID uuid.UUID, includeArchived bool) ([]*model.ShoppingList, error)
	GetListFunc           func(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingList, error)
	GetListWithItemsFunc  func(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingListWithItems, error)
	CreateListFunc        func(ctx context.Context, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error)
	UpdateListFunc        func(ctx context.Context, id, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error)
	DeleteListFunc        func(ctx context.Context, id, userID uuid.UUID) error
	ArchiveListFunc       func(ctx context.Context, id, userID uuid.UUID, archive bool) error
	ListItemsFunc         func(ctx context.Context, listID uuid.UUID) ([]model.ShoppingItem, error)
	CreateItemFunc        func(ctx context.Context, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error)
	UpdateItemFunc        func(ctx context.Context, itemID, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error)
	ToggleItemCheckedFunc func(ctx context.Context, itemID, listID uuid.UUID) (*model.ShoppingItem, error)
	DeleteItemFunc        func(ctx context.Context, itemID, listID uuid.UUID) error
	CompleteListFunc      func(ctx context.Context, listID, userID uuid.UUID) error
}

func (m *mockShoppingRepository) ListLists(ctx context.Context, userID uuid.UUID, includeArchived bool) ([]*model.ShoppingList, error) {
	return m.ListListsFunc(ctx, userID, includeArchived)
}
func (m *mockShoppingRepository) GetList(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingList, error) {
	return m.GetListFunc(ctx, id, userID)
}
func (m *mockShoppingRepository) GetListWithItems(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingListWithItems, error) {
	return m.GetListWithItemsFunc(ctx, id, userID)
}
func (m *mockShoppingRepository) CreateList(ctx context.Context, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error) {
	return m.CreateListFunc(ctx, userID, input)
}
func (m *mockShoppingRepository) UpdateList(ctx context.Context, id, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error) {
	return m.UpdateListFunc(ctx, id, userID, input)
}
func (m *mockShoppingRepository) DeleteList(ctx context.Context, id, userID uuid.UUID) error {
	return m.DeleteListFunc(ctx, id, userID)
}
func (m *mockShoppingRepository) ArchiveList(ctx context.Context, id, userID uuid.UUID, archive bool) error {
	return m.ArchiveListFunc(ctx, id, userID, archive)
}
func (m *mockShoppingRepository) ListItems(ctx context.Context, listID uuid.UUID) ([]model.ShoppingItem, error) {
	return m.ListItemsFunc(ctx, listID)
}
func (m *mockShoppingRepository) CreateItem(ctx context.Context, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error) {
	return m.CreateItemFunc(ctx, listID, input)
}
func (m *mockShoppingRepository) UpdateItem(ctx context.Context, itemID, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error) {
	return m.UpdateItemFunc(ctx, itemID, listID, input)
}
func (m *mockShoppingRepository) ToggleItemChecked(ctx context.Context, itemID, listID uuid.UUID) (*model.ShoppingItem, error) {
	return m.ToggleItemCheckedFunc(ctx, itemID, listID)
}
func (m *mockShoppingRepository) DeleteItem(ctx context.Context, itemID, listID uuid.UUID) error {
	return m.DeleteItemFunc(ctx, itemID, listID)
}
func (m *mockShoppingRepository) CompleteList(ctx context.Context, listID, userID uuid.UUID) error {
	return m.CompleteListFunc(ctx, listID, userID)
}

type mockJobRepository struct {
	CreateFunc         func(ctx context.Context, job *model.VideoJob) error
	GetByIDFunc        func(ctx context.Context, id uuid.UUID) (*model.VideoJob, error)
	ListByUserFunc     func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.VideoJob, error)
	UpdateProgressFunc func(ctx context.Context, id uuid.UUID, status model.JobStatus, progress int, message string) error
	MarkCompletedFunc  func(ctx context.Context, id uuid.UUID, resultRecipeID uuid.UUID) error
	MarkFailedFunc     func(ctx context.Context, id uuid.UUID, errorCode, errorMessage string) error
	MarkCancelledFunc  func(ctx context.Context, id uuid.UUID) error
}

func (m *mockJobRepository) Create(ctx context.Context, job *model.VideoJob) error {
	if m.CreateFunc == nil {
		return nil
	}
	return m.CreateFunc(ctx, job)
}
func (m *mockJobRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.VideoJob, error) {
	if m.GetByIDFunc == nil {
		return &model.VideoJob{}, nil
	}
	return m.GetByIDFunc(ctx, id)
}
func (m *mockJobRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.VideoJob, error) {
	if m.ListByUserFunc == nil {
		return nil, nil
	}
	return m.ListByUserFunc(ctx, userID, limit, offset)
}
func (m *mockJobRepository) UpdateProgress(ctx context.Context, id uuid.UUID, status model.JobStatus, progress int, message string) error {
	if m.UpdateProgressFunc == nil {
		return nil
	}
	return m.UpdateProgressFunc(ctx, id, status, progress, message)
}
func (m *mockJobRepository) MarkCompleted(ctx context.Context, id uuid.UUID, resultRecipeID uuid.UUID) error {
	if m.MarkCompletedFunc == nil {
		return nil
	}
	return m.MarkCompletedFunc(ctx, id, resultRecipeID)
}
func (m *mockJobRepository) MarkFailed(ctx context.Context, id uuid.UUID, errorCode, errorMessage string) error {
	if m.MarkFailedFunc == nil {
		return nil
	}
	return m.MarkFailedFunc(ctx, id, errorCode, errorMessage)
}
func (m *mockJobRepository) MarkCancelled(ctx context.Context, id uuid.UUID) error {
	if m.MarkCancelledFunc == nil {
		return nil
	}
	return m.MarkCancelledFunc(ctx, id)
}

type mockJWTService struct {
	GenerateTokenPairFunc    func(userID uuid.UUID, email string, isAnonymous bool, deviceID string) (*auth.TokenPair, error)
	ValidateAccessTokenFunc  func(tokenString string) (*auth.Claims, error)
	ValidateRefreshTokenFunc func(tokenString string) (*auth.Claims, error)
}

func (m *mockJWTService) GenerateTokenPair(userID uuid.UUID, email string, isAnonymous bool, deviceID string) (*auth.TokenPair, error) {
	return m.GenerateTokenPairFunc(userID, email, isAnonymous, deviceID)
}
func (m *mockJWTService) ValidateAccessToken(tokenString string) (*auth.Claims, error) {
	return m.ValidateAccessTokenFunc(tokenString)
}
func (m *mockJWTService) ValidateRefreshToken(tokenString string) (*auth.Claims, error) {
	return m.ValidateRefreshTokenFunc(tokenString)
}

type mockTokenBlacklist struct {
	RevokeTokenFunc         func(ctx context.Context, tokenID string, expiresAt time.Time) error
	RevokeAllUserTokensFunc func(ctx context.Context, userID string, duration time.Duration) error
	IsRevokedFunc           func(ctx context.Context, tokenID string) (bool, error)
}

func (m *mockTokenBlacklist) RevokeToken(ctx context.Context, tokenID string, expiresAt time.Time) error {
	return m.RevokeTokenFunc(ctx, tokenID, expiresAt)
}
func (m *mockTokenBlacklist) RevokeAllUserTokens(ctx context.Context, userID string, duration time.Duration) error {
	return m.RevokeAllUserTokensFunc(ctx, userID, duration)
}
func (m *mockTokenBlacklist) IsRevoked(ctx context.Context, tokenID string) (bool, error) {
	return m.IsRevokedFunc(ctx, tokenID)
}

type mockVideoDownloader struct {
	DownloadFunc func(url string) (string, string, error)
	CleanupFunc  func(path string) error
}

func (m *mockVideoDownloader) Download(url string) (string, string, error) {
	if m.DownloadFunc == nil {
		return "", "", nil
	}
	return m.DownloadFunc(url)
}
func (m *mockVideoDownloader) Cleanup(path string) error {
	if m.CleanupFunc == nil {
		return nil
	}
	return m.CleanupFunc(path)
}

// --- AI Service Mocks ---

type mockRecipeExtractor struct {
	ExtractRecipeFunc      func(ctx context.Context, req ai.ExtractionRequest, progressCallback ai.ProgressCallback) (*ai.ExtractionResult, error)
	RefineRecipeFunc       func(ctx context.Context, recipe *ai.ExtractionResult) (*ai.ExtractionResult, error)
	ExtractFromWebpageFunc func(ctx context.Context, url string) (*ai.ExtractionResult, error)
	ExtractFromImageFunc   func(ctx context.Context, imageData []byte, mimeType string) (*ai.ExtractionResult, error)
	ValidateURLFunc        func(url string) error
	IsAvailableFunc        func(ctx context.Context) bool
}

func (m *mockRecipeExtractor) ExtractRecipe(ctx context.Context, req ai.ExtractionRequest, progressCallback ai.ProgressCallback) (*ai.ExtractionResult, error) {
	if m.ExtractRecipeFunc == nil {
		return &ai.ExtractionResult{}, nil
	}
	return m.ExtractRecipeFunc(ctx, req, progressCallback)
}
func (m *mockRecipeExtractor) RefineRecipe(ctx context.Context, recipe *ai.ExtractionResult) (*ai.ExtractionResult, error) {
	if m.RefineRecipeFunc == nil {
		return recipe, nil
	}
	return m.RefineRecipeFunc(ctx, recipe)
}
func (m *mockRecipeExtractor) ExtractFromWebpage(ctx context.Context, url string) (*ai.ExtractionResult, error) {
	if m.ExtractFromWebpageFunc == nil {
		return &ai.ExtractionResult{}, nil
	}
	return m.ExtractFromWebpageFunc(ctx, url)
}
func (m *mockRecipeExtractor) ExtractFromImage(ctx context.Context, imageData []byte, mimeType string) (*ai.ExtractionResult, error) {
	if m.ExtractFromImageFunc == nil {
		return &ai.ExtractionResult{}, nil
	}
	return m.ExtractFromImageFunc(ctx, imageData, mimeType)
}
func (m *mockRecipeExtractor) ValidateURL(url string) error {
	if m.ValidateURLFunc == nil {
		return nil
	}
	return m.ValidateURLFunc(url)
}
func (m *mockRecipeExtractor) IsAvailable(ctx context.Context) bool {
	if m.IsAvailableFunc == nil {
		return true
	}
	return m.IsAvailableFunc(ctx)
}

type mockShoppingListAnalyzer struct {
	AnalyzeShoppingListFunc func(ctx context.Context, list model.ShoppingListWithItems) (*ai.ListAnalysisResult, error)
}

func (m *mockShoppingListAnalyzer) AnalyzeShoppingList(ctx context.Context, list model.ShoppingListWithItems) (*ai.ListAnalysisResult, error) {
	return m.AnalyzeShoppingListFunc(ctx, list)
}
