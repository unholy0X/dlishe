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
    LayoutAnimation,
    UIManager,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import BottomSheetModal from "../components/BottomSheetModal";
import { useShoppingStore } from "../store";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Category display info
const CATEGORY_INFO = {
    dairy: { emoji: "🥛", label: "Dairy" },
    produce: { emoji: "🥬", label: "Produce" },
    proteins: { emoji: "🍖", label: "Proteins" },
    bakery: { emoji: "🍞", label: "Bakery" },
    spices: { emoji: "🌿", label: "Spices" },
    pantry: { emoji: "🥫", label: "Pantry" },
    beverages: { emoji: "🥤", label: "Beverages" },
    condiments: { emoji: "🫙", label: "Condiments" },
    snacks: { emoji: "🍿", label: "Snacks" },
    frozen: { emoji: "🧊", label: "Frozen" },
    household: { emoji: "🧹", label: "Household" },
    other: { emoji: "📦", label: "Other" },
};

const COMMON_UNITS = ["", "g", "kg", "ml", "L", "pcs", "lb", "oz", "bunch", "can"];

const CategoryFolder = ({ category, items, isExpanded, onToggle, onToggleItem, onDeleteItem }) => {
    const info = CATEGORY_INFO[category] || CATEGORY_INFO.other;
    const checkedCount = items.filter((i) => i.isChecked).length;
    const allChecked = items.length > 0 && checkedCount === items.length;

    return (
        <View style={styles.folder}>
            <Pressable style={styles.folderHeader} onPress={onToggle}>
                <View style={styles.folderEmoji}>
                    <Text style={styles.folderEmojiText}>{info.emoji}</Text>
                </View>
                <View style={styles.folderInfo}>
                    <Text style={[styles.folderTitle, allChecked && styles.folderTitleDone]}>
                        {info.label}
                    </Text>
                    <Text style={styles.folderCount}>
                        {checkedCount}/{items.length} checked
                    </Text>
                </View>
                <View style={styles.expandIcon}>
                    <Text style={styles.expandIconText}>{isExpanded ? "−" : "+"}</Text>
                </View>
            </Pressable>

            {isExpanded && (
                <View style={styles.itemsList}>
                    {items.map((item) => (
                        <Pressable
                            key={item.id}
                            style={[styles.itemRow, item.isChecked && styles.itemRowChecked]}
                            onPress={() => onToggleItem(item.id)}
                            onLongPress={() => onDeleteItem(item.id)}
                        >
                            <View style={[styles.checkbox, item.isChecked && styles.checkboxChecked]}>
                                {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={[styles.itemName, item.isChecked && styles.itemNameChecked]}>
                                    {item.name}
                                </Text>
                                {item.quantity && (
                                    <Text style={[styles.itemQty, item.isChecked && styles.itemQtyChecked]}>
                                        {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                                    </Text>
                                )}
                            </View>
                            {item.recipeName && (
                                <Text style={styles.recipeTag}>{item.recipeName}</Text>
                            )}
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
};

const AddItemSheet = ({ onClose, onAdd, listId }) => {
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) return;
        setIsAdding(true);
        try {
            await onAdd(name.trim(), quantity ? parseFloat(quantity) : undefined, unit || undefined);
            setName("");
            setQuantity("");
            setUnit("");
        } catch {
            Alert.alert("Error", "Failed to add item");
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Add Item</Text>

            <Text style={styles.inputLabel}>Item name</Text>
            <TextInput
                style={styles.textInput}
                placeholder="e.g. Milk"
                placeholderTextColor="#B4B4B4"
                value={name}
                onChangeText={setName}
                autoFocus
            />

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
        </View>
    );
};

export default function ShoppingListScreen() {
    const router = useRouter();
    const { id: listId } = useLocalSearchParams();
    const { getToken } = useAuth();

    const [isSheetOpen, setSheetOpen] = useState(false);
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
            loadListDetails({ getToken, listId });
        }
        return () => clearActiveList();
    }, [listId]);

    const onRefresh = useCallback(() => {
        if (listId) {
            loadListDetails({ getToken, listId });
        }
    }, [getToken, listId]);

    const handleToggleItem = useCallback(
        async (itemId) => {
            await toggleChecked({ getToken, listId, itemId });
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
                    onPress: () => removeItem({ getToken, listId, itemId }),
                },
            ]);
        },
        [getToken, listId]
    );

    const handleAddItem = useCallback(
        async (name, quantity, unit) => {
            await addItem({ getToken, listId, name, quantity, unit });
        },
        [getToken, listId]
    );

    const handleComplete = useCallback(() => {
        Alert.alert("Complete List", "Mark all items as done and archive?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Complete",
                onPress: async () => {
                    await completeActiveList({ getToken, listId });
                    router.back();
                },
            },
        ]);
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
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()}>
                        <BlurView intensity={100} tint="light" style={styles.backPill}>
                            <Text style={styles.backText}>← Back</Text>
                        </BlurView>
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                            {activeList?.name || "Shopping List"}
                        </Text>
                        <Text style={styles.listProgress}>
                            {checkedItems} of {totalItems} checked
                        </Text>
                    </View>
                    {totalItems > 0 && (
                        <Pressable style={styles.completeBtn} onPress={handleComplete}>
                            <Text style={styles.completeBtnText}>✓</Text>
                        </Pressable>
                    )}
                </View>

                {/* Content */}
                {error ? (
                    <View style={styles.centered}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : totalItems === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📝</Text>
                        <Text style={styles.emptyTitle}>This list is empty</Text>
                        <Text style={styles.emptySubtitle}>Add items to get started</Text>
                        <Pressable style={styles.emptyBtn} onPress={() => setSheetOpen(true)}>
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

                {/* FAB */}
                <Pressable style={styles.fab} onPress={() => setSheetOpen(true)}>
                    <Text style={styles.fabText}>+</Text>
                </Pressable>
            </SafeAreaView>

            <BottomSheetModal visible={isSheetOpen} onClose={() => setSheetOpen(false)}>
                <AddItemSheet
                    onClose={() => setSheetOpen(false)}
                    onAdd={handleAddItem}
                    listId={listId}
                />
            </BottomSheetModal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#f4f5f7",
    },
    safeArea: {
        flex: 1,
        paddingTop: 12,
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
    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    backPill: {
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.08)",
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    backText: {
        fontSize: 13,
        color: "#555555",
        fontWeight: "500",
    },
    headerCenter: {
        flex: 1,
        marginLeft: 12,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111111",
    },
    listProgress: {
        fontSize: 13,
        color: "#6b6b6b",
        marginTop: 2,
    },
    completeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#7FEF80",
        alignItems: "center",
        justifyContent: "center",
    },
    completeBtnText: {
        fontSize: 18,
        color: "#2a5a2a",
        fontWeight: "700",
    },
    // Content
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 12,
    },
    // Folder
    folder: {
        backgroundColor: "#ffffff",
        borderRadius: 20,
        overflow: "hidden",
    },
    folderHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
    },
    folderEmoji: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#F4F5F7",
        alignItems: "center",
        justifyContent: "center",
    },
    folderEmojiText: {
        fontSize: 20,
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
    folderCount: {
        fontSize: 12,
        color: "#B4B4B4",
        marginTop: 2,
    },
    expandIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F4F5F7",
        alignItems: "center",
        justifyContent: "center",
    },
    expandIconText: {
        fontSize: 16,
        color: "#6b6b6b",
        fontWeight: "600",
    },
    // Items
    itemsList: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#F4F5F7",
    },
    itemRowChecked: {
        opacity: 0.6,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#E0E0E0",
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxChecked: {
        backgroundColor: "#7FEF80",
        borderColor: "#7FEF80",
    },
    checkmark: {
        fontSize: 12,
        color: "#2a5a2a",
        fontWeight: "700",
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 15,
        fontWeight: "500",
        color: "#111111",
    },
    itemNameChecked: {
        textDecorationLine: "line-through",
        color: "#B4B4B4",
    },
    itemQty: {
        fontSize: 13,
        color: "#6b6b6b",
        marginTop: 2,
    },
    itemQtyChecked: {
        color: "#C0C0C0",
    },
    recipeTag: {
        fontSize: 11,
        color: "#7FEF80",
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        overflow: "hidden",
        marginLeft: 8,
    },
    // Empty state
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#111111",
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#6b6b6b",
    },
    emptyBtn: {
        marginTop: 24,
        backgroundColor: "#2a5a2a",
        borderRadius: 999,
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    emptyBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#ffffff",
    },
    // FAB
    fab: {
        position: "absolute",
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#2a5a2a",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
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
    inputLabel: {
        fontSize: 13,
        color: "#6b6b6b",
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
        backgroundColor: "#7FEF80",
        alignItems: "center",
    },
    addBtnDisabled: {
        opacity: 0.5,
    },
    addBtnText: {
        fontSize: 15,
        color: "#2a5a2a",
        fontWeight: "600",
    },
});
