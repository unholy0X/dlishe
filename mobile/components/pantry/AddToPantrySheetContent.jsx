import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useAuth } from "@clerk/clerk-expo";
import ArrowLeftIcon from "../icons/ArrowLeftIcon";
import ScanWithAiIcon from "../icons/ScanWithAiIcon";
import ImageCapture from "../ImageCapture";
import { usePantryStore } from "../../store";
import PaywallSheet from "../paywall/PaywallSheet";
import { useTranslation } from "react-i18next";

// Categories with predefined common items
const CATEGORIES = [
  {
    label: "Dairy",
    key: "dairy",
    image: require("../../assets/Dairy.png"),
    items: ["Milk", "Eggs", "Butter", "Cheese", "Yogurt", "Cream", "Sour Cream", "Cream Cheese"],
  },
  {
    label: "Produce",
    key: "produce",
    image: require("../../assets/produce.png"),
    items: ["Tomatoes", "Onions", "Garlic", "Potatoes", "Carrots", "Lettuce", "Bananas", "Apples", "Lemons", "Limes"],
  },
  {
    label: "Proteins",
    key: "proteins",
    image: require("../../assets/proteins.png"),
    items: ["Chicken Breast", "Ground Beef", "Salmon", "Shrimp", "Bacon", "Sausage", "Tofu", "Turkey"],
  },
  {
    label: "Bakery",
    key: "bakery",
    image: require("../../assets/bakery.png"),
    items: ["Bread", "Flour", "Sugar", "Baking Powder", "Yeast", "Tortillas", "Croissants"],
  },
  {
    label: "Spices",
    key: "spices",
    image: require("../../assets/spices.png"),
    items: ["Salt", "Black Pepper", "Paprika", "Cumin", "Cinnamon", "Oregano", "Basil", "Thyme", "Garlic Powder"],
  },
  {
    label: "Pantry",
    key: "pantry",
    image: require("../../assets/pantry.png"),
    items: ["Pasta", "Rice", "Olive Oil", "Canned Tomatoes", "Beans", "Oats", "Cereal", "Peanut Butter"],
  },
  {
    label: "Beverages",
    key: "beverages",
    image: require("../../assets/beverages.png"),
    items: ["Coffee", "Tea", "Juice", "Milk", "Water", "Soda", "Wine", "Beer"],
  },
  {
    label: "Condiments",
    key: "condiments",
    image: require("../../assets/beverages1.png"),
    items: ["Ketchup", "Mustard", "Mayonnaise", "Soy Sauce", "Hot Sauce", "BBQ Sauce", "Honey", "Maple Syrup"],
  },
  {
    label: "Snacks",
    key: "snacks",
    image: require("../../assets/snacks.png"),
    items: ["Chips", "Crackers", "Nuts", "Popcorn", "Cookies", "Pretzels", "Granola Bars"],
  },
  {
    label: "Frozen",
    key: "frozen",
    image: require("../../assets/frozen.png"),
    items: ["Ice Cream", "Frozen Pizza", "Frozen Vegetables", "Frozen Fruit", "Frozen Meals"],
  },
  {
    label: "Household",
    key: "household",
    image: require("../../assets/household.png"),
    items: ["Paper Towels", "Trash Bags", "Dish Soap", "Laundry Detergent", "Sponges", "Aluminum Foil"],
  },
];

const COMMON_UNITS = ["", "g", "kg", "ml", "L", "oz", "lb", "pcs", "bunch", "can", "bottle", "bag", "box"];

export default function AddToPantrySheetContent({ onPressBack, onItemAdded }) {
  const { getToken } = useAuth();
  const { addItem, scanImage, isScanning } = usePantryStore();
  const { t } = useTranslation("pantry");

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const handleCategoryTap = (category) => {
    setSelectedCategory(category);
    setItemName("");
    setQuantity("");
    setUnit("");
    setShowCustomInput(false);
  };

  const handleItemSelect = (name) => {
    setItemName(name);
  };

  const handleAddItem = async () => {
    if (!itemName.trim() || !selectedCategory) return;
    setIsAdding(true);
    try {
      await addItem({
        getToken,
        name: itemName.trim(),
        category: selectedCategory.key,
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit || undefined,
      });
      setSelectedCategory(null);
      setItemName("");
      setQuantity("");
      setUnit("");
      onItemAdded?.();
    } catch (err) {
      Alert.alert(t("addSheet.alertOops", "Oops"), err?.message || t("addSheet.alertError", "Something went wrong. Try again?"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleScanWithAI = useCallback(async () => {
    if (capturedImages.length === 0) return;
    try {
      const scanResult = await scanImage({
        getToken,
        images: capturedImages.map((img) => ({
          base64: img.base64,
          mimeType: img.mimeType,
        })),
      });

      const addedCount = scanResult?.addedCount || 0;
      Alert.alert(
        t("addSheet.alertTitle", "All done!"),
        addedCount > 0
          ? t("addSheet.alertAdded", { count: addedCount, defaultValue: `Added ${addedCount} item${addedCount !== 1 ? "s" : ""} to your pantry!` })
          : t("addSheet.alertNoItems", "Hmm, we couldn't spot any items. Try a clearer photo of your ingredients.")
      );

      setCapturedImages([]);
      if (addedCount > 0) {
        onItemAdded?.();
      }
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("quota_exceeded") || msg.includes("monthly scan limit")) {
        setPaywallVisible(true);
      } else {
        Alert.alert(t("addSheet.alertOops", "Oops"), err?.message || t("addSheet.alertError", "Something went wrong. Try again?"));
      }
    }
  }, [capturedImages, getToken, scanImage, onItemAdded]);

  const closeModal = () => {
    setSelectedCategory(null);
    setShowCustomInput(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={onPressBack}>
          <BlurView intensity={100} tint="light" style={styles.backPill}>
            <ArrowLeftIcon width={9} height={8} color="#555555" />
            <Text style={styles.backText}>{t("addSheet.back", "Back")}</Text>
          </BlurView>
        </Pressable>
        <Text style={styles.headerTitle}>{t("addSheet.title", "Add to pantry")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.sectionTitle}>{t("addSheet.browseCategory", "Browse by category")}</Text>
      <View style={styles.grid}>
        {CATEGORIES.map((item, index) => (
          <Pressable
            key={`${item.key}-${index}`}
            style={styles.card}
            onPress={() => handleCategoryTap(item)}
          >
            <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
            <Text style={styles.cardText}>{t(`categories.${item.key}`, item.label)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t("addSheet.importBulk", "Or import in bulk")}</Text>
      <ImageCapture
        images={capturedImages}
        onImagesChange={setCapturedImages}
        maxImages={1}
        quality={0.6}
        disabled={isScanning}
        label={t("addSheet.snapTitle", "Snap your groceries")}
        sublabel={t("addSheet.snapSubtitle", "Add items from a photo")}
      />

      {capturedImages.length > 0 && !isScanning && (
        <Pressable style={styles.scanButton} onPress={handleScanWithAI}>
          <ScanWithAiIcon width={20} height={18} color="#2a5a2a" />
          <Text style={styles.scanButtonText}>{t("addSheet.scanBtn", "Scan for ingredients")}</Text>
        </Pressable>
      )}

      {isScanning && (
        <View style={styles.scanningRow}>
          <ActivityIndicator size="small" color="#141B34" />
          <Text style={styles.scanningText}>{t("addSheet.spotting", "Spotting items…")}</Text>
        </View>
      )}

      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        reason="scan_limit"
      />

      {/* Category Items Modal */}
      <Modal
        visible={!!selectedCategory}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{t("addSheet.addCategory", { category: t(`categories.${selectedCategory?.key}`, selectedCategory?.label) })}</Text>

              {/* Quick Pick Items */}
              {!showCustomInput && (
                <>
                  <Text style={styles.pickLabel}>{t("addSheet.quickPick", "Quick pick:")}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.itemsScroll}
                    contentContainerStyle={styles.itemsScrollContent}
                  >
                    {selectedCategory?.items.map((item) => (
                      <Pressable
                        key={item}
                        style={[styles.itemChip, itemName === item && styles.itemChipSelected]}
                        onPress={() => handleItemSelect(item)}
                      >
                        <Text style={[styles.itemChipText, itemName === item && styles.itemChipTextSelected]}>
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Pressable style={styles.customBtn} onPress={() => setShowCustomInput(true)}>
                    <Text style={styles.customBtnText}>{t("addSheet.typeCustom", "+ Type custom item")}</Text>
                  </Pressable>
                </>
              )}

              {/* Custom Input */}
              {showCustomInput && (
                <>
                  <Text style={styles.pickLabel}>{t("addSheet.itemName", "Item name:")}</Text>
                  <TextInput
                    placeholder={t("addSheet.itemPlaceholder", "e.g. Almond Milk")}
                    placeholderTextColor="#B4B4B4"
                    style={styles.modalInput}
                    value={itemName}
                    onChangeText={setItemName}
                    autoFocus
                  />
                  <Pressable style={styles.backToQuickPick} onPress={() => setShowCustomInput(false)}>
                    <Text style={styles.backToQuickPickText}>{t("addSheet.backToQuickPick", "← Back to quick pick")}</Text>
                  </Pressable>
                </>
              )}

              {/* Quantity & Unit */}
              {itemName ? (
                <View style={styles.quantityRow}>
                  <View style={styles.quantityInputWrap}>
                    <Text style={styles.pickLabel}>{t("addSheet.qty", "Qty (optional)")}</Text>
                    <TextInput
                      placeholder="1"
                      placeholderTextColor="#B4B4B4"
                      style={styles.quantityInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.unitWrap}>
                    <Text style={styles.pickLabel}>{t("addSheet.unit", "Unit")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {COMMON_UNITS.map((u) => (
                        <Pressable
                          key={u || "none"}
                          style={[styles.unitChip, unit === u && styles.unitChipSelected]}
                          onPress={() => setUnit(u)}
                        >
                          <Text style={[styles.unitChipText, unit === u && styles.unitChipTextSelected]}>
                            {u || "—"}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ) : null}

              {/* Actions */}
              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancelBtn} onPress={closeModal}>
                  <Text style={styles.modalCancelText}>{t("addSheet.cancel", "Cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalAddBtn, (!itemName.trim() || isAdding) && styles.modalAddBtnDisabled]}
                  onPress={handleAddItem}
                  disabled={!itemName.trim() || isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator size="small" color="#2a5a2a" />
                  ) : (
                    <Text style={styles.modalAddText}>{t("addSheet.addBtn", "Add")}</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backPill: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#555555",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  headerSpacer: {
    width: 56,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 10,
  },
  card: {
    width: "31%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  cardImage: {
    width: 60,
    height: 60,
  },
  cardText: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "500",
    color: "#141B34",
    textTransform: "capitalize",
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2a5a2a",
  },
  scanningRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  scanningText: {
    fontSize: 14,
    color: "#6b6b6b",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 16,
  },
  pickLabel: {
    fontSize: 13,
    color: "#6b6b6b",
    marginBottom: 8,
    marginTop: 12,
  },
  itemsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  itemsScrollContent: {
    gap: 8,
    paddingRight: 40,
  },
  itemChip: {
    backgroundColor: "#F4F5F7",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  itemChipSelected: {
    backgroundColor: "#7FEF80",
  },
  itemChipText: {
    fontSize: 14,
    color: "#111111",
  },
  itemChipTextSelected: {
    color: "#2a5a2a",
    fontWeight: "600",
  },
  customBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  customBtnText: {
    fontSize: 14,
    color: "#385225",
    fontWeight: "500",
  },
  backToQuickPick: {
    marginTop: 8,
  },
  backToQuickPickText: {
    fontSize: 13,
    color: "#6b6b6b",
  },
  modalInput: {
    backgroundColor: "#F4F5F7",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#111111",
    fontSize: 15,
  },
  quantityRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  quantityInputWrap: {
    width: 80,
  },
  quantityInput: {
    backgroundColor: "#F4F5F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111111",
    fontSize: 15,
    textAlign: "center",
  },
  unitWrap: {
    flex: 1,
  },
  unitChip: {
    backgroundColor: "#F4F5F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 6,
  },
  unitChipSelected: {
    backgroundColor: "#7FEF80",
  },
  unitChipText: {
    fontSize: 13,
    color: "#111111",
  },
  unitChipTextSelected: {
    color: "#2a5a2a",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    color: "#6b6b6b",
    fontWeight: "500",
  },
  modalAddBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#7FEF80",
    alignItems: "center",
  },
  modalAddBtnDisabled: {
    opacity: 0.5,
  },
  modalAddText: {
    fontSize: 15,
    color: "#2a5a2a",
    fontWeight: "600",
  },
});
