# DishFlow Pantry 2.0 - AI-Powered Inventory Management

## Product Specification Document
**Version:** 1.1
**Author:** Senior Product Designer
**Date:** 2026-01-25
**Status:** Phase 1-2 Complete, Phase 3+ Ready for Development

---

## Implementation Status

### Completed (v2.1)
- [x] Visual pantry redesign with 2-column category grid
- [x] 3-column item grid in category detail view
- [x] Category-specific colors and gradients (`constants/categoryVisuals.ts`)
- [x] FilteredEmoji component for luxury aesthetic
- [x] ItemBadge component (letter + category color)
- [x] CategoryTile component with gradient backgrounds
- [x] Category filtering when adding from detail view
- [x] Three-dot menu with Clear All and Reset Database
- [x] Haptic feedback throughout
- [x] Common items reordered by consumption frequency (~200 items)
- [x] Categories reordered by purchase frequency

### Pending (Future)
- [ ] AI photo scanning
- [ ] Expiration date tracking
- [ ] Low stock alerts
- [ ] Restock-to-shopping flow

---

## Executive Summary

Pantry 2.0 delivers a streamlined inventory management experience with a **visual grid-based interface**. The **primary interaction is manual entry** using a category grid system and common items catalog. As an **advanced feature**, users can optionally use AI-powered photo scanning to bulk-add items from pantry shelf photos.

**Priority Order:**
1. **Default:** Visual category grid + manual entry via Quick Add (COMPLETE)
2. **Advanced:** AI photo scanning for bulk imports (PENDING)

---

## 1. Design Philosophy

### 1.1 Luxury Boheme Alignment

Every element must embody the established design language:

| Element | Specification |
|---------|---------------|
| **Primary Accent** | Sage `#7D7A68` (pantry's signature color) |
| **Secondary** | Honey `#C19A6B` (for AI/smart features) |
| **Backgrounds** | Stone `#F7F3EE` (main), `#EDE7DF` (cards) |
| **Typography** | Cormorant Garamond (headers 24-40px), Inter (body 13-16px) |
| **Icons** | Lucide React Native, 1.5px stroke |
| **Emojis** | FilteredEmoji component (opacity 0.75 + warm tint overlay) |
| **Shadows** | Subtle, warm (`rgba(44, 42, 38, 0.08)`) |
| **Corners** | Rounded (16px cards, 24px modals, 24px tiles) |

### 1.2 Core Principles

1. **Visual First** - Grid-based navigation with large tiles for quick scanning
2. **Consistent Data** - Same ~200-item catalog, categories, and components
3. **Progressive Enhancement** - AI photo scanning as optional power feature
4. **User Control** - Always review AI suggestions before committing
5. **Seamless Integration** - Works harmoniously with Shopping lists

---

## 2. Visual System Architecture (NEW)

### 2.1 Category Visual System

Each category has a unique visual identity defined in `constants/categoryVisuals.ts`:

```typescript
interface CategoryVisual {
  bg: string;           // Background color
  icon: string;         // Icon color ('white' or hex)
  gradient: [string, string];  // Gradient colors
}

const CATEGORY_VISUALS: Record<IngredientCategory, CategoryVisual> = {
  dairy:      { bg: '#E8D4B8', icon: '#7D7A68', gradient: ['#F0DCC0', '#E0CCB0'] },
  produce:    { bg: '#7D7A68', icon: 'white',   gradient: ['#8D8A78', '#6D6A58'] },
  proteins:   { bg: '#A8845A', icon: 'white',   gradient: ['#B8946A', '#98744A'] },
  bakery:     { bg: '#D4B896', icon: '#5C5A4D', gradient: ['#DCC09E', '#CCB08E'] },
  pantry:     { bg: '#C19A6B', icon: 'white',   gradient: ['#D1AA7B', '#B18A5B'] },
  spices:     { bg: '#B85C38', icon: 'white',   gradient: ['#C86C48', '#A84C28'] },
  condiments: { bg: '#8B8173', icon: 'white',   gradient: ['#9B9183', '#7B7163'] },
  beverages:  { bg: '#6B5B4F', icon: 'white',   gradient: ['#7B6B5F', '#5B4B3F'] },
  snacks:     { bg: '#D4A574', icon: '#5C5A4D', gradient: ['#DEB584', '#C49564'] },
  frozen:     { bg: '#9FB4C7', icon: 'white',   gradient: ['#AFCCD7', '#8FA4B7'] },
  household:  { bg: '#ADA396', icon: 'white',   gradient: ['#BDB3A6', '#9D9386'] },
  other:      { bg: '#C4BBAB', icon: '#5C5A4D', gradient: ['#D4CBBB', '#B4AB9B'] },
};

const CATEGORY_ICONS: Record<IngredientCategory, string> = {
  dairy: '🥛',
  produce: '🥬',
  proteins: '🥩',
  bakery: '🥖',
  pantry: '📦',
  spices: '🌿',
  condiments: '🫙',
  beverages: '☕',
  snacks: '🍿',
  frozen: '🧊',
  household: '🧹',
  other: '🛒',
};
```

### 2.2 Component Library

**New components in `components/pantry/`:**

| Component | Purpose |
|-----------|---------|
| `CategoryTile.tsx` | Large grid tiles with gradient background, filtered emoji icon |
| `ItemTile.tsx` | Item grid tiles with letter badge, name, quantity |
| `ItemBadge.tsx` | Category-colored circle with first 2 letters |
| `FilteredEmoji.tsx` | Emoji with opacity (0.75) + warm LinearGradient overlay |
| `index.ts` | Barrel export for all components |

### 2.3 FilteredEmoji Specification

Applies luxury bohème aesthetic to emojis:

```typescript
interface FilteredEmojiProps {
  emoji: string;
  size?: number;        // Default: 48
  opacity?: number;     // Default: 0.75
  warmTint?: boolean;   // Default: true
}

// Implementation uses:
// 1. Base opacity reduction (0.75-0.85)
// 2. Warm LinearGradient overlay: ['rgba(193, 154, 107, 0.15)', 'rgba(125, 122, 104, 0.1)']
```

---

## 3. Centralized Data Architecture

### 3.1 Single Source of Truth

**Both Pantry and Shopping MUST use identical data sources and components.**

```
SHARED RESOURCES (DO NOT DUPLICATE)
═══════════════════════════════════════════════════════

lib/commonItemsSeed.ts ──────────── ~200 items catalog
    │                               (ordered by consumption frequency)
    │
constants/categoryVisuals.ts ────── Category colors, gradients, icons
    │
components/pantry/ ──────────────── Visual components
    │                               (CategoryTile, ItemBadge, FilteredEmoji)
    │
types/index.ts ──────────────────── IngredientCategory type
    │                               (12 categories)
    │
store/shoppingListsStore.ts ─────── searchCommonItems()
    │                               getCommonItemsByCategory()
    │                               resetCommonItems()
    │
store/pantryStore.ts ────────────── Pantry items + clearAll()
```

### 3.2 Unified Categories (12)

Categories ordered by purchase frequency (based on US/Europe consumption data):

```typescript
type IngredientCategory =
  | 'dairy'        // 🥛 - 60%+ buy eggs regularly
  | 'produce'      // 🥬 - 64% buy fresh produce
  | 'proteins'     // 🥩 - Most common proteins
  | 'bakery'       // 🥖 - Bread is universal
  | 'pantry'       // 📦 - Rice, pasta, oils
  | 'spices'       // 🌿 - Salt, pepper, herbs
  | 'condiments'   // 🫙 - Ketchup, mayo, mustard
  | 'beverages'    // ☕ - Coffee, juice, wine
  | 'snacks'       // 🍿 - Chips, chocolate, cookies
  | 'frozen'       // 🧊 - Frozen pizza, ice cream
  | 'household'    // 🧹 - Paper towels, soap
  | 'other'        // 🛒 - Miscellaneous
```

### 3.3 Common Items Catalog (~200 items)

Items ordered by consumption frequency within each category:

| Category | Count | Top Items |
|----------|-------|-----------|
| Dairy & Eggs | 25 | Eggs, Milk, Butter, Cheddar Cheese |
| Produce | 45 | Bananas, Apples, Tomatoes, Onions, Garlic |
| Proteins | 30 | Chicken Breast, Ground Beef, Bacon, Salmon |
| Bakery | 15 | White Bread, Tortillas, Bagels |
| Pantry | 25 | Rice, Pasta, Olive Oil, Flour |
| Spices | 20 | Salt, Black Pepper, Garlic Powder |
| Condiments | 15 | Ketchup, Mayonnaise, Mustard |
| Beverages | 15 | Coffee, Orange Juice, Wine |
| Snacks | 15 | Potato Chips, Chocolate, Cookies |
| Frozen | 12 | Frozen Pizza, Ice Cream |
| Household | 10 | Paper Towels, Dish Soap |

---

## 4. Screen Specifications (IMPLEMENTED)

### 4.1 Main Pantry Home Screen

**2-Column Category Grid Layout:**

```
┌─────────────────────────────────────┐
│  My Pantry          [🔍] [⋮] [+]   │
│  12 ingredients                     │
├─────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐      │
│  │   🥛      │  │   🥬      │      │
│  │  DAIRY    │  │ PRODUCE   │      │
│  │  4 items  │  │  3 items  │      │
│  └───────────┘  └───────────┘      │
│  ┌───────────┐  ┌───────────┐      │
│  │   🥩      │  │   🥖      │      │
│  │ PROTEINS  │  │  BAKERY   │      │
│  │  2 items  │  │  1 item   │      │
│  └───────────┘  └───────────┘      │
│  ...                               │
└─────────────────────────────────────┘
```

**CategoryTile Component:**
- Size: ~160x160px (flex to fill width with gap)
- Border radius: 24px (rounded-3xl)
- Background: LinearGradient with category colors
- Icon: FilteredEmoji (48px) centered
- Label: Category name in Cormorant Garamond, 16px
- Count badge: Small pill showing item count
- Empty state: 50% opacity, dashed border
- Active state: Scale 0.98 with opacity 0.9

### 4.2 Category Detail Screen

**3-Column Item Grid Layout:**

```
┌─────────────────────────────────────┐
│  ← Proteins                    [+]  │
│  3 items in pantry                  │
├─────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ Ch  │  │ Gr  │  │ Ba  │        │
│  │Chick│  │G.Beef│ │Bacon│        │
│  │ 2kg │  │500g │  │ 1pk │        │
│  └─────┘  └─────┘  └─────┘        │
│                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │      + Add Proteins        │    │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
└─────────────────────────────────────┘
```

**ItemTile Component:**
- Size: ~100x120px
- Border radius: 20px (rounded-2xl)
- Background: Light cream (stone-100)
- Visual: ItemBadge (44px) centered
- Name: Item name truncated, Inter 13px semibold
- Quantity: "{qty} {unit}" in Inter 11px, text-muted
- Long press: Delete option

### 4.3 Add Screen

**Category Grid with Filtering:**

When navigating from category detail (`/pantry/add?category=proteins`):
- Shows only items from that category
- Header shows "Add Proteins"
- No category grid visible

When navigating from main pantry (`/pantry/add`):
- Shows all categories in 3-column grid
- Search bar at top
- "Scan with AI" at bottom

**Category Press Behavior:**
- Must use `active:opacity-70` on Pressable (NOT inner View)
- Haptic feedback on press
- Opens modal with category items

### 4.4 Three-Dot Menu

Both Pantry and Shopping screens have menu with:
- **Clear All Items/Lists** - Removes all data with confirmation
- **Reset Product Database** - Resets common items to defaults

---

## 5. Technical Implementation

### 5.1 File Structure (Current)

```
dishflow/
├── app/
│   └── (tabs)/
│       └── pantry.tsx              # 2-column category grid + menu
│   └── pantry/
│       ├── add.tsx                 # Add screen with category filter
│       ├── category/[id].tsx       # 3-column item grid
│       ├── scan.tsx                # AI scan (placeholder)
│       └── restock.tsx             # Restock (placeholder)
├── components/
│   └── pantry/
│       ├── index.ts                # Barrel export
│       ├── CategoryTile.tsx        # Large gradient tiles
│       ├── ItemTile.tsx            # Item grid tiles
│       ├── ItemBadge.tsx           # Letter badge
│       └── FilteredEmoji.tsx       # Emoji with luxury filter
├── constants/
│   ├── colors.ts                   # Color palette
│   ├── categories.ts               # Category definitions (ordered)
│   └── categoryVisuals.ts          # Category colors/gradients/icons
├── lib/
│   ├── database.ts                 # SQLite + clear/reset functions
│   └── commonItemsSeed.ts          # ~200 items (consumption-ordered)
├── store/
│   ├── pantryStore.ts              # Pantry + clearAll + getCategoryCounts
│   └── shoppingListsStore.ts       # Lists + resetCommonItems
└── types/
    └── index.ts                    # TypeScript interfaces
```

### 5.2 Store Functions (Implemented)

```typescript
// pantryStore.ts
interface PantryState {
  items: PantryItem[];
  loadItems: () => Promise<void>;
  addItem: (item) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;              // NEW
  getCategoryCounts: () => Record<IngredientCategory, number>; // NEW
}

// shoppingListsStore.ts
interface ShoppingListsState {
  // ... existing ...
  clearAllLists: () => Promise<void>;         // NEW
  resetCommonItems: () => Promise<void>;      // NEW
}
```

### 5.3 Database Functions (Implemented)

```typescript
// lib/database.ts
export async function clearAllPantryItems(): Promise<void>;
export async function clearAllShoppingLists(): Promise<void>;
export async function resetCommonItems(): Promise<void>;
```

---

## 6. Future Features (Pending)

### 6.1 AI Photo Scanning

Camera-based bulk import of pantry items using Gemini API.

### 6.2 Expiration Tracking

```typescript
interface PantryItem {
  // ... existing ...
  purchasedAt?: string;
  expiresAt?: string;
  freshnessStatus?: 'fresh' | 'use_soon' | 'expired';
}
```

### 6.3 Low Stock Alerts

```typescript
interface PantryItem {
  // ... existing ...
  isStaple?: boolean;
  lowStockThreshold?: number;
  averageUsageDays?: number;
}
```

### 6.4 Restock-to-Shopping Flow

Generate shopping list from low/expired items.

---

## 7. Implementation Checklist

### Phase 1: Visual Foundation (COMPLETE)
- [x] Create `constants/categoryVisuals.ts` with colors/gradients
- [x] Create `components/pantry/CategoryTile.tsx`
- [x] Create `components/pantry/ItemTile.tsx`
- [x] Create `components/pantry/ItemBadge.tsx`
- [x] Create `components/pantry/FilteredEmoji.tsx`
- [x] Create `components/pantry/index.ts` barrel export

### Phase 2: Screen Redesign (COMPLETE)
- [x] Redesign `app/(tabs)/pantry.tsx` with 2-column grid
- [x] Redesign `app/pantry/category/[id].tsx` with 3-column grid
- [x] Update `app/pantry/add.tsx` with category filtering
- [x] Add three-dot menu to Pantry and Shopping
- [x] Add `clearAll()` to pantryStore
- [x] Add `clearAllLists()` and `resetCommonItems()` to shoppingListsStore
- [x] Add database functions for clear/reset
- [x] Reorder categories by purchase frequency
- [x] Reorder common items by consumption frequency
- [x] Add haptic feedback throughout
- [x] Fix Pressable active state (on Pressable, not inner View)

### Phase 3: AI Integration (PENDING)
- [ ] Set up Gemini API client
- [ ] Create `lib/ai/pantryScanner.ts`
- [ ] Implement common items matching algorithm
- [ ] Create processing screen with animations

### Phase 4: Camera & Capture (PENDING)
- [ ] Implement camera permissions flow
- [ ] Create camera screen with guide overlay
- [ ] Add multi-photo queue
- [ ] Implement gallery import fallback

### Phase 5: Review & Edit (PENDING)
- [ ] Create review screen layout
- [ ] Implement confidence visualization
- [ ] Build item edit modal
- [ ] Add batch operations

### Phase 6: Shopping Integration (PENDING)
- [ ] Create restock detection logic
- [ ] Build restock screen
- [ ] Implement "Add to Shopping List" flow
- [ ] Cross-link pantry items with shopping

### Phase 7: Polish (PENDING)
- [ ] Add loading states and animations
- [ ] Implement error handling
- [ ] Add analytics tracking
- [ ] Performance optimization

---

## 8. Dependencies

### Installed
- expo-linear-gradient (for gradient backgrounds)
- expo-haptics (for touch feedback)
- lucide-react-native (for icons)

### Pending (for AI features)
- expo-camera
- expo-image-picker
- @google/generative-ai

---

**Document Status:** Phase 1-2 Complete, Phase 3+ Ready for Development

**Last Updated:** 2026-01-25
