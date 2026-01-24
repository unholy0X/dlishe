import { useState } from "react";
import { View, Text, Pressable, FlatList, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, ShoppingBasket, Sparkles, CheckCircle, X, Check, Trash2, Circle } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useShoppingStore } from "@/store";
import type { ShoppingItem, IngredientCategory } from "@/types";

function ShoppingItemCard({ item, onToggle, onDelete }: { item: ShoppingItem; onToggle: () => void; onDelete: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mb-2 active:opacity-90"
      style={{ opacity: item.isChecked ? 0.6 : 1 }}
    >
      <View className="mr-3">
        {item.isChecked ? (
          <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: colors.sage[200] }}>
            <Check size={14} color="white" strokeWidth={3} />
          </View>
        ) : (
          <Circle size={24} color={colors.stone[300]} strokeWidth={2} />
        )}
      </View>
      <View className="flex-1">
        <Text
          style={{
            color: colors.text.primary,
            fontFamily: 'Inter',
            fontSize: 15,
            textDecorationLine: item.isChecked ? 'line-through' : 'none',
          }}
        >
          {item.name}
          {item.quantity && item.unit ? ` (${item.quantity} ${item.unit})` : ''}
        </Text>
        {item.recipeName && (
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 11, marginTop: 2 }}>
            from {item.recipeName}
          </Text>
        )}
      </View>
      <Pressable onPress={onDelete} className="p-2 -mr-2">
        <Trash2 size={16} color={colors.text.muted} />
      </Pressable>
    </Pressable>
  );
}

export default function ShoppingScreen() {
  const { items, addItem, toggleItem, deleteItem, clearChecked, isLoading } = useShoppingStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const uncheckedItems = items.filter((i) => !i.isChecked);
  const checkedItems = items.filter((i) => i.isChecked);

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    await addItem({
      name: newItemName.trim(),
      category: 'other',
      isChecked: false,
    });

    setNewItemName("");
    setShowAddModal(false);
  };

  const handleClearChecked = () => {
    if (checkedItems.length === 0) return;

    Alert.alert(
      "Clear Checked Items",
      `Remove ${checkedItems.length} checked item${checkedItems.length !== 1 ? 's' : ''}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => clearChecked() },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between py-5 px-6">
          <View>
            <Text className="text-3xl mb-1" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '400' }}>
              Shopping List
            </Text>
            <Text className="text-sm" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>
              {items.length === 0 ? 'Gather your treasures' : `${uncheckedItems.length} item${uncheckedItems.length !== 1 ? 's' : ''} to get`}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
            style={{
              backgroundColor: colors.honey[300],
              shadowColor: colors.honey[300],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
            }}
          >
            <Plus size={20} color="white" strokeWidth={2} />
          </Pressable>
        </View>

        {items.length === 0 ? (
          /* Empty State */
          <View className="flex-1 items-center justify-center pb-24 px-6">
            <View className="w-24 h-24 bg-honey-100 rounded-full items-center justify-center mb-6 border-2" style={{ borderColor: colors.honey[200] }}>
              <ShoppingBasket size={40} color={colors.honey[300]} strokeWidth={1.5} />
            </View>

            <Text className="text-2xl text-center mb-3" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '400' }}>
              Ready to Shop?
            </Text>
            <Text className="text-center mb-8 px-8" style={{ color: colors.text.tertiary, fontFamily: 'Inter', fontSize: 15, lineHeight: 24 }}>
              Add ingredients from your recipes{"\n"}
              or create a list manually
            </Text>

            <Pressable
              onPress={() => setShowAddModal(true)}
              className="px-8 py-4 rounded-xl flex-row items-center active:opacity-90"
              style={{
                backgroundColor: colors.honey[300],
                shadowColor: colors.honey[300],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
              }}
            >
              <Plus size={20} color="white" strokeWidth={2} />
              <Text className="text-white text-base ml-2" style={{ fontFamily: 'Inter', fontWeight: '600' }}>
                Add Item
              </Text>
            </Pressable>

            {/* Features */}
            <View className="mt-10 w-full px-4">
              <View className="bg-stone-100 border border-stone-200 rounded-xl p-6">
                <Text className="mb-5 text-center" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '600', fontSize: 15 }}>
                  Smart Shopping
                </Text>
                <View className="gap-4">
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 bg-sage-50 rounded-full items-center justify-center mr-3">
                      <CheckCircle size={14} color={colors.sage[200]} strokeWidth={2} />
                    </View>
                    <Text className="flex-1" style={{ color: colors.text.tertiary, fontFamily: 'Inter', fontSize: 13 }}>
                      Add ingredients from recipe detail
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 bg-sage-50 rounded-full items-center justify-center mr-3">
                      <CheckCircle size={14} color={colors.sage[200]} strokeWidth={2} />
                    </View>
                    <Text className="flex-1" style={{ color: colors.text.tertiary, fontFamily: 'Inter', fontSize: 13 }}>
                      Tap items to mark as bought
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 bg-sage-50 rounded-full items-center justify-center mr-3">
                      <CheckCircle size={14} color={colors.sage[200]} strokeWidth={2} />
                    </View>
                    <Text className="flex-1" style={{ color: colors.text.tertiary, fontFamily: 'Inter', fontSize: 13 }}>
                      Clear checked items when done
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Shopping List */
          <FlatList
            data={[...uncheckedItems, ...checkedItems]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ShoppingItemCard
                item={item}
                onToggle={() => toggleItem(item.id)}
                onDelete={() => deleteItem(item.id)}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              uncheckedItems.length > 0 && checkedItems.length > 0 ? null : null
            }
            ItemSeparatorComponent={() => null}
            ListFooterComponent={
              checkedItems.length > 0 ? (
                <Pressable
                  onPress={handleClearChecked}
                  className="mt-4 py-3 rounded-xl items-center"
                  style={{ backgroundColor: colors.stone[100], borderWidth: 1, borderColor: colors.stone[200] }}
                >
                  <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontWeight: '500', fontSize: 14 }}>
                    Clear {checkedItems.length} checked item{checkedItems.length !== 1 ? 's' : ''}
                  </Text>
                </Pressable>
              ) : null
            }
          />
        )}

        {/* Add Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10">
              <View className="flex-row items-center justify-between mb-6">
                <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500' }}>
                  Add Item
                </Text>
                <Pressable onPress={() => setShowAddModal(false)} className="p-2 -mr-2">
                  <X size={24} color={colors.text.muted} />
                </Pressable>
              </View>

              <TextInput
                className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-4 mb-5"
                placeholder="What do you need?"
                placeholderTextColor={colors.text.muted}
                value={newItemName}
                onChangeText={setNewItemName}
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
                autoFocus
                onSubmitEditing={handleAddItem}
              />

              <Pressable
                onPress={handleAddItem}
                disabled={!newItemName.trim() || isLoading}
                className="py-4 rounded-xl items-center"
                style={{
                  backgroundColor: newItemName.trim() ? colors.honey[300] : colors.stone[200],
                }}
              >
                <Text style={{ color: newItemName.trim() ? 'white' : colors.text.muted, fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
                  Add to List
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
