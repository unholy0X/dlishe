import { useEffect } from "react";
import { View, Text, Pressable, ImageBackground, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ShoppingBasket, Plus, List } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useShoppingListsStore, useShoppingStore } from "@/store";
import { ListIcon, DEFAULT_ICON, type IconName } from "@/components/ListIcon";

export default function ShoppingScreen() {
  const { lists, loadLists, setActiveList, deleteList } = useShoppingListsStore();
  const { loadItemsByList, getItemsByList, getCheckedItems } = useShoppingStore();

  useEffect(() => {
    loadLists();
  }, []);

  const handleListPress = async (listId: string) => {
    setActiveList(listId);
    await loadItemsByList(listId);
    router.push(`/shopping-list/${listId}`);
  };

  const handleCreateList = () => {
    router.push('/shopping-list/create');
  };

  const handleViewAllLists = () => {
    router.push('/shopping-lists');
  };

  const handleDeleteList = (listId: string, listName: string) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${listName}"? All items will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteList(listId)
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
      <View className="flex-1">
        {/* Header */}
        <ImageBackground
          source={require('../../assets/backgrounds/boheme03.png')}
          style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}
          imageStyle={{ opacity: 0.08 }}
          resizeMode="cover"
        >
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
            Shopping
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
        </ImageBackground>

        {lists.length === 0 ? (
          /* Empty State */
          <View className="flex-1 items-center justify-center pb-24 px-6">
            <ImageBackground
              source={require('../../assets/backgrounds/boheme02.png')}
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
                onPress={handleCreateList}
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
          /* Quick Access to Lists */
          <View className="flex-1 px-6 pt-6">
            {/* Active/Recent Lists */}
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
                Your Lists
              </Text>

              {lists.slice(0, 3).map((list) => {
                const items = getItemsByList(list.id);
                const checkedItems = getCheckedItems(list.id);

                return (
                  <Pressable
                    key={list.id}
                    onPress={() => handleListPress(list.id)}
                    onLongPress={() => handleDeleteList(list.id, list.name)}
                    className="bg-stone-100 border border-stone-200 rounded-2xl p-5 mb-3 active:opacity-90"
                    style={{
                      shadowColor: colors.text.primary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <ListIcon
                          name={(list.icon as IconName) || DEFAULT_ICON}
                          size={24}
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
                              fontSize: 22,
                              fontWeight: '500'
                            }}
                            numberOfLines={1}
                          >
                            {list.name}
                          </Text>
                          <Text
                            style={{
                              color: colors.text.tertiary,
                              fontFamily: 'Inter',
                              fontSize: 13,
                              marginTop: 2
                            }}
                          >
                            {items.length} item{items.length !== 1 ? 's' : ''} • {checkedItems.length} checked
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <Pressable
                onPress={handleCreateList}
                className="bg-honey-400 rounded-2xl p-5 flex-row items-center justify-center active:opacity-90"
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
                  Create New List
                </Text>
              </Pressable>

              {lists.length > 3 && (
                <Pressable
                  onPress={handleViewAllLists}
                  className="bg-stone-100 border border-stone-200 rounded-2xl p-5 flex-row items-center justify-center active:opacity-90"
                >
                  <List size={20} color={colors.text.primary} strokeWidth={2} />
                  <Text
                    className="text-base ml-2"
                    style={{ fontFamily: 'Inter', fontWeight: '600', color: colors.text.primary }}
                  >
                    View All Lists
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
