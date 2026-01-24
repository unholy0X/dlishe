import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, Clock, Users, ChefHat, ShoppingCart, Trash2, Check } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useRecipeStore, useShoppingStore } from "@/store";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipeById, toggleFavorite, markAsCooked, deleteRecipe } = useRecipeStore();
  const { addRecipeIngredients } = useShoppingStore();

  const recipe = getRecipeById(id);

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
        <View className="flex-1 items-center justify-center px-4">
          <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 24 }}>
            Recipe not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  const handleAddToShoppingList = async () => {
    await addRecipeIngredients(recipe);
    Alert.alert("Added!", "Ingredients added to your shopping list.");
  };

  const handleMarkAsCooked = async () => {
    await markAsCooked(recipe.id);
    Alert.alert("Delicious!", "Recipe marked as cooked.");
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Recipe",
      "Are you sure you want to delete this recipe?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteRecipe(recipe.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View className="flex-row justify-between items-start">
            <Text className="flex-1 pr-4" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 32, fontWeight: '400' }}>
              {recipe.title}
            </Text>
            <Pressable
              onPress={() => toggleFavorite(recipe.id)}
              className="p-2 -mr-2"
            >
              <Heart
                size={28}
                color={recipe.isFavorite ? colors.honey[400] : colors.text.muted}
                fill={recipe.isFavorite ? colors.honey[400] : "transparent"}
              />
            </Pressable>
          </View>

          {recipe.description && (
            <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 15, marginTop: 8, lineHeight: 22 }}>
              {recipe.description}
            </Text>
          )}

          {/* Meta Info */}
          <View className="flex-row flex-wrap gap-4 mt-5">
            {totalTime > 0 && (
              <View className="flex-row items-center bg-stone-100 px-3 py-2 rounded-lg">
                <Clock size={16} color={colors.text.muted} />
                <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 13, marginLeft: 6 }}>
                  {totalTime} min
                </Text>
              </View>
            )}
            {recipe.servings && (
              <View className="flex-row items-center bg-stone-100 px-3 py-2 rounded-lg">
                <Users size={16} color={colors.text.muted} />
                <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 13, marginLeft: 6 }}>
                  {recipe.servings} servings
                </Text>
              </View>
            )}
            {recipe.difficulty && (
              <View className="flex-row items-center bg-stone-100 px-3 py-2 rounded-lg">
                <ChefHat size={16} color={colors.text.muted} />
                <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 13, marginLeft: 6, textTransform: 'capitalize' }}>
                  {recipe.difficulty}
                </Text>
              </View>
            )}
          </View>

          {recipe.cookedCount > 0 && (
            <View className="mt-4 px-3 py-2 bg-honey-100 rounded-lg self-start">
              <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontSize: 13, fontWeight: '500' }}>
                Cooked {recipe.cookedCount} time{recipe.cookedCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="px-6 flex-row gap-3 mb-6">
          <Pressable
            onPress={handleAddToShoppingList}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-honey-100 active:opacity-80"
          >
            <ShoppingCart size={18} color={colors.honey[400]} />
            <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
              Add to List
            </Text>
          </Pressable>
          <Pressable
            onPress={handleMarkAsCooked}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl active:opacity-80"
            style={{ backgroundColor: colors.honey[400] }}
          >
            <Check size={18} color="white" />
            <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
              I Made This
            </Text>
          </Pressable>
        </View>

        {/* Ingredients */}
        <View className="px-6 mb-6">
          <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500', marginBottom: 16 }}>
            Ingredients
          </Text>
          <View className="bg-stone-100 border border-stone-200 rounded-xl p-4">
            {recipe.ingredients.map((ing, idx) => (
              <View
                key={ing.id}
                className="flex-row items-center py-3"
                style={{ borderBottomWidth: idx < recipe.ingredients.length - 1 ? 1 : 0, borderBottomColor: colors.stone[200] }}
              >
                <View className="w-2 h-2 rounded-full mr-4" style={{ backgroundColor: colors.honey[400] }} />
                <Text className="flex-1" style={{ color: colors.text.primary, fontFamily: 'Inter', fontSize: 15 }}>
                  {ing.amount && ing.unit
                    ? `${ing.amount} ${ing.unit} ${ing.name}`
                    : ing.amount
                    ? `${ing.amount} ${ing.name}`
                    : ing.name}
                </Text>
                {ing.isOptional && (
                  <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 12, fontStyle: 'italic' }}>
                    optional
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Instructions */}
        <View className="px-6 mb-6">
          <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500', marginBottom: 16 }}>
            Instructions
          </Text>
          {recipe.instructions.map((inst) => (
            <View key={inst.id} className="flex-row mb-4">
              <View className="w-8 h-8 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.honey[100] }}>
                <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontWeight: '600', fontSize: 14 }}>
                  {inst.stepNumber}
                </Text>
              </View>
              <Text className="flex-1 pt-1" style={{ color: colors.text.primary, fontFamily: 'Inter', fontSize: 15, lineHeight: 24 }}>
                {inst.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {recipe.notes && (
          <View className="px-6 mb-6">
            <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500', marginBottom: 12 }}>
              Notes
            </Text>
            <View className="bg-honey-50 border border-honey-100 rounded-xl p-4">
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 14, lineHeight: 22, fontStyle: 'italic' }}>
                {recipe.notes}
              </Text>
            </View>
          </View>
        )}

        {/* Delete Button */}
        <View className="px-6 pb-10">
          <Pressable
            onPress={handleDelete}
            className="flex-row items-center justify-center py-3 rounded-xl active:opacity-80"
            style={{ backgroundColor: colors.stone[100], borderWidth: 1, borderColor: colors.stone[200] }}
          >
            <Trash2 size={18} color={colors.text.muted} />
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontWeight: '500', fontSize: 14, marginLeft: 8 }}>
              Delete Recipe
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
