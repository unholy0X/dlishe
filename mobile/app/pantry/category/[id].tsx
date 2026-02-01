import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { getCategoryVisual, getCategoryIcon } from "@/constants/categoryVisuals";
import { ItemTile, FilteredEmoji } from "@/components/pantry";
import { usePantryStore } from "@/store";
import type { PantryItem, IngredientCategory } from "@/types";
import * as Haptics from "expo-haptics";

export default function PantryCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = id as IngredientCategory;
  const { items, loadItems, deleteItem, getItemsByCategory } = usePantryStore();

  useEffect(() => {
    loadItems();
  }, []);

  const categoryInfo = CATEGORIES.find(c => c.value === category);
  const categoryItems = getItemsByCategory(category);
  const visual = getCategoryVisual(category);
  const icon = getCategoryIcon(category);

  const handleDelete = (itemId: string, name: string) => {
    Alert.alert("Remove Item", `Remove ${name} from pantry?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteItem(itemId);
        },
      },
    ]);
  };

  const handleItemPress = (item: PantryItem) => {
    // For now, just show an alert with item details
    // Could expand to edit view in future
    Alert.alert(
      item.name,
      `${item.quantity ? `${item.quantity} ${item.unit || ''}` : 'No quantity set'}\n\nLong press to delete`,
      [{ text: "OK" }]
    );
  };

  const handleAddMore = () => {
    router.push(`/pantry/add?category=${category}`);
  };

  if (!categoryInfo) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50 items-center justify-center">
        <Text style={{ fontFamily: 'Inter', color: colors.text.muted }}>Category not found</Text>
      </SafeAreaView>
    );
  }

  // Render item grid - 3 columns
  const renderItemGrid = () => {
    const rows = [];
    for (let i = 0; i < categoryItems.length; i += 3) {
      const rowItems = categoryItems.slice(i, i + 3);
      rows.push(
        <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {rowItems.map((item) => (
            <View key={item.id} style={{ flex: 1 }}>
              <ItemTile
                item={item}
                onPress={() => handleItemPress(item)}
                onLongPress={() => handleDelete(item.id, item.name)}
              />
            </View>
          ))}
          {/* Fill empty slots to maintain grid alignment */}
          {rowItems.length < 3 &&
            Array(3 - rowItems.length)
              .fill(null)
              .map((_, idx) => <View key={`empty-${idx}`} style={{ flex: 1 }} />)}
        </View>
      );
    }
    return rows;
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
      <View className="flex-1">
        {/* Colored Header */}
        <LinearGradient
          colors={visual.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingBottom: 24 }}
        >
          <View className="px-6 pt-4">
            {/* Navigation Row */}
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-xl items-center justify-center active:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <ArrowLeft size={22} color={visual.icon} strokeWidth={1.5} />
              </Pressable>
              <Pressable
                onPress={handleAddMore}
                className="w-10 h-10 rounded-xl items-center justify-center active:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <Plus size={20} color={visual.icon} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Category Info */}
            <View className="items-center">
              <FilteredEmoji emoji={icon} size={64} opacity={0.85} warmTint={true} />
              <Text
                style={{
                  fontFamily: 'Cormorant Garamond',
                  fontSize: 32,
                  fontWeight: '600',
                  color: visual.icon,
                  textAlign: 'center',
                }}
              >
                {categoryInfo.label}
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontSize: 14,
                  color: visual.icon,
                  opacity: 0.8,
                  marginTop: 4,
                }}
              >
                {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''} in pantry
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Items Grid */}
        {categoryItems.length === 0 ? (
          <View className="flex-1 items-center justify-center pb-24 px-6">
            <Text
              style={{
                fontFamily: 'Cormorant Garamond',
                fontSize: 22,
                color: colors.text.primary,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              No {categoryInfo.label.toLowerCase()} yet
            </Text>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
                color: colors.text.tertiary,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              Add items to track your {categoryInfo.label.toLowerCase()}
            </Text>
            <Pressable
              onPress={handleAddMore}
              className="px-6 py-3 rounded-xl flex-row items-center active:opacity-90"
              style={{ backgroundColor: visual.bg }}
            >
              <Plus size={18} color={visual.icon} strokeWidth={2} />
              <Text
                style={{
                  color: visual.icon,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  fontSize: 15,
                  marginLeft: 8,
                }}
              >
                Add {categoryInfo.label}
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Item Grid */}
            {renderItemGrid()}

            {/* Add More Button */}
            <Pressable
              onPress={handleAddMore}
              className="mt-4 rounded-xl p-4 flex-row items-center justify-center active:opacity-80"
              style={{
                backgroundColor: colors.stone[100],
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: colors.stone[300],
              }}
            >
              <Plus size={18} color={visual.bg} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontSize: 14,
                  fontWeight: '500',
                  color: visual.bg,
                  marginLeft: 8,
                }}
              >
                Add more {categoryInfo.label.toLowerCase()}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
