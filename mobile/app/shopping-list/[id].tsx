import { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, TextInput, Modal, Alert, SectionList, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Plus, MoreVertical, Check, Circle, Trash2, ShoppingBasket, Search } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useShoppingListsStore, useShoppingStore } from "@/store";
import { ListIcon, DEFAULT_ICON, type IconName } from "@/components/ListIcon";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { ShoppingItem, IngredientCategory, CommonItem } from "@/types";

const CATEGORY_INFO: Record<IngredientCategory, { label: string; color: string; textColor: string }> = {
    produce: { label: 'Produce', color: '#E8E7E2', textColor: '#7D7A68' },
    proteins: { label: 'Proteins', color: '#F5E6D3', textColor: '#A8845A' },
    dairy: { label: 'Dairy', color: '#EDE7DF', textColor: '#8B8173' },
    bakery: { label: 'Bakery', color: '#FFF9F0', textColor: '#D4B896' },
    pantry: { label: 'Pantry', color: '#E3DDD3', textColor: '#C19A6B' },
    spices: { label: 'Spices', color: '#F5E6D3', textColor: '#C19A6B' },
    condiments: { label: 'Condiments', color: '#EDE7DF', textColor: '#A8845A' },
    beverages: { label: 'Beverages', color: '#E8E7E2', textColor: '#8B8173' },
    snacks: { label: 'Snacks', color: '#FFF9F0', textColor: '#D4B896' },
    frozen: { label: 'Frozen', color: '#E3DDD3', textColor: '#9D9A88' },
    household: { label: 'Household', color: '#EDE7DF', textColor: '#8B8173' },
    other: { label: 'Other', color: '#EDE7DF', textColor: '#8B8173' },
};

function ShoppingItemRow({ item, onToggle, onDelete }: {
    item: ShoppingItem;
    onToggle: () => void;
    onDelete: () => void;
}) {
    return (
        <Pressable
            onPress={onToggle}
            className="flex-row items-center py-3 px-4 border-b active:opacity-90"
            style={{
                borderBottomColor: colors.stone[200],
                opacity: item.isChecked ? 0.6 : 1
            }}
        >
            {/* Checkbox */}
            <View className="mr-3">
                {item.isChecked ? (
                    <View
                        className="w-6 h-6 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.sage[200] }}
                    >
                        <Check size={14} color="white" strokeWidth={3} />
                    </View>
                ) : (
                    <Circle size={24} color={colors.stone[300]} strokeWidth={2} />
                )}
            </View>

            {/* Item Info */}
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
                </Text>
                {(item.quantity || item.unit) && (
                    <Text
                        style={{
                            color: colors.text.tertiary,
                            fontFamily: 'Inter',
                            fontSize: 13,
                            marginTop: 2
                        }}
                    >
                        {item.quantity} {item.unit}
                    </Text>
                )}
                {item.recipeName && (
                    <Text
                        style={{
                            color: colors.text.muted,
                            fontFamily: 'Inter',
                            fontSize: 11,
                            marginTop: 2
                        }}
                    >
                        from {item.recipeName}
                    </Text>
                )}
            </View>

            {/* Delete Button */}
            <Pressable
                onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="p-2 -mr-2"
            >
                <Trash2 size={16} color={colors.text.muted} />
            </Pressable>
        </Pressable>
    );
}

export default function ShoppingListDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { lists } = useShoppingListsStore();
    const { commonItems, loadCommonItems, searchCommonItems, incrementItemUsage } = useShoppingListsStore();
    const { items, loadItemsByList, toggleItem, deleteItem, clearChecked, getCategoriesWithItems, getCheckedItems, addItem } = useShoppingStore();

    const [showAddModal, setShowAddModal] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showConfirmAdd, setShowConfirmAdd] = useState(false);
    const [selectedCommonItem, setSelectedCommonItem] = useState<CommonItem | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<CommonItem[]>([]);
    const [newItemName, setNewItemName] = useState("");
    const [newItemQuantity, setNewItemQuantity] = useState("");
    const [newItemUnit, setNewItemUnit] = useState("");

    const list = lists.find(l => l.id === id);
    const categoriesWithItems = getCategoriesWithItems(id);
    const checkedItems = getCheckedItems(id);

    useEffect(() => {
        if (id) {
            loadItemsByList(id);
            loadCommonItems();
        }
    }, [id]);

    // Search common items as user types
    useEffect(() => {
        const search = async () => {
            if (searchQuery.trim().length > 0) {
                const results = await searchCommonItems(searchQuery);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        };
        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleSelectCommonItem = (commonItem: CommonItem) => {
        setSelectedCommonItem(commonItem);
        setNewItemQuantity(commonItem.defaultQuantity?.toString() || "");
        setNewItemUnit(commonItem.defaultUnit || "");
        setShowConfirmAdd(true);
        setShowQuickAdd(false);
        setShowAddModal(false);
    };

    const handleConfirmAddItem = async () => {
        if (!selectedCommonItem) return;

        await addItem({
            listId: id,
            name: selectedCommonItem.name,
            category: selectedCommonItem.category,
            quantity: newItemQuantity ? parseFloat(newItemQuantity) : undefined,
            unit: newItemUnit.trim() || undefined,
            isChecked: false,
        });
        await incrementItemUsage(selectedCommonItem.id);

        // Reset
        setSelectedCommonItem(null);
        setNewItemQuantity("");
        setNewItemUnit("");
        setShowConfirmAdd(false);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleAddCustomItem = async () => {
        if (!newItemName.trim()) return;

        await addItem({
            listId: id,
            name: newItemName.trim(),
            category: 'other',
            quantity: newItemQuantity ? parseFloat(newItemQuantity) : undefined,
            unit: newItemUnit.trim() || undefined,
            isChecked: false,
        });

        setNewItemName("");
        setNewItemQuantity("");
        setNewItemUnit("");
        setShowAddModal(false);
    };

    const handleClearChecked = () => {
        if (checkedItems.length === 0) return;

        Alert.alert(
            "Clear Checked Items",
            `Remove ${checkedItems.length} checked item${checkedItems.length !== 1 ? 's' : ''}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: () => clearChecked(id) },
            ]
        );
    };

    const handleQuickAddCategory = (category: IngredientCategory) => {
        setSelectedCategory(category);
        setShowQuickAdd(true);
    };

    const categoryItems = selectedCategory
        ? commonItems.filter(item => item.category === selectedCategory)
        : [];

    if (!list) {
        return (
            <SafeAreaView className="flex-1 bg-stone-50 items-center justify-center">
                <Text style={{ fontFamily: 'Inter', color: colors.text.muted }}>List not found</Text>
            </SafeAreaView>
        );
    }

    const totalItems = categoriesWithItems.reduce((sum, cat) => sum + cat.items.length, 0) + checkedItems.length;

    return (
        <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
            <View className="flex-1">
                {/* Header */}
                <View className="px-6 py-5 border-b" style={{ borderBottomColor: colors.stone[200] }}>
                    <View className="flex-row items-center justify-between mb-2">
                        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                            <ArrowLeft size={24} color={colors.text.primary} />
                        </Pressable>
                        <Pressable className="p-2 -mr-2">
                            <MoreVertical size={24} color={colors.text.muted} />
                        </Pressable>
                    </View>

                    <View className="flex-row items-center">
                        <ListIcon
                            name={(list.icon as IconName) || DEFAULT_ICON}
                            size={28}
                            color={colors.honey[400]}
                            strokeWidth={1.5}
                            withBackground
                            backgroundColor={colors.honey[50]}
                        />
                        <View className="flex-1" style={{ marginLeft: 12 }}>
                            <Text
                                style={{
                                    fontFamily: 'Cormorant Garamond',
                                    fontSize: 28,
                                    fontWeight: '500',
                                    color: colors.text.primary
                                }}
                            >
                                {list.name}
                            </Text>
                            <Text
                                style={{
                                    fontFamily: 'Inter',
                                    fontSize: 13,
                                    color: colors.text.muted,
                                    marginTop: 2
                                }}
                            >
                                {totalItems} item{totalItems !== 1 ? 's' : ''} • {checkedItems.length} checked
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Quick Add Categories */}
                <View className="px-6 py-4">
                    <Text
                        style={{
                            fontFamily: 'Inter',
                            fontSize: 11,
                            fontWeight: '600',
                            color: colors.text.muted,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 12
                        }}
                    >
                        Quick Add
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                        {Object.entries(CATEGORY_INFO).filter(([key]) => key !== 'other').map(([key, info]) => (
                            <Pressable
                                key={key}
                                onPress={() => handleQuickAddCategory(key as IngredientCategory)}
                                className="mr-2 px-4 py-3 rounded-xl items-center active:opacity-80"
                                style={{ backgroundColor: info.color }}
                            >
                                <CategoryIcon category={key as IngredientCategory} size={20} color={info.textColor} strokeWidth={1.5} />
                                <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '500', color: info.textColor, marginTop: 6 }}>
                                    {info.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Add Item Button */}
                <View className="px-6 pb-4">
                    <Pressable
                        onPress={() => setShowAddModal(true)}
                        className="bg-stone-100 border-2 border-dashed rounded-2xl p-4 flex-row items-center justify-center active:opacity-80"
                        style={{ borderColor: colors.stone[300] }}
                    >
                        <Plus size={20} color={colors.honey[400]} strokeWidth={2} />
                        <Text
                            style={{
                                fontFamily: 'Inter',
                                fontSize: 15,
                                fontWeight: '500',
                                color: colors.honey[400],
                                marginLeft: 8
                            }}
                        >
                            Add Custom Item
                        </Text>
                    </Pressable>
                </View>

                {/* Items by Category */}
                {categoriesWithItems.length === 0 && checkedItems.length === 0 ? (
                    <View className="flex-1 items-center justify-center pb-24 px-6">
                        <View
                            className="w-20 h-20 rounded-full items-center justify-center mb-4"
                            style={{ backgroundColor: colors.honey[50] }}
                        >
                            <ShoppingBasket size={32} color={colors.honey[400]} strokeWidth={1.5} />
                        </View>
                        <Text
                            style={{
                                fontFamily: 'Cormorant Garamond',
                                fontSize: 24,
                                color: colors.text.primary,
                                textAlign: 'center',
                                marginBottom: 8
                            }}
                        >
                            Your list is empty
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'Inter',
                                fontSize: 15,
                                color: colors.text.tertiary,
                                textAlign: 'center'
                            }}
                        >
                            Tap a category above to quickly add items
                        </Text>
                    </View>
                ) : (
                    <SectionList
                        sections={categoriesWithItems.map(cat => ({
                            title: cat.category,
                            data: cat.items,
                        }))}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <ShoppingItemRow
                                item={item}
                                onToggle={() => toggleItem(item.id)}
                                onDelete={() => deleteItem(item.id)}
                            />
                        )}
                        renderSectionHeader={({ section }) => {
                            const info = CATEGORY_INFO[section.title as IngredientCategory];
                            return (
                                <View
                                    className="px-6 py-3 flex-row items-center border-b"
                                    style={{
                                        backgroundColor: info.color,
                                        borderBottomColor: colors.stone[200]
                                    }}
                                >
                                    <CategoryIcon category={section.title as IngredientCategory} size={20} color={info.textColor} strokeWidth={1.5} />
                                    <Text style={{ marginLeft: 8 }}></Text>
                                    <Text
                                        style={{
                                            fontFamily: 'Cormorant Garamond',
                                            fontSize: 20,
                                            fontWeight: '500',
                                            color: colors.text.primary,
                                            flex: 1
                                        }}
                                    >
                                        {info.label}
                                    </Text>
                                    <Text
                                        style={{
                                            fontFamily: 'Inter',
                                            fontSize: 13,
                                            color: colors.text.muted
                                        }}
                                    >
                                        {section.data.length}
                                    </Text>
                                </View>
                            );
                        }}
                        stickySectionHeadersEnabled={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListFooterComponent={
                            checkedItems.length > 0 ? (
                                <View className="px-6 py-4">
                                    <Pressable
                                        onPress={handleClearChecked}
                                        className="py-3 rounded-xl items-center border"
                                        style={{
                                            backgroundColor: colors.stone[100],
                                            borderColor: colors.stone[200]
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: colors.text.muted,
                                                fontFamily: 'Inter',
                                                fontWeight: '500',
                                                fontSize: 14
                                            }}
                                        >
                                            Clear {checkedItems.length} checked item{checkedItems.length !== 1 ? 's' : ''}
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : null
                        }
                    />
                )}

                {/* Add Custom Item Modal */}
                <Modal visible={showAddModal} animationType="slide" transparent>
                    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10">
                            <View className="flex-row items-center justify-between mb-6">
                                <Text
                                    style={{
                                        color: colors.text.primary,
                                        fontFamily: 'Cormorant Garamond',
                                        fontSize: 24,
                                        fontWeight: '500'
                                    }}
                                >
                                    Add Item
                                </Text>
                                <Pressable onPress={() => { setShowAddModal(false); setSearchQuery(""); setSearchResults([]); }} className="p-2 -mr-2">
                                    <Text style={{ fontSize: 24, color: colors.text.muted }}>×</Text>
                                </Pressable>
                            </View>

                            {/* Search Input with Autocomplete */}
                            <View className="mb-3">
                                <View className="flex-row items-center bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4">
                                    <Search size={18} color={colors.text.muted} />
                                    <TextInput
                                        className="flex-1 ml-3"
                                        placeholder="Search or type item name..."
                                        placeholderTextColor={colors.text.muted}
                                        value={searchQuery || newItemName}
                                        onChangeText={(text) => {
                                            setSearchQuery(text);
                                            setNewItemName(text);
                                        }}
                                        style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
                                        autoFocus
                                    />
                                </View>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <View className="mt-2 bg-white border border-stone-200 rounded-2xl overflow-hidden max-h-48">
                                        <ScrollView>
                                            {searchResults.map((item) => (
                                                <Pressable
                                                    key={item.id}
                                                    onPress={() => handleSelectCommonItem(item)}
                                                    className="px-4 py-3 border-b active:bg-stone-50"
                                                    style={{ borderBottomColor: colors.stone[200] }}
                                                >
                                                    <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.text.primary }}>
                                                        {item.name}
                                                    </Text>
                                                    <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
                                                        {item.defaultQuantity} {item.defaultUnit} • {CATEGORY_INFO[item.category].label}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            <View className="flex-row gap-3 mb-5">
                                <TextInput
                                    className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 flex-1"
                                    placeholder="Quantity"
                                    placeholderTextColor={colors.text.muted}
                                    value={newItemQuantity}
                                    onChangeText={setNewItemQuantity}
                                    keyboardType="decimal-pad"
                                    style={{ fontSize: 15, color: colors.text.primary, fontFamily: 'Inter' }}
                                />
                                <TextInput
                                    className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 flex-1"
                                    placeholder="Unit (kg, L, pcs)"
                                    placeholderTextColor={colors.text.muted}
                                    value={newItemUnit}
                                    onChangeText={setNewItemUnit}
                                    style={{ fontSize: 15, color: colors.text.primary, fontFamily: 'Inter' }}
                                />
                            </View>

                            <Pressable
                                onPress={handleAddCustomItem}
                                disabled={!newItemName.trim()}
                                className="py-4 rounded-2xl items-center"
                                style={{
                                    backgroundColor: newItemName.trim() ? colors.honey[400] : colors.stone[200],
                                }}
                            >
                                <Text
                                    style={{
                                        color: newItemName.trim() ? 'white' : colors.text.muted,
                                        fontFamily: 'Inter',
                                        fontWeight: '600',
                                        fontSize: 16
                                    }}
                                >
                                    Add to List
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                {/* Quick Add Category Sheet */}
                <Modal visible={showQuickAdd} animationType="slide" transparent>
                    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10 max-h-96">
                            <View className="flex-row items-center justify-between mb-6">
                                <View className="flex-row items-center">
                                    {selectedCategory && (
                                        <>
                                            <View style={{ marginRight: 12 }}>
                                                <CategoryIcon category={selectedCategory} size={24} color={CATEGORY_INFO[selectedCategory].textColor} strokeWidth={1.5} />
                                            </View>
                                            <Text
                                                style={{
                                                    color: colors.text.primary,
                                                    fontFamily: 'Cormorant Garamond',
                                                    fontSize: 24,
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {CATEGORY_INFO[selectedCategory].label}
                                            </Text>
                                        </>
                                    )}
                                </View>
                                <Pressable onPress={() => setShowQuickAdd(false)} className="p-2 -mr-2">
                                    <Text style={{ fontSize: 24, color: colors.text.muted }}>×</Text>
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {categoryItems.map((item) => (
                                    <Pressable
                                        key={item.id}
                                        onPress={() => {
                                            handleSelectCommonItem(item);
                                        }}
                                        className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 mb-2 active:opacity-80"
                                    >
                                        <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: colors.text.primary }}>
                                            {item.name}
                                        </Text>
                                        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.tertiary, marginTop: 2 }}>
                                            {item.defaultQuantity} {item.defaultUnit}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Confirm Add Item Modal */}
                <Modal visible={showConfirmAdd} animationType="slide" transparent>
                    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10">
                            <View className="flex-row items-center justify-between mb-6">
                                <Text
                                    style={{
                                        color: colors.text.primary,
                                        fontFamily: 'Cormorant Garamond',
                                        fontSize: 24,
                                        fontWeight: '500'
                                    }}
                                >
                                    Confirm Item
                                </Text>
                                <Pressable onPress={() => { setShowConfirmAdd(false); setSelectedCommonItem(null); }} className="p-2 -mr-2">
                                    <Text style={{ fontSize: 24, color: colors.text.muted }}>×</Text>
                                </Pressable>
                            </View>

                            {selectedCommonItem && (
                                <>
                                    {/* Item Name */}
                                    <View className="mb-5">
                                        <Text
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: 13,
                                                fontWeight: '600',
                                                color: colors.text.secondary,
                                                marginBottom: 8,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5
                                            }}
                                        >
                                            Item
                                        </Text>
                                        <View className="bg-stone-100 border border-stone-200 rounded-2xl px-5 py-4">
                                            <Text style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter', fontWeight: '500' }}>
                                                {selectedCommonItem.name}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: colors.text.tertiary, fontFamily: 'Inter', marginTop: 2 }}>
                                                {CATEGORY_INFO[selectedCommonItem.category].label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Quantity & Unit */}
                                    <View className="mb-5">
                                        <Text
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: 13,
                                                fontWeight: '600',
                                                color: colors.text.secondary,
                                                marginBottom: 8,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5
                                            }}
                                        >
                                            Adjust Quantity
                                        </Text>
                                        <View className="flex-row gap-3">
                                            <TextInput
                                                className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 flex-1"
                                                placeholder="Quantity"
                                                placeholderTextColor={colors.text.muted}
                                                value={newItemQuantity}
                                                onChangeText={setNewItemQuantity}
                                                keyboardType="decimal-pad"
                                                style={{ fontSize: 15, color: colors.text.primary, fontFamily: 'Inter' }}
                                            />
                                            <TextInput
                                                className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-4 flex-1"
                                                placeholder="Unit (kg, L, pcs)"
                                                placeholderTextColor={colors.text.muted}
                                                value={newItemUnit}
                                                onChangeText={setNewItemUnit}
                                                style={{ fontSize: 15, color: colors.text.primary, fontFamily: 'Inter' }}
                                            />
                                        </View>
                                    </View>

                                    {/* Add Button */}
                                    <Pressable
                                        onPress={handleConfirmAddItem}
                                        className="py-4 rounded-2xl items-center active:opacity-90"
                                        style={{
                                            backgroundColor: colors.honey[400],
                                            shadowColor: colors.honey[400],
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.25,
                                            shadowRadius: 12,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: 'white',
                                                fontFamily: 'Inter',
                                                fontWeight: '600',
                                                fontSize: 16
                                            }}
                                        >
                                            Add to List
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
