# DishFlow - Quick Reference

## Design System

### Colors
```typescript
// Primary Accent
colors.honey[400]  // #C19A6B

// Backgrounds
colors.stone[50]   // #F7F3EE (main bg)
colors.stone[100]  // #EDE7DF (cards)

// Text
colors.text.primary    // #2C2A26
colors.text.secondary  // #5A5753
colors.text.muted      // #A8A39A
```

### Category Colors
```typescript
import { getCategoryVisual } from '@/constants/categoryVisuals';

const visual = getCategoryVisual('proteins');
// Returns: { bg: '#A8845A', icon: 'white', gradient: ['#B8946A', '#98744A'] }
```

### Typography
```typescript
// Headers
fontFamily: 'Cormorant Garamond'
fontSize: 28-40

// Body
fontFamily: 'Inter'
fontSize: 13-16
```

### Icons
- **Stroke Width**: 1.5px
- **Library**: lucide-react-native
- **Emojis**: Use FilteredEmoji component (NOT raw emojis)

## Key Files

### Pantry (NEW in v2.1)
- `app/(tabs)/pantry.tsx` - 2-column category grid
- `app/pantry/add.tsx` - Add items (with category filter)
- `app/pantry/category/[id].tsx` - 3-column item grid
- `components/pantry/CategoryTile.tsx` - Large category tiles
- `components/pantry/ItemTile.tsx` - Item grid tiles
- `components/pantry/ItemBadge.tsx` - Letter badge component
- `components/pantry/FilteredEmoji.tsx` - Emoji with luxury filter
- `constants/categoryVisuals.ts` - Category colors/gradients

### Shopping Lists
- `app/(tabs)/shopping.tsx` - Multi-list home
- `app/shopping-lists.tsx` - All lists view
- `app/shopping-list/create.tsx` - Create with templates
- `app/shopping-list/[id].tsx` - List detail + Quick Add

### Components
- `components/ListIcon.tsx` - 16 list icons
- `components/CategoryIcon.tsx` - 12 category icons

### Data
- `lib/commonItemsSeed.ts` - ~200 item catalog
- `store/shoppingListsStore.ts` - Lists + common items + reset
- `store/shoppingStore.ts` - Items management
- `store/pantryStore.ts` - Pantry + clearAll

## Database

### Tables
```sql
shopping_lists (id, name, description, icon, is_template, is_archived, created_at, updated_at)
shopping_items (id, list_id, name, quantity, unit, category, is_checked, recipe_name, created_at)
common_items (id, name, category, default_quantity, default_unit, keywords, usage_count, sort_order)
pantry_items (id, name, category, quantity, unit, expiration_date, created_at)
```

### Categories (Ordered by Frequency)
```typescript
dairy, produce, proteins, bakery, pantry, beverages, condiments, spices, snacks, frozen, household, other
```

## Common Tasks

### Add New Pantry Component
1. Create in `components/pantry/`
2. Export from `components/pantry/index.ts`
3. Import: `import { Component } from '@/components/pantry'`

### Use Category Visuals
```typescript
import { getCategoryVisual, getCategoryIcon, CATEGORY_VISUALS } from '@/constants/categoryVisuals';

// Get visual config
const visual = getCategoryVisual('dairy');
// { bg: '#E8D4B8', icon: '#7D7A68', gradient: ['#F0DCC0', '#E0CCB0'] }

// Get emoji icon
const icon = getCategoryIcon('dairy'); // '🥛'
```

### Add Filtered Emoji
```tsx
import { FilteredEmoji } from '@/components/pantry';

<FilteredEmoji emoji="🥬" size={48} opacity={0.75} warmTint />
```

### Add Item Badge
```tsx
import { ItemBadge } from '@/components/pantry';

<ItemBadge name="Chicken Breast" category="proteins" size={44} />
// Shows "Ch" on proteins color background
```

### Add Category Tile
```tsx
import { CategoryTile } from '@/components/pantry';

<CategoryTile
  category="proteins"
  label="Proteins"
  count={5}
  onPress={() => handleCategoryPress('proteins')}
  isEmpty={false}
/>
```

### Add Haptic Feedback
```typescript
import * as Haptics from 'expo-haptics';

// Light tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Success notification
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Warning (for destructive actions)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
```

### Add New List Icon
1. Import from lucide-react-native
2. Add to `ICON_MAP` in `ListIcon.tsx`
3. Add to `AVAILABLE_ICONS` array
4. Add type to `IconName` union

### Add Category Items
1. Edit `lib/commonItemsSeed.ts`
2. Add items with proper category
3. Use "Reset Product Database" from menu OR delete app and restart

### Update Colors
1. Edit `constants/colors.ts`
2. Update all references
3. Test on light/dark backgrounds

### Fix SafeAreaView Issues
```tsx
<SafeAreaView edges={["top", "bottom"]}>
```

## Zustand Store Patterns

### Pantry Store
```typescript
const { items, loadItems, addItem, deleteItem, clearAll, getCategoryCounts } = usePantryStore();

// Get category counts for grid
const counts = getCategoryCounts();
// { dairy: 3, produce: 5, proteins: 2, ... }

// Clear all pantry items
await clearAll();
```

### Shopping Lists Store
```typescript
const { lists, loadLists, createList, deleteList, clearAllLists, resetCommonItems } = useShoppingListsStore();

// Clear all shopping lists
await clearAllLists();

// Reset common items to default
await resetCommonItems();
```

### Get Items
```typescript
const { lists, loadLists } = useShoppingListsStore();
const { items, getItemsByList } = useShoppingStore();
```

### Add Item
```typescript
await addItem({
  listId: id,
  name: 'Item Name',
  category: 'produce',
  quantity: 1,
  unit: 'kg',
  isChecked: false,
});
```

### Search Common Items
```typescript
const results = await searchCommonItems('chicken');
```

## UI Patterns

### Card Style
```tsx
className="bg-stone-100 border border-stone-200 rounded-2xl p-5"
style={{
  shadowColor: colors.text.primary,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
}}
```

### Button Style (Primary)
```tsx
className="py-4 rounded-2xl items-center"
style={{
  backgroundColor: colors.honey[400],
  shadowColor: colors.honey[400],
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
}}
```

### Pressable with Active State
```tsx
// CORRECT: active: on Pressable
<Pressable className="rounded-2xl p-4 active:opacity-70">
  <View>Content</View>
</Pressable>

// WRONG: active: on inner View (won't work!)
<Pressable className="rounded-2xl p-4">
  <View className="active:opacity-70">Content</View>
</Pressable>
```

### Modal
```tsx
<Modal visible={show} animationType="slide" transparent>
  <View style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
    <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10">
      {/* Content */}
    </View>
  </View>
</Modal>
```

### Three-Dot Menu Modal
```tsx
<Modal visible={showMenu} animationType="fade" transparent>
  <Pressable
    className="flex-1"
    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    onPress={() => setShowMenu(false)}
  >
    <View className="absolute top-28 right-6">
      <View className="bg-white rounded-2xl overflow-hidden" style={{ minWidth: 200 }}>
        <Pressable className="flex-row items-center px-5 py-4 active:bg-stone-50">
          <Icon size={20} color={colors.text.secondary} />
          <Text style={{ marginLeft: 12 }}>Menu Item</Text>
        </Pressable>
      </View>
    </View>
  </Pressable>
</Modal>
```

### Gradient Background (Category Tiles)
```tsx
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={visual.gradient}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={{ borderRadius: 24, padding: 16 }}
>
  {/* Content */}
</LinearGradient>
```

## Git Workflow

### Commit Messages
```bash
git add .
git commit -m "feat: add multi-list shopping system"
git commit -m "fix: SafeAreaView notch compatibility"
git commit -m "style: replace emojis with Lucide icons"
git commit -m "docs: update project context"
```

### Push
```bash
git push origin main
```

## Common Issues

### Icons Not Showing
- Check import from lucide-react-native
- Verify icon exists in library
- Add fallback to ShoppingCart

### Database Not Seeding
- Delete app from simulator
- Restart with `--clear` flag
- Check console for "Seeded X common items"

### SafeAreaView Overlap
- Add `edges={["top", "bottom"]}`
- Test on device with notch

### Checked Items Disappearing
- Remove `&& !item.isChecked` filter
- Keep items visible with strikethrough

### Category Press Not Working
- Ensure `active:opacity-70` is on Pressable, NOT inner View
- Add haptic feedback to confirm press
- Check modal visible condition

### Peer Dependency Conflicts
```bash
npm install <package> --legacy-peer-deps
```

### Items Not Loading in Modal
- Add `itemsLoaded` state
- Show loading indicator while fetching
- Wait for `loadCommonItems()` to complete

## Testing Checklist

### Pantry
- [ ] Category grid displays all 12 categories
- [ ] Empty categories show at 50% opacity
- [ ] Tap category navigates to detail view
- [ ] 3-column item grid in category detail
- [ ] Long-press item to delete
- [ ] Add button filters by current category
- [ ] Three-dot menu works (Clear All, Reset)
- [ ] Haptic feedback on interactions

### Shopping
- [ ] Create new list with template
- [ ] Add items via Quick Add
- [ ] Confirm/adjust quantities
- [ ] Check items (stay visible)
- [ ] Long-press delete list
- [ ] Search common items
- [ ] Three-dot menu works

### General
- [ ] Test on device with notch
- [ ] Verify all category icons
- [ ] Test list icons display
- [ ] Check gradient backgrounds
- [ ] Verify filtered emoji overlay

---

**Quick Links:**
- [Full Documentation](./PROJECT_CONTEXT.md)
- [Changelog](./CHANGELOG.md)
- [Expo Docs](https://docs.expo.dev/)
- [Lucide Icons](https://lucide.dev/)
