# DishFlow - Project Context

## Overview
DishFlow is a luxury bohème recipe and meal planning app built with React Native (Expo), featuring a sophisticated shopping list system with multi-list support, smart categorization, and elegant UI design.

## Tech Stack
- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Database**: SQLite (expo-sqlite)
- **State Management**: Zustand
- **Styling**: NativeWind (Tailwind CSS)
- **Icons**: Lucide React Native
- **Fonts**: Cormorant Garamond, Inter
- **AI**: Google Gemini API

## Design Philosophy
**Luxury Bohème Aesthetic**
- Warm, earthy color palette (honey, sage, stone)
- Elegant typography (Cormorant Garamond for headers, Inter for body)
- Refined stroke-based icons (1.5px width)
- Subtle shadows and rounded corners
- Background textures for depth
- NO emojis or "AI slop" aesthetics

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

## Architecture

### Database Schema
**Tables:**
1. `recipes` - Recipe metadata and instructions
2. `ingredients` - Recipe ingredients with quantities
3. `shopping_lists` - Multiple shopping lists support
4. `shopping_items` - Items within lists
5. `common_items` - Pre-populated catalog (182 items)
6. `pantry_items` - User's pantry inventory

### State Management (Zustand)
- `recipeStore` - Recipe CRUD, AI generation
- `shoppingListsStore` - Multi-list management, common items
- `shoppingStore` - Shopping items, category grouping
- `pantryStore` - Pantry inventory

### Key Features

#### 1. Multi-List Shopping System
- Create multiple shopping lists (Weekly, Breakfast, Lunch, Dinner, etc.)
- Custom icons (16 Lucide icons available)
- Templates for quick list creation
- List-specific item management

#### 2. Smart Item Management
- **Quick Add**: Category-based quick selection
- **Common Items Catalog**: 182 pre-populated items across 12 categories
- **Search & Autocomplete**: Instant search with suggestions
- **Quantity Confirmation**: Review/adjust quantities before adding
- **Category Grouping**: Auto-organize by ingredient category

#### 3. Icon System
**List Icons** (16 available):
- cart, party, package, utensils, salad, coffee, wine, cake, pizza, soup, sandwich, apple, icecream, heart, star, home

**Category Icons** (12 categories):
- Produce → Leaf
- Proteins → Beef
- Dairy → Milk
- Bakery → Croissant
- Pantry → Package
- Spices → Flame
- Condiments → Droplet
- Beverages → Coffee
- Snacks → Popcorn
- Frozen → Snowflake
- Household → Home
- Other → ShoppingCart

#### 4. Common Items Catalog (182 items)
- **Produce**: 40 items (vegetables + fruits)
- **Proteins**: 35 items (poultry, beef, pork, seafood, plant-based)
- **Dairy**: 15 items (milk, cheese, eggs, yogurt)
- **Bakery**: 10 items (bread, bagels, tortillas)
- **Pantry**: 20 items (rice, pasta, flour, oils, canned goods)
- **Spices**: 15 items (salt, pepper, herbs)
- **Condiments**: 12 items (sauces, dressings, vinegars)
- **Beverages**: 10 items (coffee, tea, juice, wine)
- **Snacks**: 10 items (chips, nuts, chocolate)
- **Frozen**: 10 items (vegetables, ice cream, pizza)
- **Household**: 10 items (cleaning supplies, paper goods)

## File Structure
```
dishflow/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Home/Recipes
│   │   ├── shopping.tsx       # Shopping Lists (multi-list)
│   │   └── pantry.tsx         # Pantry
│   ├── shopping-list/
│   │   ├── [id].tsx           # List Detail (with Quick Add)
│   │   └── create.tsx         # Create List (with templates)
│   └── shopping-lists.tsx     # All Lists View
├── components/
│   ├── ListIcon.tsx           # List icon component
│   └── CategoryIcon.tsx       # Category icon component
├── store/
│   ├── recipeStore.ts
│   ├── shoppingListsStore.ts  # Multi-list + common items
│   ├── shoppingStore.ts       # Items management
│   └── pantryStore.ts
├── lib/
│   ├── db.ts                  # SQLite operations
│   └── commonItemsSeed.ts     # 182 item catalog
└── constants/
    └── colors.ts              # Luxury bohème palette
```

## Recent Major Changes

### Shopping List Redesign (Complete)
✅ Multi-list support with custom icons
✅ Quick Add by category
✅ Common items catalog (182 items)
✅ Search & autocomplete
✅ Quantity confirmation modal
✅ Category-based organization
✅ Lucide icon system (no emojis)
✅ Meal templates (Breakfast, Lunch, Dinner)
✅ Long-press delete in Shopping tab
✅ Checked items stay visible with strikethrough

### UI/UX Improvements
✅ SafeAreaView fixes for notch compatibility
✅ Elegant Lucide icons throughout
✅ Confirmation modals for better UX
✅ Consistent luxury bohème styling
✅ Background textures and shadows

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
```

## Database Seeding
Common items are automatically seeded on first app launch. To re-seed:
1. Delete the app from simulator
2. Restart with `--clear` flag
3. Database will be recreated with all 182 items

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

### User Flows
1. **Create List**: Templates → Customize → Create
2. **Add Items**: Quick Add (category) → Confirm → Add
3. **Shopping**: Check items → Stay visible → Clear when done
4. **Delete**: Long-press → Confirm → Delete

## Known Issues & Limitations
- None currently! All major features implemented and working.

## Future Enhancements
- Recipe-to-list integration (add recipe ingredients to shopping list)
- Pantry integration (auto-remove pantry items from lists)
- Smart suggestions based on usage patterns
- Shared lists (multi-user support)
- Barcode scanning for items
- Store aisle mapping

## Testing Notes
- Test on both iOS and Android
- Verify SafeAreaView on devices with notches
- Test long-press gestures
- Verify database seeding on fresh install
- Check icon rendering across all categories

---

**Last Updated**: 2026-01-25
**Version**: 2.0 (Shopping List Redesign Complete)
