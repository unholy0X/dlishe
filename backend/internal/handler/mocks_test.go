package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/dishflow/backend/internal/service/video"
	"github.com/google/uuid"
)

// --- Mock Repositories ---

type mockUserRepository struct {
	GetByIDFunc                 func(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByDeviceIDFunc           func(ctx context.Context, deviceID string) (*model.User, error)
	GetByClerkIDFunc            func(ctx context.Context, clerkID string) (*model.User, error)
	GetByEmailFunc              func(ctx context.Context, email string) (*model.User, error)
	UpdateFunc                  func(ctx context.Context, user *model.User) error
	GetSubscriptionFunc         func(ctx context.Context, userID uuid.UUID) (*model.UserSubscription, error)
	CountUserScansThisMonthFunc func(ctx context.Context, userID uuid.UUID) (int, error)
	TrackScanUsageFunc          func(ctx context.Context, userID uuid.UUID) error
	RecordLoginFunc             func(ctx context.Context, userID uuid.UUID, appVersion, os, deviceName string) error
	IsEventProcessedFunc        func(ctx context.Context, eventID string) (bool, error)
	MarkEventProcessedFunc      func(ctx context.Context, eventID string) error
	LogEventFunc                func(ctx context.Context, eventID, eventType, appUserID string, payload json.RawMessage) error
	UpsertSubscriptionFunc      func(ctx context.Context, sub *model.UserSubscription) error
}

func (m *mockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	if m.GetByIDFunc == nil {
		return &model.User{}, nil
	}
	return m.GetByIDFunc(ctx, id)
}
func (m *mockUserRepository) GetByDeviceID(ctx context.Context, deviceID string) (*model.User, error) {
	if m.GetByDeviceIDFunc == nil {
		return nil, nil
	}
	return m.GetByDeviceIDFunc(ctx, deviceID)
}
func (m *mockUserRepository) GetByClerkID(ctx context.Context, clerkID string) (*model.User, error) {
	if m.GetByClerkIDFunc == nil {
		return nil, nil
	}
	return m.GetByClerkIDFunc(ctx, clerkID)
}
func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	if m.GetByEmailFunc == nil {
		return nil, nil
	}
	return m.GetByEmailFunc(ctx, email)
}
func (m *mockUserRepository) Update(ctx context.Context, user *model.User) error {
	if m.UpdateFunc == nil {
		return nil
	}
	return m.UpdateFunc(ctx, user)
}
func (m *mockUserRepository) GetSubscription(ctx context.Context, userID uuid.UUID) (*model.UserSubscription, error) {
	if m.GetSubscriptionFunc == nil {
		return &model.UserSubscription{Entitlement: "free", IsActive: true}, nil
	}
	return m.GetSubscriptionFunc(ctx, userID)
}
func (m *mockUserRepository) CountUserScansThisMonth(ctx context.Context, userID uuid.UUID) (int, error) {
	if m.CountUserScansThisMonthFunc == nil {
		return 0, nil
	}
	return m.CountUserScansThisMonthFunc(ctx, userID)
}
func (m *mockUserRepository) TrackScanUsage(ctx context.Context, userID uuid.UUID) error {
	if m.TrackScanUsageFunc == nil {
		return nil
	}
	return m.TrackScanUsageFunc(ctx, userID)
}

func (m *mockUserRepository) RecordLogin(ctx context.Context, userID uuid.UUID, appVersion, os, deviceName string) error {
	if m.RecordLoginFunc == nil {
		return nil
	}
	return m.RecordLoginFunc(ctx, userID, appVersion, os, deviceName)
}

func (m *mockUserRepository) IsEventProcessed(ctx context.Context, eventID string) (bool, error) {
	if m.IsEventProcessedFunc == nil {
		return false, nil
	}
	return m.IsEventProcessedFunc(ctx, eventID)
}

func (m *mockUserRepository) MarkEventProcessed(ctx context.Context, eventID string) error {
	if m.MarkEventProcessedFunc == nil {
		return nil
	}
	return m.MarkEventProcessedFunc(ctx, eventID)
}

func (m *mockUserRepository) LogEvent(ctx context.Context, eventID, eventType, appUserID string, payload json.RawMessage) error {
	if m.LogEventFunc == nil {
		return nil
	}
	return m.LogEventFunc(ctx, eventID, eventType, appUserID, payload)
}

func (m *mockUserRepository) UpsertSubscription(ctx context.Context, sub *model.UserSubscription) error {
	if m.UpsertSubscriptionFunc == nil {
		return nil
	}
	return m.UpsertSubscriptionFunc(ctx, sub)
}

type mockRecipeRepository struct {
	CreateFunc                 func(ctx context.Context, recipe *model.Recipe) error
	GetByIDFunc                func(ctx context.Context, id uuid.UUID) (*model.Recipe, error)
	GetBySourceRecipeIDFunc    func(ctx context.Context, userID, sourceRecipeID uuid.UUID) (*model.Recipe, error)
	GetBySourceURLFunc         func(ctx context.Context, userID uuid.UUID, sourceURL string) (*model.Recipe, error)
	ListByUserFunc             func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Recipe, int, error)
	ListPublicFunc             func(ctx context.Context, limit, offset int) ([]*model.Recipe, int, error)
	ListFeaturedFunc           func(ctx context.Context, limit, offset int) ([]*model.Recipe, int, error)
	ListForRecommendationsFunc func(ctx context.Context, userID uuid.UUID) ([]*model.Recipe, error)
	SearchFunc                 func(ctx context.Context, userID uuid.UUID, query string, limit int) ([]*model.Recipe, error)
	UpdateFunc                 func(ctx context.Context, recipe *model.Recipe) error
	SoftDeleteFunc             func(ctx context.Context, id uuid.UUID) error
	SetFavoriteFunc            func(ctx context.Context, id uuid.UUID, isFavorite bool) error
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
func (m *mockRecipeRepository) GetBySourceRecipeID(ctx context.Context, userID, sourceRecipeID uuid.UUID) (*model.Recipe, error) {
	if m.GetBySourceRecipeIDFunc == nil {
		return nil, nil // Return nil to indicate not found by default
	}
	return m.GetBySourceRecipeIDFunc(ctx, userID, sourceRecipeID)
}
func (m *mockRecipeRepository) GetBySourceURL(ctx context.Context, userID uuid.UUID, sourceURL string) (*model.Recipe, error) {
	if m.GetBySourceURLFunc == nil {
		return nil, nil
	}
	return m.GetBySourceURLFunc(ctx, userID, sourceURL)
}
func (m *mockRecipeRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Recipe, int, error) {
	if m.ListByUserFunc == nil {
		return nil, 0, nil
	}
	return m.ListByUserFunc(ctx, userID, limit, offset)
}
func (m *mockRecipeRepository) ListPublic(ctx context.Context, lang string, limit, offset int) ([]*model.Recipe, int, error) {
	if m.ListPublicFunc == nil {
		return nil, 0, nil
	}
	return m.ListPublicFunc(ctx, limit, offset)
}
func (m *mockRecipeRepository) ListFeatured(ctx context.Context, lang string, limit, offset int) ([]*model.Recipe, int, error) {
	if m.ListFeaturedFunc == nil {
		return nil, 0, nil
	}
	return m.ListFeaturedFunc(ctx, limit, offset)
}
func (m *mockRecipeRepository) ListForRecommendations(ctx context.Context, userID uuid.UUID) ([]*model.Recipe, error) {
	if m.ListForRecommendationsFunc == nil {
		return nil, nil
	}
	return m.ListForRecommendationsFunc(ctx, userID)
}
func (m *mockRecipeRepository) Search(ctx context.Context, userID uuid.UUID, query string, limit int) ([]*model.Recipe, error) {
	if m.SearchFunc == nil {
		return []*model.Recipe{}, nil
	}
	return m.SearchFunc(ctx, userID, query, limit)
}
func (m *mockRecipeRepository) SearchPublic(ctx context.Context, query, lang string, limit int) ([]*model.Recipe, error) {
	return []*model.Recipe{}, nil
}
func (m *mockRecipeRepository) GetPublicBySourceURL(ctx context.Context, sourceURL, lang string) (*model.Recipe, error) {
	return nil, nil
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
	ListFunc    func(ctx context.Context, userID uuid.UUID, category *string, limit, offset int) ([]*model.PantryItem, int, error)
	ListAllFunc func(ctx context.Context, userID uuid.UUID) ([]model.PantryItem, error)
	GetFunc     func(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*model.PantryItem, error)
	CreateFunc  func(ctx context.Context, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error)
	UpdateFunc  func(ctx context.Context, id uuid.UUID, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error)
	DeleteFunc  func(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
}

func (m *mockPantryRepository) List(ctx context.Context, userID uuid.UUID, category *string, limit, offset int) ([]*model.PantryItem, int, error) {
	return m.ListFunc(ctx, userID, category, limit, offset)
}
func (m *mockPantryRepository) ListAll(ctx context.Context, userID uuid.UUID) ([]model.PantryItem, error) {
	if m.ListAllFunc == nil {
		return nil, nil
	}
	return m.ListAllFunc(ctx, userID)
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

type mockShoppingRepository struct {
	ListListsFunc            func(ctx context.Context, userID uuid.UUID, includeArchived bool) ([]*model.ShoppingList, error)
	GetListFunc              func(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingList, error)
	GetListWithItemsFunc     func(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingListWithItems, error)
	CreateListFunc           func(ctx context.Context, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error)
	CreateListWithItemsFunc  func(ctx context.Context, userID uuid.UUID, listInput *model.ShoppingListInput, itemsInput []*model.ShoppingItemInput) (*model.ShoppingListWithItems, error)
	UpdateListFunc           func(ctx context.Context, id, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error)
	DeleteListFunc           func(ctx context.Context, id, userID uuid.UUID) error
	ArchiveListFunc          func(ctx context.Context, id, userID uuid.UUID, archive bool) error
	ListItemsFunc            func(ctx context.Context, listID uuid.UUID) ([]model.ShoppingItem, error)
	CreateItemFunc           func(ctx context.Context, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error)
	UpdateItemFunc           func(ctx context.Context, itemID, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error)
	ToggleItemCheckedFunc    func(ctx context.Context, itemID, listID uuid.UUID) (*model.ShoppingItem, error)
	DeleteItemFunc           func(ctx context.Context, itemID, listID uuid.UUID) error
	CompleteListFunc         func(ctx context.Context, listID, userID uuid.UUID) error
	BeginTransactionFunc     func(ctx context.Context) (*sql.Tx, error)
	CreateItemBatchFunc      func(ctx context.Context, tx *sql.Tx, listID uuid.UUID, inputs []*model.ShoppingItemInput) ([]*model.ShoppingItem, error)
	HasRecipeItemsFunc       func(ctx context.Context, listID uuid.UUID, recipeName string) (bool, error)
	DeleteAllItemsFunc       func(ctx context.Context, tx *sql.Tx, listID uuid.UUID) error
	ListItemsInListsFunc     func(ctx context.Context, listIDs []uuid.UUID) ([]model.ShoppingItem, error)
	VerifyListsOwnershipFunc func(ctx context.Context, userID uuid.UUID, listIDs []uuid.UUID) (bool, error)
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
func (m *mockShoppingRepository) CreateListWithItems(ctx context.Context, userID uuid.UUID, listInput *model.ShoppingListInput, itemsInput []*model.ShoppingItemInput) (*model.ShoppingListWithItems, error) {
	return m.CreateListWithItemsFunc(ctx, userID, listInput, itemsInput)
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
func (m *mockShoppingRepository) DeleteAllItems(ctx context.Context, tx *sql.Tx, listID uuid.UUID) error {
	if m.DeleteAllItemsFunc == nil {
		return nil
	}
	return m.DeleteAllItemsFunc(ctx, tx, listID)
}
func (m *mockShoppingRepository) CompleteList(ctx context.Context, listID, userID uuid.UUID) error {
	return m.CompleteListFunc(ctx, listID, userID)
}
func (m *mockShoppingRepository) BeginTransaction(ctx context.Context) (*sql.Tx, error) {
	if m.BeginTransactionFunc == nil {
		return nil, nil
	}
	return m.BeginTransactionFunc(ctx)
}
func (m *mockShoppingRepository) CreateItemBatch(ctx context.Context, tx *sql.Tx, listID uuid.UUID, inputs []*model.ShoppingItemInput) ([]*model.ShoppingItem, error) {
	if m.CreateItemBatchFunc == nil {
		return nil, nil
	}
	return m.CreateItemBatchFunc(ctx, tx, listID, inputs)
}
func (m *mockShoppingRepository) HasRecipeItems(ctx context.Context, listID uuid.UUID, recipeName string) (bool, error) {
	if m.HasRecipeItemsFunc == nil {
		return false, nil
	}
	return m.HasRecipeItemsFunc(ctx, listID, recipeName)
}
func (m *mockShoppingRepository) ListItemsInLists(ctx context.Context, listIDs []uuid.UUID) ([]model.ShoppingItem, error) {
	if m.ListItemsInListsFunc == nil {
		return nil, nil
	}
	return m.ListItemsInListsFunc(ctx, listIDs)
}
func (m *mockShoppingRepository) VerifyListsOwnership(ctx context.Context, userID uuid.UUID, listIDs []uuid.UUID) (bool, error) {
	if m.VerifyListsOwnershipFunc == nil {
		return true, nil
	}
	return m.VerifyListsOwnershipFunc(ctx, userID, listIDs)
}

type mockJobRepository struct {
	CreateFunc              func(ctx context.Context, job *model.VideoJob) error
	GetByIDFunc             func(ctx context.Context, id uuid.UUID) (*model.VideoJob, error)
	ListByUserFunc          func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.VideoJob, error)
	UpdateProgressFunc      func(ctx context.Context, id uuid.UUID, status model.JobStatus, progress int, message string) error
	MarkCompletedFunc       func(ctx context.Context, id uuid.UUID, resultRecipeID uuid.UUID) error
	MarkFailedFunc          func(ctx context.Context, id uuid.UUID, errorCode, errorMessage string) error
	MarkCancelledFunc       func(ctx context.Context, id uuid.UUID) error
	DeleteFunc              func(ctx context.Context, id, userID uuid.UUID) error
	DeleteAllByUserFunc     func(ctx context.Context, userID uuid.UUID) error
	GetByIdempotencyKeyFunc func(ctx context.Context, userID uuid.UUID, key string) (*model.ExtractionJob, error)
	CountUsedThisMonthFunc  func(ctx context.Context, userID uuid.UUID) (int, error)
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
func (m *mockJobRepository) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if m.DeleteFunc == nil {
		return nil
	}
	return m.DeleteFunc(ctx, id, userID)
}
func (m *mockJobRepository) DeleteAllByUser(ctx context.Context, userID uuid.UUID) error {
	if m.DeleteAllByUserFunc == nil {
		return nil
	}
	return m.DeleteAllByUserFunc(ctx, userID)
}
func (m *mockJobRepository) GetByIdempotencyKey(ctx context.Context, userID uuid.UUID, key string) (*model.ExtractionJob, error) {
	if m.GetByIdempotencyKeyFunc == nil {
		return nil, fmt.Errorf("not found")
	}
	return m.GetByIdempotencyKeyFunc(ctx, userID, key)
}
func (m *mockJobRepository) CountUsedThisMonth(ctx context.Context, userID uuid.UUID) (int, error) {
	if m.CountUsedThisMonthFunc == nil {
		return 0, nil
	}
	return m.CountUsedThisMonthFunc(ctx, userID)
}

type mockVideoDownloader struct {
	DownloadFunc func(ctx context.Context, url string) (string, string, error)
	CleanupFunc  func(path string) error
}

func (m *mockVideoDownloader) Download(ctx context.Context, url string) (string, string, error) {
	if m.DownloadFunc == nil {
		return "", "", nil
	}
	return m.DownloadFunc(ctx, url)
}
func (m *mockVideoDownloader) Cleanup(path string) error {
	if m.CleanupFunc == nil {
		return nil
	}
	return m.CleanupFunc(path)
}

func (m *mockVideoDownloader) GetMetadata(ctx context.Context, url string) (*video.VideoMetadata, error) {
	// Simple mock implementation
	return &video.VideoMetadata{
		Title:       "Mock Video",
		Description: "Mock Description",
		Duration:    120,
		Uploader:    "Mock Uploader",
	}, nil
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
func (m *mockRecipeExtractor) ExtractFromWebpage(ctx context.Context, url string, onProgress ai.ProgressCallback) (*ai.ExtractionResult, error) {
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
func (m *mockRecipeExtractor) ExtractFromImages(ctx context.Context, imageDataList [][]byte, mimeTypes []string) (*ai.ExtractionResult, error) {
	if m.ExtractFromImageFunc == nil {
		return &ai.ExtractionResult{}, nil
	}
	if len(imageDataList) > 0 {
		return m.ExtractFromImageFunc(ctx, imageDataList[0], mimeTypes[0])
	}
	return &ai.ExtractionResult{}, nil
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
	SmartMergeItemsFunc func(ctx context.Context, currentItems []model.ShoppingItem, preferredUnitSystem string, targetLanguage string) ([]model.ShoppingItemInput, error)
}

func (m *mockShoppingListAnalyzer) SmartMergeItems(ctx context.Context, currentItems []model.ShoppingItem, preferredUnitSystem string, targetLanguage string) ([]model.ShoppingItemInput, error) {
	if m.SmartMergeItemsFunc == nil {
		return nil, nil
	}
	return m.SmartMergeItemsFunc(ctx, currentItems, preferredUnitSystem, targetLanguage)
}
