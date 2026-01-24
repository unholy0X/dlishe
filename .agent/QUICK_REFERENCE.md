# DishFlow - Quick Reference Guide

> **For AI Assistants & Future Sessions**  
> Last Updated: 2026-01-24

---

## 🎯 What is DishFlow?

A luxury bohème React Native app for managing recipes, pantry, and shopping lists with AI-powered recipe extraction from YouTube, Instagram, TikTok, and websites.

---

## 🏗️ Tech Stack (Quick)

- **Framework**: React Native 0.81.5 + Expo 54
- **Routing**: Expo Router (file-based)
- **Styling**: NativeWind (Tailwind for RN)
- **State**: Zustand (3 stores: recipe, pantry, shopping)
- **Database**: Expo SQLite (local-first)
- **AI**: Google Gemini 2.0 Flash
- **Language**: TypeScript 5.9.2

---

## 📁 Key Files

```
dishflow/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation
│   │   ├── index.tsx       # Home screen
│   │   ├── recipes.tsx     # Recipe list
│   │   ├── pantry.tsx      # Pantry inventory
│   │   └── shopping.tsx    # Shopping list
│   └── recipe/
│       ├── [id].tsx        # Recipe detail
│       └── add.tsx         # Add recipe modal
├── lib/
│   ├── database.ts         # SQLite operations
│   ├── gemini.ts           # AI client
│   └── recipeExtractor.ts  # Recipe extraction logic
├── store/
│   ├── recipeStore.ts      # Recipe state
│   ├── pantryStore.ts      # Pantry state
│   └── shoppingStore.ts    # Shopping state
├── constants/
│   ├── colors.ts           # Luxury bohème palette
│   ├── typography.ts       # Font system
│   └── categories.ts       # Ingredient categories
└── types/index.ts          # All TypeScript types
```

---

## 🎨 Design System (Quick)

### Colors
- **Stone**: `#F7F3EE` to `#B0A596` (warm beige/cream)
- **Honey**: `#FFF9F0` to `#C19A6B` (golden warmth)
- **Sage**: `#E8E7E2` to `#7D7A68` (muted olive)
- **Text**: `#2B2822` to `#ADA396` (warm browns)

### Typography
- **Headers**: Cormorant Garamond (elegant serif)
- **Body**: Inter (clean sans-serif)
- **Sizes**: 12px to 40px (hero)

### Spacing
- Base: 4px grid
- Common: 8, 16, 24, 32px
- Generous padding: 24px minimum

### Border Radius
- Cards: 16-24px
- Buttons: 12-16px
- Circles: 9999px

---

## 🗄️ Database Schema (Quick)

### Main Tables
1. **recipes**: id, title, description, source_url, source_type, ingredients[], instructions[], tags[], is_favorite, cooked_count
2. **ingredients**: id, recipe_id, name, amount, unit, category, is_optional
3. **instructions**: id, recipe_id, step_number, text, duration
4. **pantry_items**: id, name, category, quantity, unit, expires_at
5. **shopping_items**: id, name, category, quantity, is_checked, recipe_id

### Key Relationships
- `ingredients` → `recipes` (CASCADE DELETE)
- `instructions` → `recipes` (CASCADE DELETE)
- `shopping_items` → `recipes` (SET NULL on delete)

---

## 🤖 AI Recipe Extraction

### Supported
- ✅ YouTube (direct URL)
- ✅ Websites (recipe blogs)
- ⚠️ TikTok (manual paste)
- ⚠️ Instagram (manual paste)

### Flow
1. User pastes URL
2. Detect type (YouTube/website/social)
3. Send to Gemini AI with schema
4. Parse JSON response
5. Convert to Recipe format
6. Save to SQLite
7. Update Zustand store

### Model
```typescript
model: "gemini-2.0-flash"
responseMimeType: "application/json"
```

---

## 📦 State Management

### Zustand Stores

```typescript
// Recipe Store
useRecipeStore((state) => ({
  recipes: Recipe[],
  loadRecipes: () => Promise<void>,
  addRecipe: (recipe) => Promise<Recipe>,
  deleteRecipe: (id) => Promise<void>,
  toggleFavorite: (id) => Promise<void>,
}))

// Pantry Store
usePantryStore((state) => ({
  items: PantryItem[],
  loadItems: () => Promise<void>,
  addItem: (item) => Promise<PantryItem>,
  deleteItem: (id) => Promise<void>,
}))

// Shopping Store
useShoppingStore((state) => ({
  items: ShoppingItem[],
  loadItems: () => Promise<void>,
  toggleItem: (id) => Promise<void>,
  clearChecked: () => Promise<void>,
}))
```

---

## 🚀 Common Commands

```bash
# Install
npm install

# Run
npm start          # Start dev server
npm run ios        # iOS simulator
npm run android    # Android emulator

# Clear cache
npx expo start --clear

# Git
git add -A
git commit -m "message"
git push origin master
```

---

## 🔧 Environment Setup

```bash
# .env
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

Get key: https://aistudio.google.com/apikey

---

## 🎯 Key Features

1. **Recipe Management**: Add from URL, manual entry, favorites, cooking tracker
2. **Pantry Inventory**: Category organization, expiration tracking, quantity management
3. **Shopping Lists**: Recipe integration, smart deduplication, category grouping
4. **AI Extraction**: Gemini-powered recipe parsing from URLs and text

---

## 🐛 Common Issues

### Background images not showing
```tsx
// ❌ Wrong
source={require('@/assets/backgrounds/boheme01.png')}
className="rounded-xl"

// ✅ Correct
source={require('../../assets/backgrounds/boheme01.png')}
style={{ borderRadius: 20 }}
resizeMode="cover"
```

### Database not initializing
- Delete app and reinstall
- Check `lib/database.ts` for errors

### Gemini API errors
- Verify API key in `.env`
- Check quota limits
- Ensure internet connection

---

## 📝 Code Patterns

### Adding a new screen
1. Create file in `app/` directory
2. Export default component
3. Add to navigation if needed
4. Use NativeWind for styling

### Database operation
```typescript
// 1. Define in lib/database.ts
export async function createItem(item) {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO...');
}

// 2. Add to store
addItem: async (item) => {
  const newItem = await db.createItem(item);
  set((state) => ({ items: [...state.items, newItem] }));
}

// 3. Use in component
const addItem = useStore((state) => state.addItem);
await addItem(newItem);
```

### Styling pattern
```tsx
// Use NativeWind classes for layout
<View className="px-6 py-4 bg-stone-50">
  {/* Use inline styles for design system values */}
  <Text style={{ 
    color: colors.text.primary, 
    fontFamily: 'Cormorant Garamond',
    fontSize: 32 
  }}>
    Title
  </Text>
</View>
```

---

## 🎨 Design Principles

1. **Warmth**: Golden undertones in all colors
2. **Breathing Space**: Generous padding (24px+)
3. **Soft Edges**: 16-24px border radius
4. **Elegant Typography**: Cormorant Garamond for headers
5. **Subtle Textures**: Background images at 6-15% opacity

---

## 📚 Important Files to Know

- `app/_layout.tsx`: Root navigation setup
- `lib/database.ts`: All SQLite operations
- `lib/recipeExtractor.ts`: AI extraction logic
- `constants/colors.ts`: Design system colors
- `types/index.ts`: All TypeScript types
- `.env`: API keys (not in git)

---

## 🔗 Links

- **Repo**: https://github.com/unholy0X/dishflow.git
- **Full Docs**: `.agent/PROJECT_CONTEXT.md`
- **Design Plan**: `.gemini/antigravity/brain/.../design_plan.md`
- **Walkthrough**: `.gemini/antigravity/brain/.../walkthrough.md`

---

**For detailed architecture, see PROJECT_CONTEXT.md**
