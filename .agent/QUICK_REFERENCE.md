# DishFlow - Quick Reference

## 🎨 Design System

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
- **NO EMOJIS** - Use Lucide icons only

## 📁 Key Files

### Shopping Lists
- `app/(tabs)/shopping.tsx` - Multi-list home
- `app/shopping-lists.tsx` - All lists view
- `app/shopping-list/create.tsx` - Create with templates
- `app/shopping-list/[id].tsx` - List detail + Quick Add

### Components
- `components/ListIcon.tsx` - 16 list icons
- `components/CategoryIcon.tsx` - 12 category icons

### Data
- `lib/commonItemsSeed.ts` - 182 item catalog
- `store/shoppingListsStore.ts` - Lists + common items
- `store/shoppingStore.ts` - Items management

## 🗄️ Database

### Tables
```sql
shopping_lists (id, name, description, icon, is_template, is_archived, created_at, updated_at)
shopping_items (id, list_id, name, quantity, unit, category, is_checked, recipe_name, created_at)
common_items (id, name, category, default_quantity, default_unit, keywords, usage_count, sort_order)
```

### Categories
produce, proteins, dairy, bakery, pantry, spices, condiments, beverages, snacks, frozen, household, other

## 🎯 Common Tasks

### Add New List Icon
1. Import from lucide-react-native
2. Add to `ICON_MAP` in `ListIcon.tsx`
3. Add to `AVAILABLE_ICONS` array
4. Add type to `IconName` union

### Add Category Items
1. Edit `lib/commonItemsSeed.ts`
2. Add items with proper category
3. Delete app and restart to re-seed

### Update Colors
1. Edit `constants/colors.ts`
2. Update all references
3. Test on light/dark backgrounds

### Fix SafeAreaView Issues
```tsx
<SafeAreaView edges={["top", "bottom"]}>
```

## � Zustand Store Patterns

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

## 🎨 UI Patterns

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

### Button Style
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

## 🚀 Git Workflow

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

## 🐛 Common Issues

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

## 📱 Testing Checklist

- [ ] Create new list with template
- [ ] Add items via Quick Add
- [ ] Confirm/adjust quantities
- [ ] Check items (stay visible)
- [ ] Long-press delete list
- [ ] Search common items
- [ ] Test on device with notch
- [ ] Verify all category icons
- [ ] Test list icons display

---

**Quick Links:**
- [Full Documentation](./PROJECT_CONTEXT.md)
- [Expo Docs](https://docs.expo.dev/)
- [Lucide Icons](https://lucide.dev/)
