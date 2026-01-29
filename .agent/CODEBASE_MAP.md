# DishFlow - Codebase Map

## Source of Truth for All Files and Their Exact State

This document maps every significant file, its purpose, exports, and key implementation details. Use this as the definitive reference for the codebase.

---

## Constants

### `constants/colors.ts`
Color palette for the entire app.
```typescript
export const colors = {
  honey: { 50, 100, 200, 300, 400: '#C19A6B' },
  sage: { 100: '#E8E7E2', 200: '#7D7A68' },
  stone: { 50: '#F7F3EE', 100: '#EDE7DF', 200: '#E3DDD3', 300: '#C9C3B9' },
  text: { primary: '#2C2A26', secondary: '#5A5753', tertiary: '#8B8173', muted: '#A8A39A' }
}
```

### `constants/typography.ts`
Typography system with presets.
```typescript
export const typography = {
  fontFamily: { display: 'Cormorant Garamond', body: 'Inter', accent: 'Crimson Text' },
  fontSize: { hero: 40, h1: 32, h2: 24, h3: 20, bodyLarge: 17, body: 15, bodySmall: 13, caption: 11 },
  lineHeight: { hero: 48, h1: 40, h2: 32, h3: 28, bodyLarge: 26, body: 24, bodySmall: 20, caption: 16 },
  fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600' },
  letterSpacing: { tight: -0.02, normal: 0 }
}
export const textStyles = { hero, h1, h2, h3, bodyLarge, body, bodySmall, caption }
```

### `constants/categories.ts`
Category definitions ordered by purchase frequency.
```typescript
export interface CategoryInfo { value: IngredientCategory; label: string; keywords: string[] }
export const CATEGORIES: CategoryInfo[] = [
  // Order: dairy, produce, proteins, bakery, pantry, beverages, condiments, spices, snacks, frozen, household, other
]
export const CATEGORY_MAP: Record<IngredientCategory, CategoryInfo>
export function getCategoryLabel(category): string
export function getCategoryForIngredient(ingredientName): IngredientCategory
export const DEFAULT_CATEGORY: IngredientCategory = 'other'
```

**Category Order (actual):**
1. dairy ("Dairy & Eggs")
2. produce ("Produce")
3. proteins ("Proteins")
4. bakery ("Bakery")
5. pantry ("Pantry")
6. beverages ("Beverages")
7. condiments ("Condiments")
8. spices ("Spices")
9. snacks ("Snacks")
10. frozen ("Frozen")
11. household ("Household")
12. other ("Other")

### `constants/categoryVisuals.ts`
Visual configuration for category tiles and badges.
```typescript
export interface CategoryVisual { bg: string; icon: string; gradient: [string, string] }
export const CATEGORY_VISUALS: Record<IngredientCategory, CategoryVisual>
export const CATEGORY_ICONS: Record<IngredientCategory, string>
export function getCategoryVisual(category): CategoryVisual
export function getCategoryIcon(category): string
```

**Actual emoji icons:**
| Category | Emoji | BG Color | Icon Color |
|----------|-------|----------|------------|
| produce | 🥬 | #7D7A68 | white |
| proteins | 🥩 | #A8845A | white |
| dairy | 🥛 | #E8D4B8 | #7D7A68 |
| bakery | 🥖 | #D4B896 | #5C5A4D |
| pantry | 📦 | #C19A6B | white |
| spices | 🧂 | #B85C38 | white |
| condiments | 🫙 | #8B8173 | white |
| beverages | 🍷 | #6B5B4F | white |
| snacks | 🍪 | #D4A574 | #5C5A4D |
| frozen | 🧊 | #9FB4C7 | white |
| household | 🧹 | #ADA396 | white |
| other | 📋 | #C4BBAB | #5C5A4D |

---

## Components

### `components/pantry/index.ts`
Barrel export:
```typescript
export { CategoryTile } from './CategoryTile'
export { ItemTile } from './ItemTile'
export { ItemBadge } from './ItemBadge'
export { FilteredEmoji } from './FilteredEmoji'
```

### `components/pantry/CategoryTile.tsx`
Large visual tile for 2-column category grid.
```typescript
interface CategoryTileProps {
  category: IngredientCategory;
  label: string;
  count: number;
  onPress: () => void;
  isEmpty?: boolean;
}
```
- Uses `Animated.spring` scale (0.96 on press in, 1.0 on press out)
- `LinearGradient` background from `categoryVisuals`
- `FilteredEmoji` icon at size 56
- Haptic feedback on press
- Empty state: 50% opacity, dashed border, stone[100] background
- Count badge with semi-transparent pill

### `components/pantry/FilteredEmoji.tsx`
Emoji with luxury boheme overlay.
```typescript
interface FilteredEmojiProps {
  emoji: string;
  size?: number;       // default: 48
  opacity?: number;    // default: 0.75
  warmTint?: boolean;  // default: true
}
```
- Base emoji rendered at `size * 0.85` fontSize with opacity
- Warm `LinearGradient` overlay: `['rgba(193, 154, 107, 0.15)', 'rgba(212, 184, 150, 0.1)']`
- Overlay has `pointerEvents="none"` and `borderRadius: size / 2`

### `components/pantry/ItemBadge.tsx`
Category-colored circle with first 2 letters.
```typescript
interface ItemBadgeProps {
  name: string;
  category: IngredientCategory;
  size?: number;  // default: 44
}
```
- Shows `name.slice(0, 2)` as initials
- Background color from `CATEGORY_VISUALS[category].bg`
- Text color from `CATEGORY_VISUALS[category].icon`

### `components/pantry/ItemTile.tsx`
Item tile for 3-column grid in category detail.
```typescript
interface ItemTileProps {
  item: PantryItem;
  onPress?: () => void;
  onLongPress?: () => void;
}
```
- Uses `ItemBadge` for visual
- Shows item name and quantity/unit

### `components/ListIcon.tsx`
16 Lucide icons for shopping lists.
```typescript
type IconName = 'cart' | 'party' | 'package' | ... (16 total)
export const DEFAULT_ICON: IconName = 'cart'
export function ListIcon({ name, size, color, strokeWidth, withBackground, backgroundColor })
```

### `components/CategoryIcon.tsx`
Lucide icons for categories (older system, used in shopping).

---

## Stores

### `store/index.ts`
```typescript
export { useRecipeStore } from './recipeStore'
export { usePantryStore } from './pantryStore'
export { useShoppingStore } from './shoppingStore'
export { useShoppingListsStore } from './shoppingListsStore'
```

### `store/pantryStore.ts`
Zustand store for pantry inventory.
```typescript
interface PantryState {
  items: PantryItem[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PantryItem>;
  addItemFromCommon: (commonItem: CommonItem, quantity?: number) => Promise<PantryItem>;
  updateItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;

  getItemsByCategory: (category: IngredientCategory) => PantryItem[];
  searchItems: (query: string) => PantryItem[];
  getItemCount: () => number;
  getCategoryCounts: () => Record<IngredientCategory, number>;
}
```
- Items sorted by category then name on add
- `clearAll()` calls `db.clearAllPantryItems()` and resets state

### `store/shoppingListsStore.ts`
Zustand store for shopping lists and common items.
```typescript
interface ShoppingListsState {
  lists: ShoppingList[];
  activeListId: string | null;
  commonItems: CommonItem[];
  isLoading: boolean;
  error: string | null;

  loadLists: () => Promise<void>;
  createList: (list) => Promise<ShoppingList>;
  updateList: (id, updates) => Promise<void>;
  deleteList: (id) => Promise<void>;
  setActiveList: (id) => void;
  getActiveList: () => ShoppingList | null;

  loadCommonItems: () => Promise<void>;
  getCommonItemsByCategory: (category) => CommonItem[];
  searchCommonItems: (query) => Promise<CommonItem[]>;
  incrementItemUsage: (itemId) => Promise<void>;
  resetCommonItems: () => Promise<void>;
  clearAllLists: () => Promise<void>;
}
```

### `store/shoppingStore.ts`
Items within shopping lists.

### `store/recipeStore.ts`
Recipe CRUD and AI generation.

---

## Screens

### `app/(tabs)/pantry.tsx`
**Main pantry screen with 2-column category grid.**

Imports: `usePantryStore`, `useShoppingListsStore`, `CATEGORIES`, `CategoryTile`, `ItemBadge`

Key features:
- Header: "My Pantry" + search + three-dot menu + add button
- Search bar (toggleable)
- Search results list with `ItemBadge`
- Empty state: Leaf icon, "A Peaceful Pantry", quick add chips
- Category grid: 2-column using `CategoryTile`, shows all 12 categories
- Quick actions: Shop + Scan buttons
- Three-dot menu modal: Clear All Items, Reset Product Database

Key handlers:
- `handleAddPress()` → `/pantry/add`
- `handleCategoryPress(value)` → `/pantry/category/${value}`
- `handleClearAll()` → Alert → `clearAll()`
- `handleResetData()` → Alert → `resetCommonItems()`

### `app/pantry/add.tsx`
**Add items to pantry with optional category filter.**

URL params: `?category=proteins` (optional)

Key features:
- If `category` param: Shows filtered items list directly (no category grid)
- If no param: Shows 3-column category grid to browse
- Search bar with debounced autocomplete
- Category items modal (when browsing all categories)
- Quantity confirmation modal with stepper
- Custom item add option
- Haptic feedback on all interactions

**Critical implementation detail:**
- Category grid uses `<View key={...} className="w-1/3 p-1.5">` wrapping `<Pressable className="active:opacity-70">`
- The `active:` class MUST be on the Pressable, not an inner View
- Modal visible condition: `visible={showCategoryItems && !initialCategory}`

### `app/pantry/category/[id].tsx`
**Category detail with 3-column item grid.**

Route param: `id` = IngredientCategory value

Key features:
- Colored gradient header matching category
- 3-column grid of `ItemTile` components
- Long-press to delete items
- Add button navigates to `/pantry/add?category=${id}`

### `app/(tabs)/shopping.tsx`
**Shopping lists home screen.**

Key features:
- Shows first 3 lists as cards
- Create New List button
- View All Lists (when > 3)
- Three-dot menu: Clear All Lists, Reset Product Database

---

## Library

### `lib/database.ts`
SQLite database operations.

Key functions:
```typescript
// Pantry
getAllPantryItems(): Promise<PantryItem[]>
createPantryItem(item): Promise<PantryItem>
updatePantryItem(id, updates): Promise<void>
deletePantryItem(id): Promise<void>
clearAllPantryItems(): Promise<void>

// Shopping Lists
getAllShoppingLists(): Promise<ShoppingList[]>
createShoppingList(list): Promise<ShoppingList>
updateShoppingList(id, updates): Promise<void>
deleteShoppingList(id): Promise<void>
clearAllShoppingLists(): Promise<void>
updateListLastUsed(id): Promise<void>

// Common Items
seedCommonItemsIfNeeded(): Promise<void>
getAllCommonItems(): Promise<CommonItem[]>
searchCommonItems(query): Promise<CommonItem[]>
incrementItemUsage(itemId): Promise<void>
resetCommonItems(): Promise<void>
```

### `lib/commonItemsSeed.ts`
~200 items ordered by US/Europe consumption frequency.
Each item: `{ name, category, defaultQuantity, defaultUnit, keywords, usageCount, sortOrder }`

### `lib/ai/pantryScanner.ts`
Gemini-powered image scanning (fully implemented).
```typescript
export interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  confidence: number;
  matchedCommonItem?: CommonItem;
  isSelected: boolean;
}

export interface ScanResult {
  items: ScannedItem[];
  processingTime: number;
  imageCount: number;
  error?: string;
}

export function matchToCommonItems(scannedItems, commonItems): ScannedItem[]
export async function scanPantryImages(imageUris: string[], commonItems: CommonItem[]): Promise<ScanResult>
```
- Uses `geminiModel` from `@/lib/gemini`
- Converts images to base64
- Structured prompt requesting JSON array
- Fuzzy matching against common items catalog
- Auto-selects items with confidence >= 0.5

---

## Types

### `types/index.ts`
```typescript
type IngredientCategory = 'produce' | 'proteins' | 'dairy' | 'bakery' | 'pantry' |
  'spices' | 'condiments' | 'beverages' | 'snacks' | 'frozen' | 'household' | 'other'

interface PantryItem {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity?: number;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isTemplate?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommonItem {
  id: string;
  name: string;
  category: IngredientCategory;
  defaultQuantity?: number;
  defaultUnit?: string;
  keywords?: string[];
  usageCount: number;
  sortOrder: number;
}
```

---

## Gotchas & Lessons Learned

### NativeWind `active:` Pseudo-class
- ONLY works on `<Pressable>` components
- Putting `active:opacity-70` on a `<View>` inside Pressable does NOTHING
- Always put active/hover states directly on the Pressable

### expo-linear-gradient
- Import: `import { LinearGradient } from 'expo-linear-gradient'`
- Required for CategoryTile gradient backgrounds and FilteredEmoji warm overlay
- Install with: `npm install expo-linear-gradient --legacy-peer-deps`

### expo-haptics
- Import: `import * as Haptics from 'expo-haptics'`
- Use `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` for taps
- Use `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` for confirmations
- Use `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` for destructive actions
- Install with: `npm install expo-haptics --legacy-peer-deps`

### Modal Timing
- `loadCommonItems()` is async; items may not be available when modal opens
- Use `itemsLoaded` state flag and show loading indicator
- Wait for load to complete before showing item lists

### Category Filtering in Add Screen
- URL param `?category=proteins` filters the add screen
- When filtered: shows inline list, no category grid, no modal
- When not filtered: shows category grid, uses modal for items
- Modal condition: `visible={showCategoryItems && !initialCategory}`

### Peer Dependencies
- Always use `--legacy-peer-deps` when installing npm packages
- Expo SDK 52 has some peer dependency conflicts

---

**Last Updated**: 2026-01-28
**Covers**: All changes through Pantry Visual Redesign v2.1
