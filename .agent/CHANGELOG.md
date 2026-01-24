# DishFlow Changelog

## [2.0.0] - 2026-01-25

### 🎉 Major Features - Shopping List Redesign

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

### 🎨 Design System Overhaul

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

### 📊 Data & Architecture

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

### 🐛 Bug Fixes
- Fixed SafeAreaView overlap on devices with notches
- Fixed checked items disappearing from view
- Fixed CategoryIcon fallback handling
- Fixed database seeding on first launch
- Fixed modal z-index issues

### 🔧 Technical Improvements
- TypeScript strict mode compliance
- Better error handling throughout
- Optimized database queries
- Improved component reusability
- Enhanced type safety

### 📝 Documentation
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

**Version Format**: [Major.Minor.Patch]
- **Major**: Breaking changes, major features
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes, minor improvements
