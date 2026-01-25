# DishFlow Changelog

## [2.1.0] - 2026-01-25

### Pantry Visual UX Redesign

#### New Visual System
- **2-Column Category Grid**: Large visual tiles (~160x160px) replace horizontal list
- **3-Column Item Grid**: Visual item tiles in category detail view
- **Category-Specific Colors**: Each category has unique gradient background
- **Filtered Emojis**: Warm tint overlay for luxury bohème aesthetic
- **Letter Badges**: Items display first 2 letters with category-colored background

#### New Components
- `components/pantry/CategoryTile.tsx` - Large gradient tiles with emoji icons
- `components/pantry/ItemTile.tsx` - Item grid tiles with letter badges
- `components/pantry/ItemBadge.tsx` - Category-colored letter badge
- `components/pantry/FilteredEmoji.tsx` - Emoji with opacity + warm gradient overlay
- `components/pantry/index.ts` - Barrel export for all pantry components
- `constants/categoryVisuals.ts` - Category colors, gradients, and emoji icons

#### Screen Redesigns
- **`app/(tabs)/pantry.tsx`**: Complete rewrite with 2-column category grid
- **`app/pantry/category/[id].tsx`**: Complete rewrite with 3-column item grid
- **`app/pantry/add.tsx`**: Category filtering support, improved layout

#### Category System Updates
- Categories reordered by purchase frequency (Dairy first, then Produce, Proteins, etc.)
- Each category has: `bg` color, `icon` color, `gradient` array, emoji icon
- Empty categories shown at 50% opacity with dashed border
- Visual consistency across all pantry screens

#### Common Items Catalog Overhaul
- **~200 items** ordered by US/Europe consumption frequency
- Based on Statista, USDA, McKinsey food consumption research
- Items sorted within categories by popularity (90% household coverage)
- Updated `lib/commonItemsSeed.ts` with research-backed data

#### Management Features
- **Three-dot menu on Pantry**: Clear All Items, Reset Product Database
- **Three-dot menu on Shopping**: Clear All Lists, Reset Product Database
- New store functions: `clearAll()`, `clearAllLists()`, `resetCommonItems()`
- Database functions: `clearAllPantryItems()`, `clearAllShoppingLists()`

#### UX Improvements
- **Haptic feedback** on all press interactions
- **Category filtering**: When adding from category detail, only show relevant items
- **Fixed category press**: Moved `active:opacity-70` from View to Pressable
- **Loading states**: Proper loading indicators when items are fetching

#### Technical Changes
- Added `expo-linear-gradient` for gradient backgrounds
- Added `expo-haptics` for touch feedback
- Use `--legacy-peer-deps` for npm installs (peer dependency conflicts)
- Proper NativeWind styling on Pressable components

### Bug Fixes
- Fixed category tiles not responding to press in add screen
- Fixed items not showing when modal opens (timing issue)
- Fixed active state not showing on category grid tiles

---

## [2.0.0] - 2026-01-25

### Major Features - Shopping List Redesign

#### Multi-List System
- **Multiple Shopping Lists**: Create and manage separate lists for different purposes
- **Custom Icons**: 16 elegant Lucide icons for list personalization
- **Templates**: Quick-start templates (Weekly Groceries, Breakfast, Lunch, Dinner, Party, Restock)
- **List Management**: Create, edit, delete, and organize multiple lists

#### Smart Item Management
- **Quick Add by Category**: Tap category buttons to browse common items
- **Common Items Catalog**: 182 pre-populated items across 12 categories
- **Search & Autocomplete**: Instant search with smart suggestions
- **Quantity Confirmation**: Review and adjust quantities before adding items
- **Category Grouping**: Items auto-organize by ingredient category

#### Enhanced UX
- **Confirmation Modals**: Review item details before adding
- **Long-Press Delete**: Easy list deletion from Shopping tab
- **Checked Items Visibility**: Items stay visible with strikethrough when checked
- **SafeAreaView Fixes**: Proper display on devices with notches

### Design System Overhaul

#### Icon System
- **List Icons**: 16 Lucide icons (cart, party, coffee, utensils, etc.)
- **Category Icons**: 12 custom icons for ingredient categories
- **NO EMOJIS**: Replaced all emojis with elegant stroke-based Lucide icons
- **Consistent Styling**: 1.5px stroke width, luxury bohème colors

#### Visual Refinements
- Honey/sage/stone color palette throughout
- Refined typography (Cormorant Garamond + Inter)
- Subtle shadows and rounded corners
- Background textures for depth
- Consistent spacing and padding

### Data & Architecture

#### Database Schema
- New `shopping_lists` table for multi-list support
- New `common_items` table with 182 pre-populated items
- Updated `shopping_items` with `list_id` foreign key
- Proper indexes for performance

#### State Management
- `shoppingListsStore`: Multi-list management + common items
- `shoppingStore`: Items management with category grouping
- Optimized queries and caching

#### Common Items Catalog (182 items)
- **Produce** (40): Vegetables, fruits
- **Proteins** (35): Poultry, beef, pork, seafood, plant-based
- **Dairy** (15): Milk, cheese, eggs, yogurt
- **Bakery** (10): Bread, bagels, tortillas
- **Pantry** (20): Rice, pasta, flour, oils
- **Spices** (15): Salt, pepper, herbs
- **Condiments** (12): Sauces, dressings
- **Beverages** (10): Coffee, tea, juice, wine
- **Snacks** (10): Chips, nuts, chocolate
- **Frozen** (10): Vegetables, ice cream
- **Household** (10): Cleaning supplies

### Bug Fixes
- Fixed SafeAreaView overlap on devices with notches
- Fixed checked items disappearing from view
- Fixed CategoryIcon fallback handling
- Fixed database seeding on first launch
- Fixed modal z-index issues

### Technical Improvements
- TypeScript strict mode compliance
- Better error handling throughout
- Optimized database queries
- Improved component reusability
- Enhanced type safety

### Documentation
- Comprehensive PROJECT_CONTEXT.md
- Quick reference guide
- Inline code documentation
- Database schema documentation

---

## [1.0.0] - 2026-01-20

### Initial Release
- Recipe management with AI generation
- Single shopping list
- Pantry inventory
- Basic UI with luxury bohème aesthetic
- SQLite database
- Zustand state management

---

## Migration Guide (1.0 → 2.0)

### Breaking Changes
1. **Shopping List Schema**: Old single-list data needs migration
2. **Icon Format**: Lists now use icon names instead of emojis
3. **Store Structure**: `shoppingListsStore` replaces old shopping logic

### Migration Steps
1. Delete app from simulator/device
2. Fresh install will create new schema
3. Common items auto-seed on first launch
4. Old data will not be preserved (fresh start recommended)

### New Features to Explore
1. Create multiple lists with templates
2. Use Quick Add for fast item entry
3. Search common items catalog
4. Customize lists with icons
5. Long-press to delete lists

---

## Migration Guide (2.0 → 2.1)

### Non-Breaking Changes
- New pantry visual system is additive
- Database schema unchanged
- Common items catalog expanded (re-seed recommended)

### Recommended Steps
1. Use "Reset Product Database" from three-dot menu
2. This will reload ~200 items ordered by consumption frequency
3. All existing pantry/shopping data preserved

### New Features to Explore
1. Browse pantry via visual category grid
2. Use three-dot menu for management options
3. Add items filtered by category
4. Enjoy haptic feedback on interactions

---

**Version Format**: [Major.Minor.Patch]
- **Major**: Breaking changes, major features
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes, minor improvements
