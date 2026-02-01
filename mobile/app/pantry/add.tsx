import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, Modal, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Search, Camera, Plus, Minus } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { getCategoryVisual, getCategoryIcon } from "@/constants/categoryVisuals";
import { FilteredEmoji, ItemBadge } from "@/components/pantry";
import { usePantryStore, useShoppingListsStore } from "@/store";
import type { IngredientCategory, CommonItem } from "@/types";
import * as Haptics from "expo-haptics";

export default function PantryAddScreen() {
  // Get category filter from URL params (when coming from category detail)
  const { category: filterCategory } = useLocalSearchParams<{ category?: string }>();
  const initialCategory = filterCategory as IngredientCategory | undefined;

  const { addItem } = usePantryStore();
  const { commonItems, loadCommonItems, searchCommonItems, isLoading } = useShoppingListsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CommonItem[]>([]);
  const [showCategoryItems, setShowCategoryItems] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | null>(initialCategory || null);
  const [showConfirmAdd, setShowConfirmAdd] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CommonItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // If we came from a category, show that category's items immediately
  useEffect(() => {
    const init = async () => {
      await loadCommonItems();
      setItemsLoaded(true);
      // Auto-open category modal if we have a filter category
      if (initialCategory) {
        setSelectedCategory(initialCategory);
        setShowCategoryItems(true);
      }
    };
    init();
  }, []);

  // Search common items as user types - filter by category if set
  useEffect(() => {
    const search = async () => {
      if (searchQuery.trim().length > 0) {
        let results = await searchCommonItems(searchQuery);
        // Filter by category if we're in category-filtered mode
        if (initialCategory) {
          results = results.filter(item => item.category === initialCategory);
        }
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, initialCategory]);

  const handleCategoryPress = (category: IngredientCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
    setShowCategoryItems(true);
  };

  const handleSelectItem = (item: CommonItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setQuantity(item.defaultQuantity?.toString() || "1");
    setUnit(item.defaultUnit || "");
    setShowCategoryItems(false);
    setShowConfirmAdd(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleConfirmAdd = async () => {
    if (!selectedItem) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addItem({
      name: selectedItem.name,
      category: selectedItem.category,
      quantity: quantity ? parseFloat(quantity) : undefined,
      unit: unit.trim() || undefined,
    });

    // Reset and stay on add screen to add more
    setSelectedItem(null);
    setQuantity("");
    setUnit("");
    setShowConfirmAdd(false);
  };

  const handleAddCustom = async () => {
    if (!searchQuery.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addItem({
      name: searchQuery.trim(),
      category: initialCategory || selectedCategory || 'other',
    });

    setSearchQuery("");
    setSearchResults([]);
  };

  const adjustQuantity = (delta: number) => {
    const current = parseFloat(quantity) || 0;
    const newValue = Math.max(0, current + delta);
    setQuantity(newValue.toString());
  };

  const categoryItems = selectedCategory
    ? commonItems.filter(item => item.category === selectedCategory)
    : [];

  // Get category info for filtered mode
  const filterCategoryInfo = initialCategory
    ? CATEGORIES.find(c => c.value === initialCategory)
    : null;
  const filterVisual = initialCategory ? getCategoryVisual(initialCategory) : null;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-6 py-4 border-b" style={{ borderBottomColor: colors.stone[200] }}>
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 mr-3">
            <ArrowLeft size={24} color={colors.text.primary} strokeWidth={1.5} />
          </Pressable>
          <View className="flex-1">
            <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500', color: colors.text.primary }}>
              {filterCategoryInfo ? `Add ${filterCategoryInfo.label}` : 'Add to Pantry'}
            </Text>
            {filterCategoryInfo && (
              <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
                Showing only {filterCategoryInfo.label.toLowerCase()} items
              </Text>
            )}
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Search Bar */}
          <View className="px-6 py-4">
            <View className="flex-row items-center bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4">
              <Search size={20} color={colors.text.muted} strokeWidth={1.5} />
              <TextInput
                className="flex-1 ml-3"
                placeholder={filterCategoryInfo ? `Search ${filterCategoryInfo.label.toLowerCase()}...` : "Search ingredients..."}
                placeholderTextColor={colors.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
              />
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View className="mt-3 bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                  {searchResults.map((item) => {
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => handleSelectItem(item)}
                        className="px-4 py-3 border-b active:bg-stone-50"
                        style={{ borderBottomColor: colors.stone[200] }}
                      >
                        <View className="flex-row items-center">
                          <ItemBadge name={item.name} category={item.category} size={28} />
                          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.primary, marginLeft: 10, flex: 1 }}>
                            {item.name}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.text.muted, marginTop: 2, marginLeft: 38 }}>
                          {item.defaultQuantity} {item.defaultUnit} · {CATEGORIES.find(c => c.value === item.category)?.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Add Custom Item Button (when searching but no results) */}
            {searchQuery.trim() && searchResults.length === 0 && (
              <Pressable
                onPress={handleAddCustom}
                className="mt-3 bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 flex-row items-center justify-center active:opacity-80"
              >
                <Plus size={18} color={colors.sage[200]} strokeWidth={2} />
                <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.sage[200], marginLeft: 8, fontWeight: '500' }}>
                  Add "{searchQuery.trim()}" as custom item
                </Text>
              </Pressable>
            )}
          </View>

          {/* Category-filtered mode: Show items list directly */}
          {initialCategory && !searchQuery && (
            <View className="px-6 pb-6">
              {!itemsLoaded || isLoading ? (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color={colors.honey[400]} />
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.text.muted, marginTop: 12 }}>
                    Loading items...
                  </Text>
                </View>
              ) : categoryItems.length === 0 ? (
                <View className="items-center py-12">
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.muted }}>
                    No items in this category yet
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: '600',
                      color: colors.text.muted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 12,
                    }}
                  >
                    {filterCategoryInfo?.label} ({categoryItems.length} items)
                  </Text>
                  {categoryItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => handleSelectItem(item)}
                      className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 mb-2 flex-row items-center active:opacity-80"
                    >
                      <ItemBadge name={item.name} category={item.category} size={36} />
                      <View className="ml-3 flex-1">
                        <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: colors.text.primary }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.tertiary, marginTop: 2 }}>
                          {item.defaultQuantity} {item.defaultUnit}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          )}

          {/* Category Grid (only when not filtered) */}
          {!initialCategory && !searchQuery && (
            <View className="px-6">
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: '600',
                  color: colors.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}
              >
                Browse by Category
              </Text>

              <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
                {CATEGORIES.filter(c => c.value !== 'other').map((category) => {
                  const visual = getCategoryVisual(category.value);
                  const icon = getCategoryIcon(category.value);
                  return (
                    <View key={category.value} className="w-1/3 p-1.5">
                      <Pressable
                        onPress={() => handleCategoryPress(category.value)}
                        className="rounded-2xl p-4 items-center active:opacity-70"
                        style={{ backgroundColor: visual.bg + '20' }}
                      >
                        <FilteredEmoji emoji={icon} size={36} opacity={0.8} warmTint />
                        <Text
                          style={{
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: '500',
                            color: visual.bg,
                            marginTop: 8,
                            textAlign: 'center',
                          }}
                        >
                          {category.label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              {/* AI Scan Option - Secondary */}
              <View className="mt-6 pt-6 border-t" style={{ borderTopColor: colors.stone[200] }}>
                <Text
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 11,
                    fontWeight: '600',
                    color: colors.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 12,
                  }}
                >
                  Or import in bulk
                </Text>
                <Pressable
                  onPress={() => router.push('/pantry/scan')}
                  className="bg-stone-100 border border-stone-200 rounded-2xl px-5 py-4 flex-row items-center active:opacity-80"
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: colors.honey[50] }}
                  >
                    <Camera size={20} color={colors.honey[400]} strokeWidth={1.5} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: colors.text.primary }}>
                      Scan with AI
                    </Text>
                    <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.muted, marginTop: 2 }}>
                      Add items from photos
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Category Items Modal (only used when browsing all categories) */}
        <Modal visible={showCategoryItems && !initialCategory} animationType="slide" transparent>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10" style={{ maxHeight: '70%' }}>
              <View className="flex-row items-center justify-between mb-6">
                {selectedCategory && (
                  <View className="flex-row items-center">
                    <FilteredEmoji
                      emoji={getCategoryIcon(selectedCategory)}
                      size={40}
                      opacity={0.85}
                      warmTint
                    />
                    <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500', color: colors.text.primary, marginLeft: 12 }}>
                      {CATEGORIES.find(c => c.value === selectedCategory)?.label}
                    </Text>
                  </View>
                )}
                <Pressable onPress={() => setShowCategoryItems(false)} className="p-2 -mr-2">
                  <Text style={{ fontSize: 28, color: colors.text.muted, lineHeight: 28 }}>×</Text>
                </Pressable>
              </View>

              {!itemsLoaded || isLoading ? (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color={colors.honey[400]} />
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.text.muted, marginTop: 12 }}>
                    Loading items...
                  </Text>
                </View>
              ) : categoryItems.length === 0 ? (
                <View className="items-center py-12">
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.muted }}>
                    No items in this category yet
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowCategoryItems(false);
                    }}
                    className="mt-4 px-5 py-3 rounded-xl active:opacity-80"
                    style={{ backgroundColor: colors.sage[200] }}
                  >
                    <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: 'white' }}>
                      Search to add custom item
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {categoryItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => handleSelectItem(item)}
                      className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 mb-2 flex-row items-center active:opacity-80"
                    >
                      <ItemBadge name={item.name} category={item.category} size={36} />
                      <View className="ml-3 flex-1">
                        <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: colors.text.primary }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.tertiary, marginTop: 2 }}>
                          {item.defaultQuantity} {item.defaultUnit}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Confirm Add Modal */}
        <Modal visible={showConfirmAdd} animationType="slide" transparent>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10">
              <View className="flex-row items-center justify-between mb-6">
                <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500', color: colors.text.primary }}>
                  Add to Pantry
                </Text>
                <Pressable onPress={() => { setShowConfirmAdd(false); setSelectedItem(null); }} className="p-2 -mr-2">
                  <Text style={{ fontSize: 28, color: colors.text.muted, lineHeight: 28 }}>×</Text>
                </Pressable>
              </View>

              {selectedItem && (
                <>
                  {/* Item Info */}
                  <View className="bg-stone-100 border border-stone-200 rounded-2xl px-5 py-4 mb-5 flex-row items-center">
                    <ItemBadge name={selectedItem.name} category={selectedItem.category} size={44} />
                    <View className="ml-4 flex-1">
                      <Text style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: '500', color: colors.text.primary }}>
                        {selectedItem.name}
                      </Text>
                      <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.muted, marginTop: 4 }}>
                        {CATEGORIES.find(c => c.value === selectedItem.category)?.label}
                      </Text>
                    </View>
                  </View>

                  {/* Quantity Adjuster */}
                  <View className="mb-6">
                    <Text
                      style={{
                        fontFamily: 'Inter',
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.text.secondary,
                        marginBottom: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Quantity
                    </Text>
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => adjustQuantity(-1)}
                        className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
                        style={{ backgroundColor: colors.stone[200] }}
                      >
                        <Minus size={20} color={colors.text.secondary} strokeWidth={2} />
                      </Pressable>
                      <View className="flex-1 mx-4">
                        <View className="flex-row items-center justify-center">
                          <TextInput
                            className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-center"
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="decimal-pad"
                            style={{ fontSize: 18, color: colors.text.primary, fontFamily: 'Inter', fontWeight: '600', minWidth: 80 }}
                          />
                          <TextInput
                            className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 ml-2"
                            value={unit}
                            onChangeText={setUnit}
                            placeholder="unit"
                            placeholderTextColor={colors.text.muted}
                            style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter', minWidth: 80 }}
                          />
                        </View>
                      </View>
                      <Pressable
                        onPress={() => adjustQuantity(1)}
                        className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
                        style={{ backgroundColor: colors.sage[200] }}
                      >
                        <Plus size={20} color="white" strokeWidth={2} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Add Button */}
                  <Pressable
                    onPress={handleConfirmAdd}
                    className="py-4 rounded-2xl items-center active:opacity-90"
                    style={{
                      backgroundColor: colors.sage[200],
                      shadowColor: colors.sage[200],
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 12,
                    }}
                  >
                    <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
                      Add to Pantry
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
