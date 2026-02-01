import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Leaf, Search, ShoppingCart, Camera, MoreVertical, Trash2, RefreshCw } from "lucide-react-native";
import { useRouter } from "expo-router";
import { colors } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { CategoryTile } from "@/components/pantry";
import { ItemBadge } from "@/components/pantry";
import { usePantryStore, useShoppingListsStore } from "@/store";
import type { IngredientCategory } from "@/types";
import * as Haptics from "expo-haptics";

// Quick add items - common staples
const QUICK_ADD_ITEMS = [
  { name: "Eggs", category: "dairy" as IngredientCategory },
  { name: "Milk", category: "dairy" as IngredientCategory },
  { name: "Butter", category: "dairy" as IngredientCategory },
  { name: "Onions", category: "produce" as IngredientCategory },
  { name: "Garlic", category: "produce" as IngredientCategory },
  { name: "Lemons", category: "produce" as IngredientCategory },
];

export default function PantryScreen() {
  const router = useRouter();
  const { items, loadItems, addItem, deleteItem, clearAll, getCategoryCounts } = usePantryStore();
  const { resetCommonItems } = useShoppingListsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const categoryCounts = getCategoryCounts();
  const totalItems = items.length;

  const filteredItems = searchQuery
    ? items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  const handleQuickAdd = async (name: string, category: IngredientCategory) => {
    await addItem({ name, category });
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove Item", `Remove ${name} from pantry?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteItem(id) },
    ]);
  };

  const handleAddPress = () => {
    router.push('/pantry/add');
  };

  const handleCategoryPress = (categoryValue: IngredientCategory) => {
    router.push(`/pantry/category/${categoryValue}`);
  };

  const handleClearAll = () => {
    setShowMenu(false);
    Alert.alert(
      "Clear Pantry",
      "This will remove all items from your pantry. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAll();
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    setShowMenu(false);
    Alert.alert(
      "Reset Product Database",
      "This will reset the product catalog to default items. Your pantry items will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await resetCommonItems();
            Alert.alert("Done", "Product database has been reset.");
          },
        },
      ]
    );
  };

  // Render category grid - 2 columns
  const renderCategoryGrid = () => {
    const rows = [];
    for (let i = 0; i < CATEGORIES.length; i += 2) {
      const firstCategory = CATEGORIES[i];
      const secondCategory = CATEGORIES[i + 1];

      rows.push(
        <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <CategoryTile
            category={firstCategory.value}
            label={firstCategory.label}
            count={categoryCounts[firstCategory.value] || 0}
            onPress={() => handleCategoryPress(firstCategory.value)}
            isEmpty={(categoryCounts[firstCategory.value] || 0) === 0}
          />
          {secondCategory && (
            <CategoryTile
              category={secondCategory.value}
              label={secondCategory.label}
              count={categoryCounts[secondCategory.value] || 0}
              onPress={() => handleCategoryPress(secondCategory.value)}
              isEmpty={(categoryCounts[secondCategory.value] || 0) === 0}
            />
          )}
        </View>
      );
    }
    return rows;
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between py-5 px-6">
          <View>
            <Text className="text-3xl mb-1" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '400' }}>
              My Pantry
            </Text>
            <Text className="text-sm" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>
              {totalItems === 0 ? 'Your garden of ingredients' : `${totalItems} ingredient${totalItems !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => setSearchQuery(prev => prev ? '' : ' ')}
              className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
              style={{
                backgroundColor: colors.stone[100],
                borderWidth: 1,
                borderColor: colors.stone[200],
              }}
            >
              <Search size={20} color={colors.text.secondary} strokeWidth={1.5} />
            </Pressable>
            <Pressable
              onPress={() => setShowMenu(true)}
              className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
              style={{
                backgroundColor: colors.stone[100],
                borderWidth: 1,
                borderColor: colors.stone[200],
              }}
            >
              <MoreVertical size={20} color={colors.text.secondary} strokeWidth={1.5} />
            </Pressable>
            <Pressable
              onPress={handleAddPress}
              className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
              style={{
                backgroundColor: colors.sage[200],
                shadowColor: colors.sage[200],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              <Plus size={20} color="white" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Search Bar - expandable */}
        {searchQuery !== "" && (
          <View className="mx-6 mb-4">
            <View className="flex-row items-center bg-stone-100 border border-stone-200 rounded-xl px-4 py-3">
              <Search size={20} color={colors.text.muted} strokeWidth={1.5} />
              <TextInput
                className="flex-1 ml-3"
                placeholder="Search ingredients..."
                placeholderTextColor={colors.text.muted}
                value={searchQuery.trim()}
                onChangeText={setSearchQuery}
                autoFocus
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
              />
              <Pressable onPress={() => setSearchQuery("")} className="p-1">
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 14 }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Search Results */}
        {searchQuery.trim() !== "" ? (
          <View className="px-6 pb-6">
            {filteredItems.length === 0 ? (
              <View className="items-center py-12">
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 15 }}>
                  No items found
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <Pressable
                  key={item.id}
                  onLongPress={() => handleDelete(item.id, item.name)}
                  className="flex-row items-center bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mb-2 active:opacity-80"
                  style={{
                    shadowColor: colors.text.primary,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                  }}
                >
                  <ItemBadge name={item.name} category={item.category} size={36} />
                  <View className="flex-1 ml-3">
                    <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontSize: 15, fontWeight: '500' }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 12, marginTop: 2 }}>
                      {CATEGORIES.find(c => c.value === item.category)?.label ?? 'Other'}
                      {item.quantity && item.unit ? ` · ${item.quantity} ${item.unit}` : ''}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : totalItems === 0 ? (
          /* Empty State */
          <View className="flex-1 items-center justify-center pb-24 px-6 pt-8">
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: colors.stone[100], borderWidth: 2, borderColor: colors.stone[200] }}
            >
              <Leaf size={40} color={colors.sage[200]} strokeWidth={1.5} />
            </View>

            <Text className="text-2xl text-center mb-3" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '400' }}>
              A Peaceful Pantry
            </Text>
            <Text className="text-center mb-8 px-8" style={{ color: colors.text.tertiary, fontFamily: 'Inter', fontSize: 15, lineHeight: 24 }}>
              Add ingredients you have at home{"\n"}
              to discover what you can create
            </Text>

            <Pressable
              onPress={handleAddPress}
              className="px-8 py-4 rounded-xl flex-row items-center active:opacity-90"
              style={{
                backgroundColor: colors.sage[200],
                shadowColor: colors.sage[200],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
              }}
            >
              <Plus size={20} color="white" strokeWidth={2} />
              <Text className="text-white text-base ml-2" style={{ fontFamily: 'Inter', fontWeight: '600' }}>
                Add Ingredients
              </Text>
            </Pressable>

            {/* Quick Add */}
            <View className="mt-10 items-center">
              <Text className="text-sm mb-4" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>Quick add</Text>
              <View className="flex-row flex-wrap justify-center gap-2 px-8">
                {QUICK_ADD_ITEMS.map((item) => (
                  <Pressable
                    key={item.name}
                    onPress={() => handleQuickAdd(item.name, item.category)}
                    className="bg-stone-100 border border-stone-200 px-4 py-2 rounded-full active:opacity-80"
                  >
                    <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 13 }}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : (
          /* Category Grid View */
          <View className="px-6 pb-6">
            {/* Quick Actions */}
            <View className="flex-row mb-6 gap-3">
              <Pressable
                onPress={() => router.push('/pantry/restock')}
                className="flex-1 flex-row items-center justify-center rounded-xl px-4 py-3.5 active:opacity-80"
                style={{ backgroundColor: colors.honey[50], borderWidth: 1, borderColor: colors.honey[100] }}
              >
                <ShoppingCart size={18} color={colors.honey[400]} strokeWidth={1.5} />
                <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontSize: 14, fontWeight: '500', marginLeft: 8 }}>
                  Shop
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/pantry/scan')}
                className="flex-1 flex-row items-center justify-center bg-stone-100 border border-stone-200 rounded-xl px-4 py-3.5 active:opacity-80"
              >
                <Camera size={18} color={colors.sage[200]} strokeWidth={1.5} />
                <Text style={{ color: colors.sage[200], fontFamily: 'Inter', fontSize: 14, fontWeight: '500', marginLeft: 8 }}>
                  Scan
                </Text>
              </Pressable>
            </View>

            {/* Category Grid */}
            {renderCategoryGrid()}

            {/* Quick Add Footer */}
            <View className="mt-4 items-center">
              <Text className="text-sm mb-3" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>Quick add</Text>
              <View className="flex-row flex-wrap justify-center gap-2">
                {QUICK_ADD_ITEMS.map((item) => (
                  <Pressable
                    key={item.name}
                    onPress={() => handleQuickAdd(item.name, item.category)}
                    className="bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-full active:opacity-80"
                  >
                    <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 12 }}>+ {item.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Three-dot Menu Modal */}
      <Modal visible={showMenu} animationType="fade" transparent>
        <Pressable
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowMenu(false)}
        >
          <View className="absolute top-28 right-6">
            <View
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                minWidth: 200,
              }}
            >
              <Pressable
                onPress={handleClearAll}
                className="flex-row items-center px-5 py-4 active:bg-stone-50"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.stone[200] }}
              >
                <Trash2 size={20} color={colors.text.secondary} strokeWidth={1.5} />
                <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.primary, marginLeft: 12 }}>
                  Clear All Items
                </Text>
              </Pressable>
              <Pressable
                onPress={handleResetData}
                className="flex-row items-center px-5 py-4 active:bg-stone-50"
              >
                <RefreshCw size={20} color={colors.text.secondary} strokeWidth={1.5} />
                <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.primary, marginLeft: 12 }}>
                  Reset Product Database
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
