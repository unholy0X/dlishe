import { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Check, ShoppingCart, Package, ChevronDown } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ListIcon, type IconName, DEFAULT_ICON } from "@/components/ListIcon";
import { usePantryStore, useShoppingListsStore, useShoppingStore } from "@/store";
import type { PantryItem, ShoppingList } from "@/types";

interface RestockItem extends PantryItem {
  suggestedQuantity: number;
  isSelected: boolean;
}

function RestockItemCard({
  item,
  onToggle,
}: {
  item: RestockItem;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 mb-3 active:opacity-80"
      style={{ opacity: item.isSelected ? 1 : 0.6 }}
    >
      <View className="flex-row items-center">
        {/* Checkbox */}
        <View
          className="w-6 h-6 rounded-lg items-center justify-center mr-3"
          style={{
            backgroundColor: item.isSelected ? colors.sage[200] : 'transparent',
            borderWidth: item.isSelected ? 0 : 2,
            borderColor: colors.stone[300],
          }}
        >
          {item.isSelected && <Check size={14} color="white" strokeWidth={3} />}
        </View>

        {/* Item Info */}
        <View className="flex-1">
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '500', color: colors.text.primary }}>
            {item.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <CategoryIcon category={item.category} size={14} color={colors.text.muted} strokeWidth={1.5} />
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.muted, marginLeft: 6 }}>
              {CATEGORIES.find(c => c.value === item.category)?.label}
            </Text>
          </View>
        </View>

        {/* Suggested Quantity */}
        <View className="items-end">
          <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.honey[400] }}>
            +{item.suggestedQuantity} {item.unit || 'pcs'}
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
            suggested
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PantryRestockScreen() {
  const { items: pantryItems, loadItems: loadPantryItems } = usePantryStore();
  const { lists, loadLists } = useShoppingListsStore();
  const { addItem: addToShopping } = useShoppingStore();

  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);

  useEffect(() => {
    loadPantryItems();
    loadLists();
  }, []);

  useEffect(() => {
    // Generate restock suggestions from pantry items
    // For now, suggest restocking all pantry items with their current quantity
    const suggestions = pantryItems.map(item => ({
      ...item,
      suggestedQuantity: item.quantity || 1,
      isSelected: true,
    }));
    setRestockItems(suggestions);
  }, [pantryItems]);

  useEffect(() => {
    // Set first list as default
    if (lists.length > 0 && !selectedList) {
      setSelectedList(lists[0]);
    }
  }, [lists]);

  const handleToggleItem = (itemId: string) => {
    setRestockItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, isSelected: !item.isSelected } : item
    ));
  };

  const handleSelectAll = () => {
    const allSelected = restockItems.every(item => item.isSelected);
    setRestockItems(prev => prev.map(item => ({ ...item, isSelected: !allSelected })));
  };

  const handleAddToList = async () => {
    if (!selectedList) {
      Alert.alert("No List Selected", "Please select a shopping list first.");
      return;
    }

    const selectedItems = restockItems.filter(item => item.isSelected);
    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select at least one item to add.");
      return;
    }

    try {
      for (const item of selectedItems) {
        await addToShopping({
          listId: selectedList.id,
          name: item.name,
          category: item.category,
          quantity: item.suggestedQuantity,
          unit: item.unit,
          isChecked: false,
        });
      }

      Alert.alert(
        "Added to List!",
        `${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} added to ${selectedList.name}`,
        [
          { text: "View List", onPress: () => router.push(`/shopping-list/${selectedList.id}`) },
          { text: "Done", onPress: () => router.back() },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add items to shopping list.");
    }
  };

  const selectedCount = restockItems.filter(item => item.isSelected).length;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b" style={{ borderBottomColor: colors.stone[200] }}>
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color={colors.text.primary} strokeWidth={1.5} />
        </Pressable>
        <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: '500', color: colors.text.primary }}>
          Restock Pantry
        </Text>
        <Pressable onPress={handleSelectAll} className="p-2 -mr-2">
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.sage[200], fontWeight: '500' }}>
            {restockItems.every(i => i.isSelected) ? 'None' : 'All'}
          </Text>
        </Pressable>
      </View>

      {/* List Selector */}
      <Pressable
        onPress={() => setShowListPicker(true)}
        className="mx-6 mt-4 mb-2 bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 flex-row items-center active:opacity-80"
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: colors.honey[50] }}
        >
          {selectedList ? (
            <ListIcon
              name={(selectedList.icon as IconName) || DEFAULT_ICON}
              size={20}
              color={colors.honey[400]}
              strokeWidth={1.5}
            />
          ) : (
            <ShoppingCart size={20} color={colors.honey[400]} strokeWidth={1.5} />
          )}
        </View>
        <View className="flex-1">
          <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Add to list
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: colors.text.primary, marginTop: 2 }}>
            {selectedList?.name || 'Select a list'}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.text.muted} strokeWidth={1.5} />
      </Pressable>

      {/* Items Count */}
      <View className="px-6 py-3">
        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.muted }}>
          {restockItems.length} item{restockItems.length !== 1 ? 's' : ''} in pantry · {selectedCount} selected
        </Text>
      </View>

      {/* Items List */}
      {restockItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.stone[100] }}
          >
            <Package size={32} color={colors.sage[200]} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}>
            Pantry is Empty
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.text.tertiary, textAlign: 'center' }}>
            Add items to your pantry first to create a restock list
          </Text>
        </View>
      ) : (
        <FlatList
          data={restockItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RestockItemCard
              item={item}
              onToggle={() => handleToggleItem(item.id)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Action */}
      {restockItems.length > 0 && (
        <View className="px-6 py-4 border-t" style={{ borderTopColor: colors.stone[200] }}>
          <Pressable
            onPress={handleAddToList}
            disabled={selectedCount === 0 || !selectedList}
            className="py-4 rounded-2xl items-center flex-row justify-center active:opacity-90"
            style={{
              backgroundColor: selectedCount > 0 && selectedList ? colors.honey[400] : colors.stone[200],
              shadowColor: selectedCount > 0 && selectedList ? colors.honey[400] : 'transparent',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
            }}
          >
            <ShoppingCart size={20} color={selectedCount > 0 && selectedList ? 'white' : colors.text.muted} strokeWidth={2} />
            <Text
              style={{
                color: selectedCount > 0 && selectedList ? 'white' : colors.text.muted,
                fontFamily: 'Inter',
                fontWeight: '600',
                fontSize: 16,
                marginLeft: 8,
              }}
            >
              Add {selectedCount} Item{selectedCount !== 1 ? 's' : ''} to Shopping
            </Text>
          </Pressable>
        </View>
      )}

      {/* List Picker Modal */}
      <Modal visible={showListPicker} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10" style={{ maxHeight: '60%' }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500', color: colors.text.primary }}>
                Choose List
              </Text>
              <Pressable onPress={() => setShowListPicker(false)} className="p-2 -mr-2">
                <Text style={{ fontSize: 28, color: colors.text.muted, lineHeight: 28 }}>×</Text>
              </Pressable>
            </View>

            <FlatList
              data={lists}
              keyExtractor={(list) => list.id}
              renderItem={({ item: list }) => (
                <Pressable
                  onPress={() => {
                    setSelectedList(list);
                    setShowListPicker(false);
                  }}
                  className="flex-row items-center bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 mb-2 active:opacity-80"
                  style={{
                    borderColor: selectedList?.id === list.id ? colors.honey[400] : colors.stone[200],
                  }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: colors.honey[50] }}
                  >
                    <ListIcon
                      name={(list.icon as IconName) || DEFAULT_ICON}
                      size={20}
                      color={colors.honey[400]}
                      strokeWidth={1.5}
                    />
                  </View>
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: colors.text.primary, flex: 1 }}>
                    {list.name}
                  </Text>
                  {selectedList?.id === list.id && (
                    <Check size={20} color={colors.honey[400]} strokeWidth={2} />
                  )}
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="items-center py-8">
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.muted }}>
                    No shopping lists yet
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowListPicker(false);
                      router.push('/shopping-list/create');
                    }}
                    className="mt-4 px-6 py-3 rounded-xl"
                    style={{ backgroundColor: colors.honey[400] }}
                  >
                    <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600' }}>
                      Create List
                    </Text>
                  </Pressable>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
