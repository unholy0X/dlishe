import { useState } from "react";
import { View, Text, Pressable, FlatList, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Leaf, Search, X, Trash2 } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { usePantryStore } from "@/store";
import type { PantryItem, IngredientCategory } from "@/types";

const CATEGORIES: { value: IngredientCategory; label: string }[] = [
  { value: 'produce', label: 'Produce' },
  { value: 'meat_seafood', label: 'Meat & Seafood' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'spices', label: 'Spices' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'other', label: 'Other' },
];

const QUICK_ADD_ITEMS = [
  { name: "Eggs", category: "dairy" as IngredientCategory },
  { name: "Milk", category: "dairy" as IngredientCategory },
  { name: "Butter", category: "dairy" as IngredientCategory },
  { name: "Onions", category: "produce" as IngredientCategory },
  { name: "Garlic", category: "produce" as IngredientCategory },
  { name: "Lemons", category: "produce" as IngredientCategory },
];

function PantryItemCard({ item, onDelete }: { item: PantryItem; onDelete: () => void }) {
  return (
    <View className="flex-row items-center bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mb-2">
      <View className="flex-1">
        <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontSize: 15, fontWeight: '500' }}>
          {item.name}
        </Text>
        <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>
          {item.category.replace('_', ' ')}
          {item.quantity && item.unit ? ` · ${item.quantity} ${item.unit}` : ''}
        </Text>
      </View>
      <Pressable onPress={onDelete} className="p-2 -mr-2">
        <Trash2 size={18} color={colors.text.muted} />
      </Pressable>
    </View>
  );
}

export default function PantryScreen() {
  const { items, addItem, deleteItem, isLoading } = usePantryStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<IngredientCategory>("other");

  const filteredItems = searchQuery
    ? items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    await addItem({
      name: newItemName.trim(),
      category: newItemCategory,
    });

    setNewItemName("");
    setNewItemCategory("other");
    setShowAddModal(false);
  };

  const handleQuickAdd = async (name: string, category: IngredientCategory) => {
    await addItem({ name, category });
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove Item", `Remove ${name} from pantry?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteItem(id) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between py-5 px-6">
          <View>
            <Text className="text-3xl mb-1" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '400' }}>
              My Pantry
            </Text>
            <Text className="text-sm" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>
              {items.length === 0 ? 'Your garden of ingredients' : `${items.length} ingredient${items.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
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

        {/* Search Bar */}
        <View className="flex-row items-center bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mb-4 mx-6">
          <Search size={20} color={colors.text.muted} />
          <TextInput
            className="flex-1 ml-3"
            placeholder="Search ingredients..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
          />
        </View>

        {items.length === 0 ? (
          /* Empty State */
          <View className="flex-1 items-center justify-center pb-24 px-6">
            <View className="w-24 h-24 bg-sage-50 rounded-full items-center justify-center mb-6 border-2" style={{ borderColor: colors.sage[100] }}>
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
              onPress={() => setShowAddModal(true)}
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
              <Text className="text-sm mb-4" style={{ color: colors.text.disabled, fontFamily: 'Inter' }}>Quick add</Text>
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
          /* Pantry List */
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PantryItemCard item={item} onDelete={() => handleDelete(item.id, item.name)} />
            )}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 15 }}>
                  No items found
                </Text>
              </View>
            }
            ListFooterComponent={
              <View className="mt-4 items-center">
                <Text className="text-sm mb-3" style={{ color: colors.text.disabled, fontFamily: 'Inter' }}>Quick add</Text>
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
            }
          />
        )}

        {/* Add Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10">
              <View className="flex-row items-center justify-between mb-6">
                <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500' }}>
                  Add Ingredient
                </Text>
                <Pressable onPress={() => setShowAddModal(false)} className="p-2 -mr-2">
                  <X size={24} color={colors.text.muted} />
                </Pressable>
              </View>

              <Text className="mb-2" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
                Ingredient Name
              </Text>
              <TextInput
                className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mb-5"
                placeholder="e.g., Tomatoes"
                placeholderTextColor={colors.text.muted}
                value={newItemName}
                onChangeText={setNewItemName}
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
                autoFocus
              />

              <Text className="mb-2" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
                Category
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setNewItemCategory(cat.value)}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: newItemCategory === cat.value ? colors.sage[200] : colors.stone[100],
                      borderWidth: 1,
                      borderColor: newItemCategory === cat.value ? colors.sage[200] : colors.stone[200],
                    }}
                  >
                    <Text
                      style={{
                        color: newItemCategory === cat.value ? 'white' : colors.text.secondary,
                        fontFamily: 'Inter',
                        fontSize: 13,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={handleAddItem}
                disabled={!newItemName.trim() || isLoading}
                className="py-4 rounded-xl items-center"
                style={{
                  backgroundColor: newItemName.trim() ? colors.sage[200] : colors.stone[200],
                }}
              >
                <Text style={{ color: newItemName.trim() ? 'white' : colors.text.muted, fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
                  Add to Pantry
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
