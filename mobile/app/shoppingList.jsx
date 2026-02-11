import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Pressable,
    Alert,
    TextInput,
    Image,
    LayoutAnimation,
    UIManager,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheetModal from "../components/BottomSheetModal";
import CheckIcon from "../components/icons/CheckIcon";
import ShoppingIcon from "../components/icons/ShoppingIcon";
import { useShoppingStore } from "../store";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Category PNG images (same map as pantry.jsx)
const CATEGORY_IMAGES = {
    dairy: require("../assets/Dairy.png"),
    produce: require("../assets/produce.png"),
    proteins: require("../assets/proteins.png"),
    bakery: require("../assets/bakery.png"),
    spices: require("../assets/spices.png"),
    pantry: require("../assets/pantry.png"),
    beverages: require("../assets/beverages.png"),
    condiments: require("../assets/beverages1.png"),
    snacks: require("../assets/snacks.png"),
    frozen: require("../assets/frozen.png"),
    household: require("../assets/household.png"),
    other: require("../assets/pantry.png"),
};

const CATEGORY_LABELS = {
    dairy: "Dairy",
    produce: "Produce",
    proteins: "Proteins",
    bakery: "Bakery",
    spices: "Spices",
    pantry: "Pantry",
    beverages: "Beverages",
    condiments: "Condiments",
    snacks: "Snacks",
    frozen: "Frozen",
    household: "Household",
    other: "Other",
};

// Categories with quick-pick items (same as AddToPantrySheetContent)
const CATEGORIES = [
    {
        label: "Dairy", key: "dairy", image: require("../assets/Dairy.png"),
        items: ["Milk", "Eggs", "Butter", "Cheese", "Yogurt", "Cream", "Sour Cream", "Cream Cheese"],
    },
    {
        label: "Produce", key: "produce", image: require("../assets/produce.png"),
        items: ["Tomatoes", "Onions", "Garlic", "Potatoes", "Carrots", "Lettuce", "Bananas", "Apples", "Lemons", "Limes"],
    },
    {
        label: "Proteins", key: "proteins", image: require("../assets/proteins.png"),
        items: ["Chicken Breast", "Ground Beef", "Salmon", "Shrimp", "Bacon", "Sausage", "Tofu", "Turkey"],
    },
    {
        label: "Bakery", key: "bakery", image: require("../assets/bakery.png"),
        items: ["Bread", "Flour", "Sugar", "Baking Powder", "Yeast", "Tortillas", "Croissants"],
    },
    {
        label: "Spices", key: "spices", image: require("../assets/spices.png"),
        items: ["Salt", "Black Pepper", "Paprika", "Cumin", "Cinnamon", "Oregano", "Basil", "Thyme", "Garlic Powder"],
    },
    {
        label: "Pantry", key: "pantry", image: require("../assets/pantry.png"),
        items: ["Pasta", "Rice", "Olive Oil", "Canned Tomatoes", "Beans", "Oats", "Cereal", "Peanut Butter"],
    },
    {
        label: "Beverages", key: "beverages", image: require("../assets/beverages.png"),
        items: ["Coffee", "Tea", "Juice", "Milk", "Water", "Soda", "Wine", "Beer"],
    },
    {
        label: "Condiments", key: "condiments", image: require("../assets/beverages1.png"),
        items: ["Ketchup", "Mustard", "Mayonnaise", "Soy Sauce", "Hot Sauce", "BBQ Sauce", "Honey", "Maple Syrup"],
    },
    {
        label: "Snacks", key: "snacks", image: require("../assets/snacks.png"),
        items: ["Chips", "Crackers", "Nuts", "Popcorn", "Cookies", "Pretzels", "Granola Bars"],
    },
    {
        label: "Frozen", key: "frozen", image: require("../assets/frozen.png"),
        items: ["Ice Cream", "Frozen Pizza", "Frozen Vegetables", "Frozen Fruit", "Frozen Meals"],
    },
    {
        label: "Household", key: "household", image: require("../assets/household.png"),
        items: ["Paper Towels", "Trash Bags", "Dish Soap", "Laundry Detergent", "Sponges", "Aluminum Foil"],
    },
];

const COMMON_UNITS = ["", "g", "kg", "ml", "L", "pcs", "lb", "oz", "bunch", "can"];

// Subtle tinted backgrounds per category (same spirit as shopping.jsx CARD_COLORS)
const CATEGORY_TINTS = {
    dairy: { bg: "#EBF3FD", accent: "#DAE8F9" },
    produce: { bg: "#F0F8E8", accent: "#E2F0D4" },
    proteins: { bg: "#FDEEEE", accent: "#F9DEDE" },
    bakery: { bg: "#FDF2E8", accent: "#F9E4D0" },
    spices: { bg: "#FDF2E8", accent: "#F9E4D0" },
    pantry: { bg: "#F2EEFD", accent: "#E6DFFA" },
    beverages: { bg: "#ECF6F3", accent: "#DBEeE8" },
    condiments: { bg: "#FDF2E8", accent: "#F9E4D0" },
    snacks: { bg: "#F2EEFD", accent: "#E6DFFA" },
    frozen: { bg: "#EBF3FD", accent: "#DAE8F9" },
    household: { bg: "#ECF6F3", accent: "#DBEeE8" },
    other: { bg: "#F4F5F7", accent: "#E8E8E8" },
};

// ─── CategoryFolder ─────────────────────────────────────────────────────────
const CategoryFolder = ({ category, items, isExpanded, onToggle, onToggleItem, onDeleteItem }) => {
    const image = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.other;
    const label = CATEGORY_LABELS[category] || "Other";
    const tint = CATEGORY_TINTS[category] || CATEGORY_TINTS.other;
    const checkedCount = items.filter((i) => i.isChecked).length;
    const allChecked = items.length > 0 && checkedCount === items.length;
    const uncheckedItems = items.filter((i) => !i.isChecked);
    const previewItems = uncheckedItems.slice(0, 4);
    const progress = items.length > 0 ? checkedCount / items.length : 0;

    return (
        <View style={[styles.folder, { backgroundColor: isExpanded ? "#ffffff" : tint.bg }]}>
            {/* Accent circle */}
            <View style={[styles.folderAccent, { backgroundColor: tint.accent }]} />

            <Pressable style={styles.folderHeader} onPress={onToggle}>
                <View style={styles.folderImageWrap}>
                    <Image source={image} style={styles.folderImage} resizeMode="contain" />
                </View>
                <View style={styles.folderInfo}>
                    <Text style={[styles.folderTitle, allChecked && styles.folderTitleDone]}>
                        {label}
                    </Text>
                    <View style={styles.folderMeta}>
                        <Text style={styles.folderCount}>
                            {checkedCount}/{items.length}
                        </Text>
                        <View style={styles.folderProgressBar}>
                            <View style={[styles.folderProgressFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>
                </View>
                <View style={[styles.expandIcon, isExpanded && styles.expandIconActive]}>
                    <Text style={[styles.expandIconText, isExpanded && styles.expandIconTextActive]}>
                        {isExpanded ? "−" : "+"}
                    </Text>
                </View>
            </Pressable>

            {/* Preview chips when collapsed */}
            {!isExpanded && uncheckedItems.length > 0 && (
                <View style={styles.previewRow}>
                    {previewItems.map((item) => (
                        <View key={item.id} style={styles.previewChip}>
                            <Text style={styles.previewChipText} numberOfLines={1}>{item.name}</Text>
                        </View>
                    ))}
                    {uncheckedItems.length > 4 && (
                        <View style={styles.previewMore}>
                            <Text style={styles.previewMoreText}>+{uncheckedItems.length - 4}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Expanded items — same chip layout as pantry */}
            {isExpanded && (
                <View style={styles.expandedGrid}>
                    {items.map((item) => (
                        <Pressable
                            key={item.id}
                            style={[styles.itemChip, item.isChecked && styles.itemChipChecked]}
                            onPress={() => onToggleItem(item.id)}
                            onLongPress={() => onDeleteItem(item.id)}
                            delayLongPress={400}
                        >
                            <View style={[styles.checkbox, item.isChecked && styles.checkboxChecked]}>
                                {item.isChecked && <CheckIcon width={10} height={10} color="#ffffff" />}
                            </View>
                            <View style={styles.itemContent}>
                                <Text
                                    style={[styles.itemName, item.isChecked && styles.itemNameChecked]}
                                    numberOfLines={1}
                                >
                                    {item.name}
                                </Text>
                                {item.quantity && (
                                    <Text style={[styles.itemQty, item.isChecked && styles.itemQtyChecked]}>
                                        {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                                    </Text>
                                )}
                            </View>
                            <Pressable
                                style={styles.itemDelete}
                                onPress={() => onDeleteItem(item.id)}
                                hitSlop={10}
                            >
                                <Text style={styles.itemDeleteText}>✕</Text>
                            </Pressable>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
};

// ─── AddItemSheet ────────────────────────────────────────────────────────────
const AddItemSheet = ({ onClose, onAdd }) => {
    const [mode, setMode] = useState("quick"); // "quick" | "browse"
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showCustomInput, setShowCustomInput] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) return;
        setIsAdding(true);
        try {
            const cat = selectedCategory ? selectedCategory.key : undefined;
            await onAdd(name.trim(), quantity ? parseFloat(quantity) : undefined, unit || undefined, cat);
            setName("");
            setQuantity("");
            setUnit("");
            setSelectedCategory(null);
            setShowCustomInput(false);
        } catch {
            Alert.alert("Error", "Failed to add item");
        } finally {
            setIsAdding(false);
        }
    };

    const handleCategoryTap = (category) => {
        setSelectedCategory(category);
        setName("");
        setQuantity("");
        setUnit("");
        setShowCustomInput(false);
    };

    const handleQuickPickItem = (itemName) => {
        setName(itemName);
    };

    const resetBrowse = () => {
        setSelectedCategory(null);
        setName("");
        setQuantity("");
        setUnit("");
        setShowCustomInput(false);
    };

    const showQtyInputs = name.trim().length > 0;

    return (
        <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Add Item</Text>

            {/* Mode toggle */}
            <View style={styles.modeToggle}>
                <Pressable
                    style={[styles.modeTab, mode === "quick" && styles.modeTabActive]}
                    onPress={() => { setMode("quick"); resetBrowse(); }}
                >
                    <Text style={[styles.modeTabText, mode === "quick" && styles.modeTabTextActive]}>Quick Add</Text>
                </Pressable>
                <Pressable
                    style={[styles.modeTab, mode === "browse" && styles.modeTabActive]}
                    onPress={() => { setMode("browse"); setName(""); setQuantity(""); setUnit(""); }}
                >
                    <Text style={[styles.modeTabText, mode === "browse" && styles.modeTabTextActive]}>Browse</Text>
                </Pressable>
            </View>

            {/* Quick Add mode */}
            {mode === "quick" && (
                <>
                    <Text style={styles.inputLabel}>Item name</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Milk"
                        placeholderTextColor="#B4B4B4"
                        value={name}
                        onChangeText={setName}
                        autoFocus
                    />

                    {showQtyInputs && (
                        <View style={styles.qtyRow}>
                            <View style={styles.qtyInputWrap}>
                                <Text style={styles.inputLabel}>Quantity</Text>
                                <TextInput
                                    style={styles.qtyInput}
                                    placeholder="1"
                                    placeholderTextColor="#B4B4B4"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <View style={styles.unitWrap}>
                                <Text style={styles.inputLabel}>Unit</Text>
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
                    )}

                    <View style={styles.sheetButtons}>
                        <Pressable style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.addBtn, (!name.trim() || isAdding) && styles.addBtnDisabled]}
                            onPress={handleAdd}
                            disabled={!name.trim() || isAdding}
                        >
                            {isAdding ? (
                                <ActivityIndicator size="small" color="#2a5a2a" />
                            ) : (
                                <Text style={styles.addBtnText}>Add</Text>
                            )}
                        </Pressable>
                    </View>
                </>
            )}

            {/* Browse mode */}
            {mode === "browse" && !selectedCategory && (
                <>
                    <Text style={styles.browseSectionTitle}>Browse by category</Text>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((cat) => (
                            <Pressable
                                key={cat.key}
                                style={styles.categoryCard}
                                onPress={() => handleCategoryTap(cat)}
                            >
                                <Image source={cat.image} style={styles.categoryCardImage} resizeMode="contain" />
                                <Text style={styles.categoryCardText}>{cat.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </>
            )}

            {/* Browse mode — category selected */}
            {mode === "browse" && selectedCategory && (
                <>
                    <Pressable onPress={resetBrowse} style={styles.browseBackBtn}>
                        <Text style={styles.browseBackText}>← All categories</Text>
                    </Pressable>

                    <Text style={styles.browseCategoryTitle}>{selectedCategory.label}</Text>

                    {/* Quick pick chips */}
                    {!showCustomInput && (
                        <>
                            <Text style={styles.inputLabel}>Quick pick:</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.quickPickScroll}
                                contentContainerStyle={styles.quickPickScrollContent}
                            >
                                {selectedCategory.items.map((item) => (
                                    <Pressable
                                        key={item}
                                        style={[styles.quickPickChip, name === item && styles.quickPickChipSelected]}
                                        onPress={() => handleQuickPickItem(item)}
                                    >
                                        <Text style={[styles.quickPickChipText, name === item && styles.quickPickChipTextSelected]}>
                                            {item}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            <Pressable style={styles.customInputLink} onPress={() => setShowCustomInput(true)}>
                                <Text style={styles.customInputLinkText}>+ Type custom item</Text>
                            </Pressable>
                        </>
                    )}

                    {/* Custom input */}
                    {showCustomInput && (
                        <>
                            <Text style={styles.inputLabel}>Item name:</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Almond Milk"
                                placeholderTextColor="#B4B4B4"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />
                            <Pressable onPress={() => setShowCustomInput(false)} style={styles.browseBackBtn}>
                                <Text style={styles.browseBackText}>← Back to quick pick</Text>
                            </Pressable>
                        </>
                    )}

                    {/* Qty + unit when item selected */}
                    {showQtyInputs && (
                        <View style={styles.qtyRow}>
                            <View style={styles.qtyInputWrap}>
                                <Text style={styles.inputLabel}>Qty (optional)</Text>
                                <TextInput
                                    style={styles.qtyInput}
                                    placeholder="1"
                                    placeholderTextColor="#B4B4B4"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <View style={styles.unitWrap}>
                                <Text style={styles.inputLabel}>Unit</Text>
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
                    )}

                    <View style={styles.sheetButtons}>
                        <Pressable style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.addBtn, (!name.trim() || isAdding) && styles.addBtnDisabled]}
                            onPress={handleAdd}
                            disabled={!name.trim() || isAdding}
                        >
                            {isAdding ? (
                                <ActivityIndicator size="small" color="#2a5a2a" />
                            ) : (
                                <Text style={styles.addBtnText}>Add</Text>
                            )}
                        </Pressable>
                    </View>
                </>
            )}
        </View>
    );
};

// ─── StockPantrySheet ────────────────────────────────────────────────────────
const StockPantrySheet = ({ items, onStock, onDismiss }) => {
    const [isStocking, setIsStocking] = useState(false);

    const categoryBreakdown = useMemo(() => {
        const groups = {};
        (items || []).forEach((item) => {
            const cat = item.category || "other";
            if (!groups[cat]) groups[cat] = { count: 0 };
            groups[cat].count += 1;
        });
        return Object.entries(groups).map(([key, val]) => ({
            key,
            label: CATEGORY_LABELS[key] || "Other",
            image: CATEGORY_IMAGES[key] || CATEGORY_IMAGES.other,
            count: val.count,
        }));
    }, [items]);

    const totalItems = items?.length || 0;

    const handleStock = async () => {
        setIsStocking(true);
        try {
            await onStock();
        } catch {
            Alert.alert("Error", "Failed to stock pantry");
            setIsStocking(false);
        }
    };

    return (
        <View style={styles.stockSheet}>
            <Text style={styles.stockTitle}>Stock Your Pantry</Text>
            <Text style={styles.stockSubtitle}>
                {totalItems} item{totalItems !== 1 ? "s" : ""} will be added to your pantry
            </Text>

            {/* Category breakdown horizontal scroll */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.stockCategoriesScroll}
                contentContainerStyle={styles.stockCategoriesContent}
            >
                {categoryBreakdown.map((cat) => (
                    <View key={cat.key} style={styles.stockCategoryCard}>
                        <Image source={cat.image} style={styles.stockCategoryImage} resizeMode="contain" />
                        <Text style={styles.stockCategoryLabel} numberOfLines={1}>{cat.label}</Text>
                        <Text style={styles.stockCategoryCount}>{cat.count}</Text>
                    </View>
                ))}
            </ScrollView>

            <Pressable
                style={[styles.stockButton, isStocking && styles.stockButtonDisabled]}
                onPress={handleStock}
                disabled={isStocking}
            >
                {isStocking ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <Text style={styles.stockButtonText}>Stock Pantry</Text>
                )}
            </Pressable>

            <Pressable style={styles.stockDismiss} onPress={onDismiss} disabled={isStocking}>
                <Text style={styles.stockDismissText}>Not yet</Text>
            </Pressable>
        </View>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ShoppingListScreen() {
    const router = useRouter();
    const { id: listId } = useLocalSearchParams();
    const { getToken } = useAuth();

    const [isAddSheetOpen, setAddSheetOpen] = useState(false);
    const [isStockSheetOpen, setStockSheetOpen] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState({});

    const {
        activeList,
        isLoadingDetails,
        error,
        loadListDetails,
        clearActiveList,
        addItem,
        removeItem,
        toggleChecked,
        completeActiveList,
    } = useShoppingStore();

    useEffect(() => {
        if (listId) {
            loadListDetails({ getToken, listId }).catch(() => {
                // Error state is set in the store; prevents unhandled rejection
            });
        }
        return () => clearActiveList();
    }, [listId]);

    const onRefresh = useCallback(() => {
        if (listId) {
            loadListDetails({ getToken, listId }).catch(() => {
                // Error state is set in the store
            });
        }
    }, [getToken, listId]);

    const handleToggleItem = useCallback(
        async (itemId) => {
            try {
                await toggleChecked({ getToken, listId, itemId });
            } catch (err) {
                Alert.alert("Error", err?.message || "Failed to update item");
            }
        },
        [getToken, listId]
    );

    const handleDeleteItem = useCallback(
        (itemId) => {
            Alert.alert("Delete Item", "Remove this item?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeItem({ getToken, listId, itemId });
                        } catch (err) {
                            Alert.alert("Error", err?.message || "Failed to remove item");
                        }
                    },
                },
            ]);
        },
        [getToken, listId]
    );

    const handleAddItem = useCallback(
        async (name, quantity, unit, category) => {
            await addItem({ getToken, listId, name, quantity, unit, category });
        },
        [getToken, listId]
    );

    const handleComplete = useCallback(() => {
        setStockSheetOpen(true);
    }, []);

    const handleStockPantry = useCallback(async () => {
        try {
            await completeActiveList({ getToken, listId });
            setStockSheetOpen(false);
            router.back();
        } catch (err) {
            Alert.alert("Error", err?.message || "Failed to complete list");
        }
    }, [getToken, listId]);

    const toggleCategory = useCallback((category) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    }, []);

    // Group items by category
    const groupedItems = useMemo(() => {
        const items = activeList?.items || [];
        const groups = {};
        items.forEach((item) => {
            const cat = item.category || "other";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });
        // Sort unchecked first within each category
        Object.keys(groups).forEach((cat) => {
            groups[cat].sort((a, b) => (a.isChecked === b.isChecked ? 0 : a.isChecked ? 1 : -1));
        });
        return groups;
    }, [activeList?.items]);

    const totalItems = activeList?.items?.length || 0;
    const checkedItems = activeList?.items?.filter((i) => i.isChecked).length || 0;

    const progress = totalItems > 0 ? checkedItems / totalItems : 0;
    const categoryCount = Object.keys(groupedItems).length;


    if (isLoadingDetails && !activeList) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.centered}>
                    <ActivityIndicator size="large" color="#385225" />
                    <Text style={styles.loadingText}>Loading list…</Text>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={["top"]}>
                {/* Header hero */}
                <View style={styles.headerHero}>
                    <View style={styles.headerAccent} />
                    <View style={styles.headerAccent2} />
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backPill}>
                            <Text style={styles.backText}>←</Text>
                        </Pressable>
                        <View style={styles.headerCenter}>
                            <Text style={styles.listTitle} numberOfLines={1}>
                                {activeList?.name || "Shopping List"}
                            </Text>
                        </View>
                        {totalItems > 0 && (
                            <Pressable style={styles.completeBtn} onPress={handleComplete}>
                                <CheckIcon width={16} height={16} color="#ffffff" />
                            </Pressable>
                        )}
                    </View>
                    {totalItems > 0 && (
                        <View style={styles.headerStats}>
                            <View style={styles.headerProgressRow}>
                                <Text style={styles.headerProgressLabel}>
                                    {checkedItems} of {totalItems} items
                                </Text>
                                <Text style={styles.headerProgressPercent}>
                                    {Math.round(progress * 100)}%
                                </Text>
                            </View>
                            <View style={styles.headerProgressBar}>
                                <View style={[styles.headerProgressFill, { width: `${progress * 100}%` }]} />
                            </View>
                            <Text style={styles.headerCategoryCount}>
                                {categoryCount} categor{categoryCount !== 1 ? "ies" : "y"}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Content */}
                {error ? (
                    <View style={styles.centered}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : totalItems === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <ShoppingIcon width={36} height={32} color="#385225" />
                        </View>
                        <Text style={styles.emptyTitle}>This list is empty</Text>
                        <Text style={styles.emptySubtitle}>Tap the button below to add your first item</Text>
                        <Pressable style={styles.emptyBtn} onPress={() => setAddSheetOpen(true)}>
                            <Text style={styles.emptyBtnText}>+ Add Item</Text>
                        </Pressable>
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoadingDetails}
                                onRefresh={onRefresh}
                                tintColor="#385225"
                            />
                        }
                    >
                        {Object.entries(groupedItems).map(([category, items]) => (
                            <CategoryFolder
                                key={category}
                                category={category}
                                items={items}
                                isExpanded={expandedCategories[category] !== false}
                                onToggle={() => toggleCategory(category)}
                                onToggleItem={handleToggleItem}
                                onDeleteItem={handleDeleteItem}
                            />
                        ))}
                    </ScrollView>
                )}

                {/* FAB with gradient */}
                <Pressable style={styles.fab} onPress={() => setAddSheetOpen(true)}>
                    <LinearGradient
                        colors={["#9EFF00", "#039274"]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.fabGradient}
                    />
                    <Text style={styles.fabText}>+</Text>
                </Pressable>
            </SafeAreaView>

            {/* Add Item Sheet */}
            <BottomSheetModal visible={isAddSheetOpen} onClose={() => setAddSheetOpen(false)}>
                <AddItemSheet
                    onClose={() => setAddSheetOpen(false)}
                    onAdd={handleAddItem}
                />
            </BottomSheetModal>

            {/* Stock Pantry Sheet */}
            <BottomSheetModal visible={isStockSheetOpen} onClose={() => setStockSheetOpen(false)}>
                <StockPantrySheet
                    items={activeList?.items}
                    onStock={handleStockPantry}
                    onDismiss={() => setStockSheetOpen(false)}
                />
            </BottomSheetModal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F4F5F7",
    },
    safeArea: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#6b6b6b",
    },
    errorText: {
        fontSize: 14,
        color: "#cc3b3b",
    },
    // Header hero
    headerHero: {
        backgroundColor: "#ffffff",
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 8,
        borderRadius: 24,
        padding: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    headerAccent: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        top: -50,
        right: -30,
        backgroundColor: "#E8F5E9",
        opacity: 0.5,
    },
    headerAccent2: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        top: -20,
        right: -10,
        backgroundColor: "#E8F5E9",
        opacity: 0.3,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    backPill: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F4F5F7",
        alignItems: "center",
        justifyContent: "center",
    },
    backText: {
        fontSize: 16,
        color: "#333333",
        fontWeight: "500",
    },
    headerCenter: {
        flex: 1,
        marginLeft: 12,
    },
    listTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111111",
        letterSpacing: -0.3,
    },
    completeBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#2a5a2a",
        alignItems: "center",
        justifyContent: "center",
    },
    headerStats: {
        marginTop: 16,
    },
    headerProgressRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    headerProgressLabel: {
        fontSize: 13,
        color: "#6b6b6b",
    },
    headerProgressPercent: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2a5a2a",
    },
    headerProgressBar: {
        height: 6,
        borderRadius: 3,
        backgroundColor: "#E8F5E9",
        overflow: "hidden",
    },
    headerProgressFill: {
        height: "100%",
        borderRadius: 3,
        backgroundColor: "#7FEF80",
    },
    headerCategoryCount: {
        fontSize: 12,
        color: "#B4B4B4",
        marginTop: 6,
    },
    // Content
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 100,
        gap: 10,
    },
    // Folder
    folder: {
        borderRadius: 20,
        padding: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    folderAccent: {
        position: "absolute",
        width: 70,
        height: 70,
        borderRadius: 35,
        top: -25,
        right: -15,
        opacity: 0.3,
    },
    folderHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    folderImageWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.7)",
        alignItems: "center",
        justifyContent: "center",
    },
    folderImage: {
        width: 40,
        height: 40,
    },
    folderInfo: {
        flex: 1,
        marginLeft: 12,
    },
    folderTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111111",
    },
    folderTitleDone: {
        color: "#B4B4B4",
    },
    folderMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        gap: 8,
    },
    folderCount: {
        fontSize: 12,
        color: "#999999",
        fontWeight: "500",
    },
    folderProgressBar: {
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: "rgba(0,0,0,0.06)",
        overflow: "hidden",
    },
    folderProgressFill: {
        height: "100%",
        borderRadius: 2,
        backgroundColor: "#7FEF80",
    },
    expandIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(0,0,0,0.04)",
        alignItems: "center",
        justifyContent: "center",
    },
    expandIconActive: {
        backgroundColor: "#E8F5E9",
    },
    expandIconText: {
        fontSize: 16,
        color: "#999999",
        fontWeight: "600",
    },
    expandIconTextActive: {
        color: "#2a5a2a",
    },
    // Preview chips
    previewRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 12,
        gap: 6,
    },
    previewChip: {
        backgroundColor: "rgba(255,255,255,0.8)",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        maxWidth: 100,
    },
    previewChipText: {
        fontSize: 12,
        color: "#6b6b6b",
    },
    previewMore: {
        backgroundColor: "rgba(56,82,37,0.08)",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    previewMoreText: {
        fontSize: 12,
        color: "#385225",
        fontWeight: "500",
    },
    // Expanded items — same chip layout as pantry
    expandedGrid: {
        marginTop: 14,
        gap: 8,
    },
    itemChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.6)",
        borderRadius: 12,
        paddingLeft: 12,
        paddingRight: 8,
        paddingVertical: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#EBEBEB",
    },
    itemChipChecked: {
        opacity: 0.5,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: "#D4D4D4",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    checkboxChecked: {
        backgroundColor: "#2a5a2a",
        borderColor: "#2a5a2a",
    },
    itemContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    itemName: {
        fontSize: 15,
        color: "#111111",
        fontWeight: "500",
        flexShrink: 1,
    },
    itemNameChecked: {
        textDecorationLine: "line-through",
        color: "#B4B4B4",
    },
    itemQty: {
        fontSize: 13,
        color: "#999999",
        marginLeft: 8,
    },
    itemQtyChecked: {
        color: "#C0C0C0",
    },
    itemDelete: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
    itemDeleteText: {
        fontSize: 12,
        color: "#C0C0C0",
        fontWeight: "600",
    },
    // Empty state
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
    },
    emptyIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "#E8F5E9",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#111111",
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#999999",
        textAlign: "center",
        lineHeight: 20,
    },
    emptyBtn: {
        marginTop: 24,
        backgroundColor: "#7FEF80",
        borderRadius: 999,
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    emptyBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#385225",
    },
    // FAB
    fab: {
        position: "absolute",
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#039274",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    fabGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 28,
    },
    fabText: {
        fontSize: 28,
        color: "#ffffff",
        fontWeight: "300",
    },
    // Sheet
    sheetContent: {
        paddingBottom: 20,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#111111",
        marginBottom: 16,
    },
    // Mode toggle
    modeToggle: {
        flexDirection: "row",
        backgroundColor: "#F0F0F0",
        borderRadius: 999,
        padding: 3,
        marginBottom: 16,
    },
    modeTab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: "center",
    },
    modeTabActive: {
        backgroundColor: "#ffffff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
    },
    modeTabText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#999999",
    },
    modeTabTextActive: {
        color: "#111111",
        fontWeight: "600",
    },
    inputLabel: {
        fontSize: 13,
        color: "#999999",
        marginBottom: 8,
        marginTop: 12,
    },
    textInput: {
        backgroundColor: "#F4F5F7",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: "#111111",
    },
    qtyRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    qtyInputWrap: {
        width: 80,
    },
    qtyInput: {
        backgroundColor: "#F4F5F7",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: "#111111",
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
        backgroundColor: "#2a5a2a",
    },
    unitChipText: {
        fontSize: 13,
        color: "#111111",
    },
    unitChipTextSelected: {
        color: "#ffffff",
        fontWeight: "600",
    },
    sheetButtons: {
        flexDirection: "row",
        gap: 10,
        marginTop: 24,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: "#F4F5F7",
        alignItems: "center",
    },
    cancelBtnText: {
        fontSize: 15,
        color: "#6b6b6b",
        fontWeight: "500",
    },
    addBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: "#2a5a2a",
        alignItems: "center",
    },
    addBtnDisabled: {
        opacity: 0.5,
    },
    addBtnText: {
        fontSize: 15,
        color: "#ffffff",
        fontWeight: "600",
    },
    // Browse mode
    browseSectionTitle: {
        fontSize: 14,
        fontWeight: "500",
        color: "#111111",
        marginBottom: 12,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 10,
        rowGap: 10,
    },
    categoryCard: {
        width: "31%",
        backgroundColor: "#F8F8F8",
        borderRadius: 20,
        paddingVertical: 12,
        alignItems: "center",
    },
    categoryCardImage: {
        width: 56,
        height: 56,
    },
    categoryCardText: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: "500",
        color: "#333333",
    },
    browseBackBtn: {
        marginBottom: 8,
    },
    browseBackText: {
        fontSize: 13,
        color: "#999999",
    },
    browseCategoryTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111111",
        marginBottom: 4,
    },
    quickPickScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    quickPickScrollContent: {
        gap: 8,
        paddingRight: 40,
    },
    quickPickChip: {
        backgroundColor: "#F4F5F7",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    quickPickChipSelected: {
        backgroundColor: "#2a5a2a",
    },
    quickPickChipText: {
        fontSize: 14,
        color: "#111111",
    },
    quickPickChipTextSelected: {
        color: "#ffffff",
        fontWeight: "600",
    },
    customInputLink: {
        marginTop: 12,
        paddingVertical: 10,
    },
    customInputLinkText: {
        fontSize: 14,
        color: "#2a5a2a",
        fontWeight: "500",
    },
    // Stock Pantry Sheet
    stockSheet: {
        alignItems: "center",
        paddingBottom: 20,
    },
    stockTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111111",
        marginBottom: 6,
    },
    stockSubtitle: {
        fontSize: 14,
        color: "#999999",
        marginBottom: 20,
    },
    stockCategoriesScroll: {
        marginHorizontal: -20,
        marginBottom: 24,
    },
    stockCategoriesContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    stockCategoryCard: {
        backgroundColor: "#F8F8F8",
        borderRadius: 18,
        padding: 14,
        alignItems: "center",
        width: 92,
    },
    stockCategoryImage: {
        width: 40,
        height: 40,
        marginBottom: 8,
    },
    stockCategoryLabel: {
        fontSize: 12,
        fontWeight: "500",
        color: "#333333",
        marginBottom: 2,
    },
    stockCategoryCount: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2a5a2a",
    },
    stockButton: {
        backgroundColor: "#2a5a2a",
        borderRadius: 999,
        paddingHorizontal: 40,
        paddingVertical: 16,
        alignItems: "center",
        width: "100%",
    },
    stockButtonDisabled: {
        opacity: 0.6,
    },
    stockButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#ffffff",
    },
    stockDismiss: {
        marginTop: 16,
        paddingVertical: 8,
    },
    stockDismissText: {
        fontSize: 14,
        color: "#999999",
    },
});
