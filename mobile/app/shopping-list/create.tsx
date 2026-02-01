import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useShoppingListsStore } from "@/store";
import { ListIcon, AVAILABLE_ICONS, DEFAULT_ICON, type IconName } from "@/components/ListIcon";

const TEMPLATES = [
    { id: 'weekly', name: 'Weekly Groceries', icon: 'cart' as IconName, description: 'Regular shopping essentials' },
    { id: 'breakfast', name: 'Breakfast', icon: 'coffee' as IconName, description: 'Morning meal ingredients' },
    { id: 'lunch', name: 'Lunch', icon: 'sandwich' as IconName, description: 'Midday meal items' },
    { id: 'dinner', name: 'Dinner', icon: 'utensils' as IconName, description: 'Evening meal ingredients' },
    { id: 'party', name: 'Dinner Party', icon: 'party' as IconName, description: 'Special occasion items' },
    { id: 'restock', name: 'Pantry Restock', icon: 'package' as IconName, description: 'Bulk pantry items' },
];

export default function CreateShoppingListScreen() {
    const { createList } = useShoppingListsStore();
    const [listName, setListName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<IconName>(DEFAULT_ICON);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateList = async () => {
        if (!listName.trim()) {
            Alert.alert('Name Required', 'Please enter a name for your shopping list.');
            return;
        }

        setIsCreating(true);
        try {
            const newList = await createList({
                name: listName.trim(),
                description: description.trim() || undefined,
                icon: selectedIcon,
                isTemplate: false,
                isArchived: false,
            });

            router.back();
            // Navigate to the new list
            setTimeout(() => {
                router.push(`/shopping-list/${newList.id}`);
            }, 100);
        } catch (error) {
            Alert.alert('Error', 'Failed to create shopping list. Please try again.');
            setIsCreating(false);
        }
    };

    const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
        setListName(template.name);
        setDescription(template.description);
        setSelectedIcon(template.icon);
    };

    return (
        <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
            <View className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-5 border-b" style={{ borderBottomColor: colors.stone[200] }}>
                    <Text
                        style={{
                            color: colors.text.primary,
                            fontFamily: 'Cormorant Garamond',
                            fontSize: 28,
                            fontWeight: '500'
                        }}
                    >
                        Create Shopping List
                    </Text>
                    <Pressable onPress={() => router.back()} className="p-2 -mr-2">
                        <X size={24} color={colors.text.muted} />
                    </Pressable>
                </View>

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="px-6 py-6">
                        {/* List Name */}
                        <View className="mb-6">
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
                                List Name
                            </Text>
                            <TextInput
                                className="bg-stone-100 border border-stone-200 rounded-2xl px-5 py-4"
                                placeholder="e.g., Weekly Groceries"
                                placeholderTextColor={colors.text.muted}
                                value={listName}
                                onChangeText={setListName}
                                style={{
                                    fontSize: 16,
                                    color: colors.text.primary,
                                    fontFamily: 'Inter'
                                }}
                                autoFocus
                            />
                        </View>

                        {/* Description (Optional) */}
                        <View className="mb-6">
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
                                Description (Optional)
                            </Text>
                            <TextInput
                                className="bg-stone-100 border border-stone-200 rounded-2xl px-5 py-4"
                                placeholder="Add a short description..."
                                placeholderTextColor={colors.text.muted}
                                value={description}
                                onChangeText={setDescription}
                                style={{
                                    fontSize: 15,
                                    color: colors.text.primary,
                                    fontFamily: 'Inter'
                                }}
                                multiline
                                numberOfLines={2}
                            />
                        </View>

                        {/* Icon Selection */}
                        <View className="mb-6">
                            <Text
                                style={{
                                    fontFamily: 'Inter',
                                    fontSize: 13,
                                    fontWeight: '600',
                                    color: colors.text.secondary,
                                    marginBottom: 12,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}
                            >
                                Choose an Icon
                            </Text>
                            <View className="flex-row flex-wrap gap-3">
                                {AVAILABLE_ICONS.map((iconName) => (
                                    <Pressable
                                        key={iconName}
                                        onPress={() => setSelectedIcon(iconName)}
                                        className="w-16 h-16 rounded-2xl items-center justify-center border-2 active:opacity-80"
                                        style={{
                                            backgroundColor: selectedIcon === iconName ? colors.honey[100] : colors.stone[100],
                                            borderColor: selectedIcon === iconName ? colors.honey[400] : colors.stone[200],
                                        }}
                                    >
                                        <ListIcon
                                            name={iconName}
                                            size={24}
                                            color={selectedIcon === iconName ? colors.honey[400] : colors.text.muted}
                                            strokeWidth={1.5}
                                        />
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Templates */}
                        <View className="mb-8">
                            <Text
                                style={{
                                    fontFamily: 'Inter',
                                    fontSize: 13,
                                    fontWeight: '600',
                                    color: colors.text.secondary,
                                    marginBottom: 12,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}
                            >
                                Or Start from Template
                            </Text>

                            {TEMPLATES.map((template) => (
                                <Pressable
                                    key={template.id}
                                    onPress={() => handleTemplateSelect(template)}
                                    className="bg-stone-100 border border-stone-200 rounded-2xl p-4 mb-3 flex-row items-center active:opacity-90"
                                >
                                    <View
                                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                                        style={{ backgroundColor: colors.honey[50] }}
                                    >
                                        <ListIcon name={template.icon} size={24} color={colors.honey[400]} />
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: 16,
                                                fontWeight: '600',
                                                color: colors.text.primary
                                            }}
                                        >
                                            {template.name}
                                        </Text>
                                        <Text
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: 13,
                                                color: colors.text.tertiary,
                                                marginTop: 2
                                            }}
                                        >
                                            {template.description}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </ScrollView>

                {/* Create Button */}
                <View className="px-6 py-4 border-t" style={{ borderTopColor: colors.stone[200] }}>
                    <Pressable
                        onPress={handleCreateList}
                        disabled={!listName.trim() || isCreating}
                        className="py-4 rounded-2xl items-center active:opacity-90"
                        style={{
                            backgroundColor: listName.trim() ? colors.honey[400] : colors.stone[300],
                            shadowColor: listName.trim() ? colors.honey[400] : 'transparent',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.25,
                            shadowRadius: 12,
                        }}
                    >
                        <Text
                            style={{
                                color: listName.trim() ? 'white' : colors.text.muted,
                                fontFamily: 'Inter',
                                fontWeight: '600',
                                fontSize: 16
                            }}
                        >
                            {isCreating ? 'Creating...' : 'Create List'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
