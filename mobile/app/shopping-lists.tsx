import { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, ImageBackground, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Plus, ShoppingBasket, MoreVertical } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useShoppingListsStore, useShoppingStore } from "@/store";
import { ListIcon, DEFAULT_ICON, type IconName } from "@/components/ListIcon";
import type { ShoppingList } from "@/types";

function ShoppingListCard({ list, onPress, onEdit, onDelete }: {
    list: ShoppingList;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const { getItemsByList, getCheckedItems } = useShoppingStore();
    const items = getItemsByList(list.id);
    const checkedItems = getCheckedItems(list.id);
    const allChecked = items.length > 0 && items.length === checkedItems.length;

    return (
        <Pressable
            onPress={onPress}
            className="bg-stone-100 border border-stone-200 rounded-3xl p-6 mb-4 active:opacity-90"
            style={{
                shadowColor: colors.text.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            }}
        >
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
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
                                color: colors.text.primary,
                                fontFamily: 'Cormorant Garamond',
                                fontSize: 24,
                                fontWeight: '500'
                            }}
                            numberOfLines={1}
                        >
                            {list.name}
                        </Text>
                        {list.description && (
                            <Text
                                style={{
                                    color: colors.text.tertiary,
                                    fontFamily: 'Inter',
                                    fontSize: 13,
                                    marginTop: 2
                                }}
                                numberOfLines={1}
                            >
                                {list.description}
                            </Text>
                        )}
                    </View>
                </View>

                <Pressable
                    onPress={(e) => {
                        e.stopPropagation();
                        // Show action menu
                        Alert.alert(
                            list.name,
                            'Choose an action',
                            [
                                { text: 'Edit', onPress: onEdit },
                                { text: 'Delete', onPress: onDelete, style: 'destructive' },
                                { text: 'Cancel', style: 'cancel' },
                            ]
                        );
                    }}
                    className="p-2 -mr-2"
                >
                    <MoreVertical size={20} color={colors.text.muted} />
                </Pressable>
            </View>

            {/* Stats */}
            <View className="flex-row gap-4">
                <View className="flex-row items-center">
                    <View
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: allChecked ? colors.sage[200] : colors.honey[400],
                            marginRight: 6
                        }}
                    />
                    <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.tertiary }}>
                        {items.length} item{items.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                {checkedItems.length > 0 && (
                    <View className="flex-row items-center">
                        <View
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: colors.sage[200],
                                marginRight: 6
                            }}
                        />
                        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.text.tertiary }}>
                            {checkedItems.length} checked
                        </Text>
                    </View>
                )}
            </View>

            {allChecked && items.length > 0 && (
                <View className="mt-3 pt-3 border-t" style={{ borderTopColor: colors.stone[200] }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.sage[200], fontWeight: '500' }}>
                        ✓ All items checked
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

export default function ShoppingListsHomeScreen() {
    const { lists, loadLists, setActiveList, deleteList, isLoading } = useShoppingListsStore();
    const { loadItemsByList } = useShoppingStore();
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadLists();
    }, []);

    const handleListPress = async (list: ShoppingList) => {
        setActiveList(list.id);
        await loadItemsByList(list.id);
        router.push(`/shopping-list/${list.id}`);
    };

    const handleDeleteList = (list: ShoppingList) => {
        Alert.alert(
            'Delete List',
            `Are you sure you want to delete "${list.name}"? All items in this list will be removed.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteList(list.id)
                },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
            <View className="flex-1">
                {/* Header with Background */}
                <ImageBackground
                    source={require('../assets/backgrounds/boheme03.png')}
                    style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}
                    imageStyle={{ opacity: 0.08 }}
                    resizeMode="cover"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text
                                style={{
                                    fontFamily: 'Cormorant Garamond',
                                    fontSize: 40,
                                    lineHeight: 48,
                                    fontWeight: '300',
                                    letterSpacing: -0.5,
                                    color: colors.text.primary
                                }}
                            >
                                Shopping Lists
                            </Text>
                            <Text
                                style={{
                                    fontFamily: 'Inter',
                                    fontSize: 15,
                                    color: colors.text.muted,
                                    marginTop: 8
                                }}
                            >
                                {lists.length === 0 ? 'Create your first list' : `${lists.length} list${lists.length !== 1 ? 's' : ''}`}
                            </Text>
                        </View>

                        <Pressable
                            onPress={() => router.push('/shopping-list/create')}
                            className="w-14 h-14 rounded-2xl items-center justify-center active:opacity-80"
                            style={{
                                backgroundColor: colors.honey[400],
                                shadowColor: colors.honey[400],
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.25,
                                shadowRadius: 12,
                            }}
                        >
                            <Plus size={24} color="white" strokeWidth={2} />
                        </Pressable>
                    </View>
                </ImageBackground>

                {lists.length === 0 ? (
                    /* Empty State */
                    <View className="flex-1 items-center justify-center pb-24 px-6">
                        <ImageBackground
                            source={require('../assets/backgrounds/boheme02.png')}
                            style={{ width: '100%', alignItems: 'center', paddingVertical: 40 }}
                            imageStyle={{ opacity: 0.10 }}
                            resizeMode="cover"
                        >
                            <View
                                className="w-24 h-24 rounded-full items-center justify-center mb-6 border-2"
                                style={{
                                    backgroundColor: colors.honey[50],
                                    borderColor: colors.honey[200]
                                }}
                            >
                                <ShoppingBasket size={40} color={colors.honey[400]} strokeWidth={1.5} />
                            </View>

                            <Text
                                className="text-2xl text-center mb-3"
                                style={{
                                    color: colors.text.primary,
                                    fontFamily: 'Cormorant Garamond',
                                    fontWeight: '400'
                                }}
                            >
                                Organize Your Shopping
                            </Text>

                            <Text
                                className="text-center mb-8 px-8"
                                style={{
                                    color: colors.text.tertiary,
                                    fontFamily: 'Inter',
                                    fontSize: 15,
                                    lineHeight: 24
                                }}
                            >
                                Create separate lists for different occasions{"\n"}
                                Weekly groceries, dinner parties, or pantry restocks
                            </Text>

                            <Pressable
                                onPress={() => router.push('/shopping-list/create')}
                                className="px-8 py-4 rounded-2xl flex-row items-center active:opacity-90"
                                style={{
                                    backgroundColor: colors.honey[400],
                                    shadowColor: colors.honey[400],
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 12,
                                }}
                            >
                                <Plus size={20} color="white" strokeWidth={2} />
                                <Text
                                    className="text-white text-base ml-2"
                                    style={{ fontFamily: 'Inter', fontWeight: '600' }}
                                >
                                    Create Your First List
                                </Text>
                            </Pressable>
                        </ImageBackground>
                    </View>
                ) : (
                    /* Lists */
                    <FlatList
                        data={lists}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <ShoppingListCard
                                list={item}
                                onPress={() => handleListPress(item)}
                                onEdit={() => router.push(`/shopping-list/edit/${item.id}`)}
                                onDelete={() => handleDeleteList(item)}
                            />
                        )}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
