# DishFlow - Project Context

## Overview
DishFlow is a luxury bohème recipe and meal planning app built with React Native (Expo), featuring a sophisticated shopping list system with multi-list support, visual pantry management with grid-based navigation, smart categorization, and elegant UI design.

## Tech Stack
- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Database**: SQLite (expo-sqlite)
- **State Management**: Zustand
- **Styling**: NativeWind (Tailwind CSS)
- **Icons**: Lucide React Native
- **Fonts**: Cormorant Garamond, Inter
- **AI**: Google Gemini API
- **Animations**: expo-linear-gradient, expo-haptics
- **Typography System**: `constants/typography.ts` (Cormorant Garamond, Inter, Crimson Text)

## Design Philosophy
**Luxury Bohème Aesthetic**
- Warm, earthy color palette (honey, sage, stone)
- Elegant typography (Cormorant Garamond for headers, Inter for body)
- Refined stroke-based icons (1.5px width)
- Subtle shadows and rounded corners
- Background textures for depth
- Filtered emojis with warm tint overlay (no raw emojis)

## Color Palette
```typescript
colors = {
  honey: {
    50: '#F5E6D3',
    100: '#EDD9BF',
    200: '#E5CCAB',
    300: '#DDBF97',
    400: '#C19A6B',  // Primary accent
  },
  sage: {
    100: '#E8E7E2',
    200: '#7D7A68',  // Secondary accent
  },
  stone: {
    50: '#F7F3EE',
    100: '#EDE7DF',
    200: '#E3DDD3',
    300: '#C9C3B9',
  },
  text: {
    primary: '#2C2A26',
    secondary: '#5A5753',
    tertiary: '#8B8173',
    muted: '#A8A39A',
  },
}
```

## Category Visual System (NEW)
Each ingredient category has a dedicated color palette:
```typescript
CATEGORY_VISUALS = {
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
}
```

## Architecture

### Database Schema
**Tables:**
1. `recipes` - Recipe metadata and instructions
2. `ingredients` - Recipe ingredients with quantities
3. `shopping_lists` - Multiple shopping lists support
4. `shopping_items` - Items within lists
5. `common_items` - Pre-populated catalog (~200 items, ordered by consumption frequency)
6. `pantry_items` - User's pantry inventory

### State Management (Zustand)
- `recipeStore` - Recipe CRUD, AI generation
- `shoppingListsStore` - Multi-list management, common items, reset functions
- `shoppingStore` - Shopping items, category grouping
- `pantryStore` - Pantry inventory, clearAll function

### Key Features

#### 1. Visual Pantry System (NEW - v2.1)
- **2-Column Category Grid**: Large visual tiles (~160x160px) for categories
- **3-Column Item Grid**: Visual item tiles with letter badges
- **Filtered Emojis**: Warm tint overlay for luxury aesthetic
- **Category Colors**: Each category has distinct gradient background
- **Empty State Handling**: Empty categories shown at 50% opacity with dashed border

#### 2. Multi-List Shopping System
- Create multiple shopping lists (Weekly, Breakfast, Lunch, Dinner, etc.)
- Custom icons (16 Lucide icons available)
- Templates for quick list creation
- List-specific item management

#### 3. Smart Item Management
- **Quick Add**: Category-based quick selection
- **Common Items Catalog**: ~200 pre-populated items across 12 categories
- **Search & Autocomplete**: Instant search with suggestions
- **Quantity Confirmation**: Review/adjust quantities before adding
- **Category Grouping**: Auto-organize by ingredient category
- **Category Filtering**: When adding from category detail, only show relevant items

#### 4. Management Menus
- **Three-dot menu** on Pantry screen: Clear All Items, Reset Product Database
- **Three-dot menu** on Shopping screen: Clear All Lists, Reset Product Database
- Haptic feedback on all destructive actions

#### 5. Icon System
**List Icons** (16 available):
- cart, party, package, utensils, salad, coffee, wine, cake, pizza, soup, sandwich, apple, icecream, heart, star, home

**Category Icons** (12 categories - emojis with luxury filter via FilteredEmoji):
- Dairy & Eggs → 🥛
- Produce → 🥬
- Proteins → 🥩
- Bakery & Bread → 🥖
- Pantry Staples → 📦
- Spices & Herbs → 🧂
- Condiments & Sauces → 🫙
- Beverages → 🍷
- Snacks → 🍪
- Frozen → 🧊
- Household → 🧹
- Other → 📋

#### 6. Common Items Catalog (~200 items)
Ordered by US/Europe consumption frequency (90% household coverage):
- **Dairy & Eggs** (25): Eggs, milk, butter, cheese varieties, yogurt
- **Produce** (45): Bananas, apples, tomatoes, onions, leafy greens
- **Proteins** (30): Chicken breast, ground beef, bacon, salmon
- **Bakery** (15): White bread, tortillas, bagels, croissants
- **Pantry** (25): Rice, pasta, olive oil, canned goods, flour
- **Spices** (20): Salt, black pepper, garlic powder, oregano
- **Condiments** (15): Ketchup, mayonnaise, mustard, soy sauce
- **Beverages** (15): Coffee, orange juice, wine, beer
- **Snacks** (15): Potato chips, chocolate, cookies, nuts
- **Frozen** (12): Frozen pizza, ice cream, frozen vegetables
- **Household** (10): Paper towels, dish soap, trash bags

## File Structure
```
dishflow/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Home/Recipes
│   │   ├── shopping.tsx       # Shopping Lists (multi-list + menu)
│   │   └── pantry.tsx         # Pantry (2-column grid + menu)
│   ├── pantry/
│   │   ├── add.tsx            # Add to pantry (category filter support)
│   │   ├── category/[id].tsx  # Category detail (3-column item grid)
│   │   ├── scan.tsx           # AI scan for pantry
│   │   └── restock.tsx        # Restock suggestions
│   ├── shopping-list/
│   │   ├── [id].tsx           # List Detail (with Quick Add)
│   │   └── create.tsx         # Create List (with templates)
│   └── shopping-lists.tsx     # All Lists View
├── components/
│   ├── ListIcon.tsx           # List icon component
│   ├── CategoryIcon.tsx       # Category icon component
│   └── pantry/
│       ├── index.ts           # Barrel export
│       ├── CategoryTile.tsx   # Large category grid tiles
│       ├── ItemTile.tsx       # Item grid tiles
│       ├── ItemBadge.tsx      # Letter badge for items
│       └── FilteredEmoji.tsx  # Emoji with luxury filter overlay
├── constants/
│   ├── colors.ts              # Luxury bohème palette
│   ├── typography.ts          # Font families, sizes, text style presets
│   ├── categories.ts          # Category definitions (ordered by frequency)
│   └── categoryVisuals.ts     # Category colors, gradients, icons
├── store/
│   ├── recipeStore.ts
│   ├── shoppingListsStore.ts  # Multi-list + common items + clear/reset
│   ├── shoppingStore.ts       # Items management
│   └── pantryStore.ts         # Pantry + clearAll
├── lib/
│   ├── database.ts            # SQLite operations + clear functions
│   ├── commonItemsSeed.ts     # ~200 item catalog (consumption-ordered)
│   └── ai/
│       └── pantryScanner.ts   # Gemini AI image scanning (implemented)
└── types/
    └── index.ts               # TypeScript interfaces
```

## Recent Major Changes

### Pantry Visual Redesign (v2.1 - Complete)
✅ 2-column category grid with large visual tiles
✅ 3-column item grid in category detail
✅ Category-specific colors and gradients
✅ FilteredEmoji component for luxury aesthetic
✅ ItemBadge component (letter + category color)
✅ CategoryTile component with gradient backgrounds
✅ ItemTile component for item grid
✅ Category filtering when adding from detail view
✅ Three-dot menu with Clear All and Reset Database
✅ Haptic feedback throughout
✅ Common items reordered by consumption frequency
✅ Categories reordered by purchase frequency

### Shopping List Redesign (v2.0 - Complete)
✅ Multi-list support with custom icons
✅ Quick Add by category
✅ Common items catalog (~200 items)
✅ Search & autocomplete
✅ Quantity confirmation modal
✅ Category-based organization
✅ Lucide icon system (no emojis)
✅ Meal templates (Breakfast, Lunch, Dinner)
✅ Long-press delete in Shopping tab
✅ Checked items stay visible with strikethrough
✅ Three-dot menu with management options

### UI/UX Improvements
✅ SafeAreaView fixes for notch compatibility
✅ Elegant Lucide icons throughout
✅ Confirmation modals for better UX
✅ Consistent luxury bohème styling
✅ Background textures and shadows
✅ Haptic feedback on all interactions

## Development Commands
```bash
# Start development server
npx expo start --clear

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android

# Clear cache and restart
lsof -ti:8081 | xargs kill -9
npx expo start --clear

# Install new dependencies (with legacy peer deps for compatibility)
npm install <package> --legacy-peer-deps
```

## Database Seeding
Common items are automatically seeded on first app launch. To re-seed:
1. Delete the app from simulator
2. Restart with `--clear` flag
3. Database will be recreated with all ~200 items

To reset without deleting app:
1. Open three-dot menu in Pantry or Shopping
2. Tap "Reset Product Database"
3. Confirms and resets to default items

## Design Patterns

### Component Structure
- Use functional components with hooks
- Zustand for global state
- Local state for UI-only concerns
- Proper TypeScript typing

### Styling Conventions
- NativeWind classes for layout
- Inline styles for colors/fonts (better type safety)
- Consistent spacing (px-6, py-4, etc.)
- Rounded corners (rounded-2xl, rounded-3xl)
- `active:opacity-70` on Pressable (NOT inner View)

### User Flows
1. **Pantry Browse**: Grid categories → Tap category → See items → Long-press to delete
2. **Add to Pantry**: Tap + → Browse categories OR search → Select item → Confirm quantity
3. **Category Add**: Inside category → Tap + → See only that category's items
4. **Create List**: Templates → Customize → Create
5. **Add Items**: Quick Add (category) → Confirm → Add
6. **Shopping**: Check items → Stay visible → Clear when done
7. **Delete**: Long-press → Confirm → Delete

## Known Issues & Limitations
- None currently! All major features implemented and working.

## Future Enhancements
- Recipe-to-list integration (add recipe ingredients to shopping list)
- Pantry integration (auto-remove pantry items from lists)
- Smart suggestions based on usage patterns
- Shared lists (multi-user support)
- Barcode scanning for items
- Store aisle mapping
- Expiration date tracking for pantry items

## Testing Notes
- Test on both iOS and Android
- Verify SafeAreaView on devices with notches
- Test long-press gestures
- Verify database seeding on fresh install
- Check icon rendering across all categories
- Test category grid press responsiveness
- Verify haptic feedback on interactions
- Test category filtering in add screen

---

**Last Updated**: 2026-01-25
**Version**: 2.1 (Pantry Visual Redesign Complete)
