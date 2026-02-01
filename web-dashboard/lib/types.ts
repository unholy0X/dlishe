export type PantryCategory =
    | 'produce'
    | 'proteins'
    | 'dairy'
    | 'grains'
    | 'pantry'
    | 'spices'
    | 'condiments'
    | 'beverages'
    | 'frozen'
    | 'canned'
    | 'baking'
    | 'other';

export interface PantryItem {
    id: string;
    userId: string;
    name: string;
    category: PantryCategory;
    quantity?: number;
    unit?: string;
    expirationDate?: string; // ISO Date string
    syncVersion: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

export interface PantryItemInput {
    name: string;
    category: PantryCategory;
    quantity?: number;
    unit?: string;
    expirationDate?: string;
}

export interface PantryResponse {
    items: PantryItem[];

    count: number;
}

export interface ShoppingList {
    id: string;
    userId: string;
    name: string;
    description?: string;
    icon?: string;
    isTemplate: boolean;
    isArchived: boolean;
    syncVersion: number;
    createdAt: string;
    updatedAt: string;
}

export interface ShoppingItem {
    id: string;
    listId: string;
    name: string;
    quantity?: number;
    unit?: string;
    category?: PantryCategory;
    isChecked: boolean;
    recipeName?: string;
    syncVersion: number;
    createdAt: string;
    updatedAt: string;
}

export interface ShoppingListWithItems extends ShoppingList {
    items: ShoppingItem[];
}

export interface ShoppingListInput {
    name: string;
    description?: string;
    icon?: string;
    isTemplate?: boolean;
}

export interface ShoppingItemInput {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    recipeName?: string;
}

export interface ShoppingListsResponse {
    lists: ShoppingList[];
    count: number;
}

export interface ShoppingItemsResponse {
    items: ShoppingItem[];
    count: number;
    warnings?: string[];
}

export type ResourceType = 'pantry_item' | 'shopping_list' | 'shopping_item' | 'recipe';

export interface SyncRequest {
    lastSyncTimestamp: string; // ISO
    changes: ChangeItem[];
}

export interface ChangeItem {
    id: string; // UUID
    type: ResourceType;
    action: 'create' | 'update' | 'delete';
    data: any; // JSON string in backend, but here actual object? Backend expects serialized JSON string in "Data" field if it's generic?
    // Let's check backend model.
    updatedAt: string;
}

// Backend SyncRequest:
// type SyncRequest struct {
//    ClientID          string       `json:"clientId"`
//    LastSyncTimestamp time.Time    `json:"lastSyncTimestamp"`
//    Changes           []ChangeItem `json:"changes"`
// }
// type ChangeItem struct {
//    ID           uuid.UUID       `json:"id"`
//    Type         ResourceType    `json:"type"`
//    Action       ActionType      `json:"action"`
//    Data         json.RawMessage `json:"data"`
//    ClientTime   time.Time       `json:"clientTime"`
// }

// So payload should match.

export interface SyncResponse {
    serverTimestamp: string;
    changes: ServerChangeItem[];
    conflicts: Conflict[];
}

export interface ServerChangeItem {
    id: string;
    type: ResourceType;
    action: 'create' | 'update' | 'delete';
    data: any;
    updatedAt: string;
}

export interface Conflict {
    id: string;
    type: ResourceType;
    serverVersion: any;
    clientVersion: any;
    resolution: 'server' | 'client' | 'manual';
    resolvedData?: any;
}

export interface ListAnalysisResult {
    suggestions: ListSuggestion[];
    missingEssentials: string[];
    categoryOptimizations: CategoryOptimization[];
}

export interface ListSuggestion {
    type: 'duplicate' | 'merge' | 'general';
    message: string;
    itemNames?: string[];
    actionLabel?: string;
}

export interface CategoryOptimization {
    itemName: string;
    currentCategory: string;
    newCategory: string;
    reason: string;
}

export interface AnalyzeAddResponse {
    analysis: ListAnalysisResult;
    proposedItems: ShoppingItem[];
}
