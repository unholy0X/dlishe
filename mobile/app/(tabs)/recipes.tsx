import { useState } from "react";
import { View, Text, Pressable, ImageBackground, FlatList, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Plus, BookOpen, Search, Clock, Heart, ChefHat } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useRecipeStore } from "@/store";
import type { Recipe } from "@/types";

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { toggleFavorite } = useRecipeStore();
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <Pressable
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      className="bg-stone-100 border border-stone-200 rounded-xl p-4 mb-3 active:opacity-90"
      style={{
        shadowColor: colors.text.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3">
          <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: '500' }} numberOfLines={2}>
            {recipe.title}
          </Text>
          {recipe.description && (
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 13, marginTop: 4 }} numberOfLines={2}>
              {recipe.description}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => toggleFavorite(recipe.id)}
          className="p-2 -mr-2 -mt-1"
        >
          <Heart
            size={20}
            color={recipe.isFavorite ? colors.honey[400] : colors.text.muted}
            fill={recipe.isFavorite ? colors.honey[400] : "transparent"}
          />
        </Pressable>
      </View>

      <View className="flex-row items-center mt-3 gap-4">
        {totalTime > 0 && (
          <View className="flex-row items-center">
            <Clock size={14} color={colors.text.muted} />
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 12, marginLeft: 4 }}>
              {totalTime} min
            </Text>
          </View>
        )}
        {recipe.difficulty && (
          <View className="flex-row items-center">
            <ChefHat size={14} color={colors.text.muted} />
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 12, marginLeft: 4, textTransform: 'capitalize' }}>
              {recipe.difficulty}
            </Text>
          </View>
        )}
        {recipe.servings && (
          <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 12 }}>
            {recipe.servings} servings
          </Text>
        )}
      </View>

      {recipe.cookedCount > 0 && (
        <View className="mt-2 px-2 py-1 bg-honey-100 rounded-full self-start">
          <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontSize: 11, fontWeight: '500' }}>
            Cooked {recipe.cookedCount}x
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function RecipesScreen() {
  const { recipes } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecipes = searchQuery
    ? recipes.filter((r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recipes;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
      <View className="flex-1">
        {/* Header with Search & Add */}
        <View className="flex-row items-center justify-between py-5 px-6">
          <View>
            <Text className="text-3xl mb-1" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '400' }}>
              My Recipes
            </Text>
            <Text className="text-sm" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>
              {recipes.length === 0 ? 'Your collection awaits' : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} saved`}
            </Text>
          </View>
          <Link href="/recipe/add" asChild>
            <Pressable
              className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
              style={{
                backgroundColor: colors.honey[400],
                shadowColor: colors.honey[400],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              <Plus size={20} color="white" strokeWidth={2} />
            </Pressable>
          </Link>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 mb-4 mx-6">
          <Search size={20} color={colors.text.muted} />
          <TextInput
            className="flex-1 ml-3"
            placeholder="Search your recipes..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
          />
        </View>

        {recipes.length === 0 ? (
          /* Empty State */
          <View className="flex-1 items-center justify-center pb-24 px-6">
            <ImageBackground
              source={require('../../assets/backgrounds/boheme01.png')}
              style={{ width: '100%', alignItems: 'center', paddingVertical: 48, borderRadius: 20, overflow: 'hidden' }}
              imageStyle={{ opacity: 0.08, borderRadius: 20 }}
            >
              <View className="w-24 h-24 bg-honey-100 rounded-full items-center justify-center mb-6 border-2" style={{ borderColor: colors.honey[200] }}>
                <BookOpen size={40} color={colors.honey[400]} strokeWidth={1.5} />
              </View>

              <Text className="text-2xl text-center mb-3" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '400' }}>
                Your Recipe Garden
              </Text>
              <Text className="text-center mb-8 px-8" style={{ color: colors.text.tertiary, fontFamily: 'Inter', fontSize: 15, lineHeight: 24 }}>
                Every great meal begins with a single recipe.{"\n"}
                Start your collection today.
              </Text>

              <Link href="/recipe/add" asChild>
                <Pressable
                  className="px-8 py-4 rounded-xl flex-row items-center active:opacity-90"
                  style={{
                    backgroundColor: colors.honey[400],
                    shadowColor: colors.honey[400],
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                  }}
                >
                  <Text className="text-white text-base" style={{ fontFamily: 'Inter', fontWeight: '600' }}>
                    Add Your First Recipe
                  </Text>
                </Pressable>
              </Link>

              <View className="mt-10 items-center">
                <Text className="text-sm mb-3" style={{ color: colors.text.disabled, fontFamily: 'Inter' }}>Supported platforms</Text>
                <Text className="text-xs" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>
                  TikTok · Instagram · YouTube · Web
                </Text>
              </View>
            </ImageBackground>
          </View>
        ) : (
          /* Recipe List */
          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <RecipeCard recipe={item} />}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 15 }}>
                  No recipes found for "{searchQuery}"
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
