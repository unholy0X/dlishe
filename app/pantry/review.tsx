import { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, TextInput, Modal, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, AlertTriangle, Edit3, Trash2, Plus, Leaf } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { usePantryStore, useShoppingListsStore } from "@/store";
import { scanPantryImages, type ScannedItem } from "@/lib/ai/pantryScanner";
import type { IngredientCategory } from "@/types";

// Confidence bar component
function ConfidenceBar({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const barColor = confidence >= 0.8
    ? colors.sage[200]
    : confidence >= 0.5
      ? colors.honey[300]
      : colors.honey[400];

  return (
    <View className="flex-row items-center mt-2">
      <View className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.stone[200] }}>
        <View
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </View>
      <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.text.muted, marginLeft: 8, width: 32 }}>
        {percentage}%
      </Text>
    </View>
  );
}

// Item card component
function ScannedItemCard({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ScannedItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const needsAttention = item.confidence < 0.5;

  return (
    <Pressable
      onPress={onToggle}
      className="bg-stone-100 border rounded-2xl px-4 py-4 mb-3"
      style={{
        borderColor: needsAttention ? colors.honey[200] : colors.stone[200],
        backgroundColor: needsAttention ? colors.honey[50] : colors.stone[100],
        opacity: item.isSelected ? 1 : 0.6,
      }}
    >
      <View className="flex-row items-start">
        {/* Checkbox */}
        <Pressable onPress={onToggle} className="mr-3 mt-0.5">
          <View
            className="w-6 h-6 rounded-lg items-center justify-center"
            style={{
              backgroundColor: item.isSelected ? colors.sage[200] : 'transparent',
              borderWidth: item.isSelected ? 0 : 2,
              borderColor: colors.stone[300],
            }}
          >
            {item.isSelected && <Check size={14} color="white" strokeWidth={3} />}
          </View>
        </Pressable>

        {/* Item Info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            {needsAttention && (
              <AlertTriangle size={14} color={colors.honey[400]} strokeWidth={2} style={{ marginRight: 6 }} />
            )}
            <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '500', color: colors.text.primary, flex: 1 }}>
              {item.name}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <CategoryIcon category={item.category} size={14} color={colors.text.muted} strokeWidth={1.5} />
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.muted, marginLeft: 6 }}>
              {item.quantity} {item.unit} · {CATEGORIES.find(c => c.value === item.category)?.label}
            </Text>
          </View>
          <ConfidenceBar confidence={item.confidence} />
        </View>

        {/* Actions */}
        <View className="flex-row ml-2">
          <Pressable onPress={onEdit} className="p-2">
            <Edit3 size={16} color={colors.text.muted} strokeWidth={1.5} />
          </Pressable>
          <Pressable onPress={onDelete} className="p-2">
            <Trash2 size={16} color={colors.text.muted} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default function PantryReviewScreen() {
  const { photos } = useLocalSearchParams<{ photos: string }>();
  const { addItem } = usePantryStore();
  const { commonItems, loadCommonItems } = useShoppingListsStore();

  const [isProcessing, setIsProcessing] = useState(true);
  const [processingMessage, setProcessingMessage] = useState("Analyzing images...");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ScannedItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCategory, setEditCategory] = useState<IngredientCategory>('other');

  useEffect(() => {
    processImages();
  }, []);

  const processImages = async () => {
    try {
      // Load common items first
      await loadCommonItems();

      setProcessingMessage("Identifying ingredients...");

      const photoUris: string[] = photos ? JSON.parse(photos) : [];

      if (photoUris.length === 0) {
        setError("No photos to process");
        setIsProcessing(false);
        return;
      }

      setProcessingMessage(`Scanning ${photoUris.length} photo${photoUris.length > 1 ? 's' : ''}...`);

      const result = await scanPantryImages(photoUris, commonItems);

      if (result.error) {
        setError(result.error);
      } else if (result.items.length === 0) {
        setError("No items found in the photos. Try taking clearer pictures with better lighting.");
      } else {
        setItems(result.items);
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError("Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleItem = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, isSelected: !item.isSelected } : item
    ));
  };

  const handleEditItem = (item: ScannedItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity.toString());
    setEditUnit(item.unit);
    setEditCategory(item.category);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    setItems(prev => prev.map(item =>
      item === editingItem
        ? {
          ...item,
          name: editName.trim() || item.name,
          quantity: parseFloat(editQuantity) || item.quantity,
          unit: editUnit.trim() || item.unit,
          category: editCategory,
          confidence: 1, // User verified
          isSelected: true,
        }
        : item
    ));

    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectAll = () => {
    const allSelected = items.every(item => item.isSelected);
    setItems(prev => prev.map(item => ({ ...item, isSelected: !allSelected })));
  };

  const handleAddToPantry = async () => {
    const selectedItems = items.filter(item => item.isSelected);

    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select at least one item to add to your pantry.");
      return;
    }

    try {
      for (const item of selectedItems) {
        await addItem({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
        });
      }

      Alert.alert(
        "Success!",
        `Added ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} to your pantry.`,
        [{ text: "OK", onPress: () => router.replace('/(tabs)/pantry') }]
      );
    } catch (err) {
      Alert.alert("Error", "Failed to add items to pantry. Please try again.");
    }
  };

  const selectedCount = items.filter(item => item.isSelected).length;

  // Processing state
  if (isProcessing) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: colors.sage[100] }}
          >
            <Leaf size={48} color={colors.sage[200]} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: colors.text.primary, marginBottom: 12 }}>
            Discovering Ingredients
          </Text>
          <ActivityIndicator size="large" color={colors.sage[200]} style={{ marginBottom: 16 }} />
          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.muted }}>
            {processingMessage}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
        <View className="flex-row items-center px-6 py-4 border-b" style={{ borderBottomColor: colors.stone[200] }}>
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color={colors.text.primary} strokeWidth={1.5} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: colors.honey[50] }}
          >
            <AlertTriangle size={48} color={colors.honey[400]} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: colors.text.primary, textAlign: 'center', marginBottom: 12 }}>
            Couldn't Identify Items
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.tertiary, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
            {error}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-8 py-4 rounded-xl active:opacity-90"
            style={{ backgroundColor: colors.sage[200] }}
          >
            <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
              Try Again
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/pantry/add')}
            className="mt-4 px-6 py-3"
          >
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 15 }}>
              Add Manually Instead
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Review state
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b" style={{ borderBottomColor: colors.stone[200] }}>
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color={colors.text.primary} strokeWidth={1.5} />
        </Pressable>
        <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: '500', color: colors.text.primary }}>
          Review Items
        </Text>
        <Pressable onPress={handleSelectAll} className="p-2 -mr-2">
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.sage[200], fontWeight: '500' }}>
            {items.every(i => i.isSelected) ? 'Deselect All' : 'Select All'}
          </Text>
        </Pressable>
      </View>

      {/* Items Count */}
      <View className="px-6 py-3" style={{ backgroundColor: colors.stone[100] }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.secondary }}>
          Found {items.length} item{items.length !== 1 ? 's' : ''} · {selectedCount} selected
        </Text>
      </View>

      {/* Items List */}
      <FlatList
        data={items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <ScannedItemCard
            item={item}
            onToggle={() => handleToggleItem(index)}
            onEdit={() => handleEditItem(item)}
            onDelete={() => handleDeleteItem(index)}
          />
        )}
        contentContainerStyle={{ padding: 24 }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <Pressable
            onPress={() => router.push('/pantry/add')}
            className="bg-stone-100 border-2 border-dashed rounded-2xl p-4 flex-row items-center justify-center active:opacity-80"
            style={{ borderColor: colors.stone[300] }}
          >
            <Plus size={18} color={colors.sage[200]} strokeWidth={2} />
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: colors.sage[200], marginLeft: 8 }}>
              Add Missing Item
            </Text>
          </Pressable>
        }
      />

      {/* Bottom Action */}
      <View className="px-6 py-4 border-t" style={{ borderTopColor: colors.stone[200] }}>
        <Pressable
          onPress={handleAddToPantry}
          disabled={selectedCount === 0}
          className="py-4 rounded-2xl items-center active:opacity-90"
          style={{
            backgroundColor: selectedCount > 0 ? colors.sage[200] : colors.stone[200],
            shadowColor: selectedCount > 0 ? colors.sage[200] : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
          }}
        >
          <Text style={{ color: selectedCount > 0 ? 'white' : colors.text.muted, fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
            Add {selectedCount} Item{selectedCount !== 1 ? 's' : ''} to Pantry
          </Text>
        </Pressable>
      </View>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500', color: colors.text.primary }}>
                Edit Item
              </Text>
              <Pressable onPress={() => setShowEditModal(false)} className="p-2 -mr-2">
                <Text style={{ fontSize: 28, color: colors.text.muted, lineHeight: 28 }}>×</Text>
              </Pressable>
            </View>

            {/* Name */}
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Name
            </Text>
            <TextInput
              className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mb-4"
              value={editName}
              onChangeText={setEditName}
              style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
            />

            {/* Quantity & Unit */}
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Quantity
            </Text>
            <View className="flex-row gap-3 mb-4">
              <TextInput
                className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 flex-1"
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="decimal-pad"
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
              />
              <TextInput
                className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 flex-1"
                value={editUnit}
                onChangeText={setEditUnit}
                placeholder="unit"
                placeholderTextColor={colors.text.muted}
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
              />
            </View>

            {/* Category */}
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setEditCategory(cat.value)}
                  className="px-3 py-2 rounded-xl flex-row items-center"
                  style={{
                    backgroundColor: editCategory === cat.value ? colors.sage[200] : colors.stone[100],
                    borderWidth: 1,
                    borderColor: editCategory === cat.value ? colors.sage[200] : colors.stone[200],
                  }}
                >
                  <CategoryIcon
                    category={cat.value}
                    size={14}
                    color={editCategory === cat.value ? 'white' : colors.text.muted}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: editCategory === cat.value ? 'white' : colors.text.secondary,
                      marginLeft: 6,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveEdit}
              className="py-4 rounded-2xl items-center active:opacity-90"
              style={{ backgroundColor: colors.sage[200] }}
            >
              <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
                Save Changes
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
