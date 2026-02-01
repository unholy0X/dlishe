import { View, Text, ScrollView, Pressable, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Plus, Sparkles, Heart, BookOpen, Clock, ChefHat } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useRecipeStore, usePantryStore } from "@/store";
import type { Recipe } from "@/types";

function RecentRecipeCard({ recipe }: { recipe: Recipe }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <Pressable
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      className="bg-stone-100 border border-stone-200 rounded-xl p-4 mr-4 active:opacity-90"
      style={{ width: 200 }}
    >
      <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: '500' }} numberOfLines={2}>
        {recipe.title}
      </Text>
      <View className="flex-row items-center mt-2 gap-3">
        {totalTime > 0 && (
          <View className="flex-row items-center">
            <Clock size={12} color={colors.text.muted} />
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 11, marginLeft: 3 }}>
              {totalTime}m
            </Text>
          </View>
        )}
        {recipe.difficulty && (
          <View className="flex-row items-center">
            <ChefHat size={12} color={colors.text.muted} />
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 11, marginLeft: 3, textTransform: 'capitalize' }}>
              {recipe.difficulty}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { recipes } = useRecipeStore();
  const { items: pantryItems } = usePantryStore();

  const recentRecipes = recipes.slice(0, 5);
  const totalCooked = recipes.reduce((sum, r) => sum + r.cookedCount, 0);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Welcome Section with Background */}
        <View className="px-6 pt-6 pb-8">
          <ImageBackground
            source={require('../../assets/backgrounds/boheme01.png')}
            style={{ borderRadius: 32, overflow: 'hidden' }}
            imageStyle={{ opacity: 0.25, borderRadius: 32 }}
            resizeMode="cover"
          >
            <View style={{
              backgroundColor: 'rgba(255, 249, 240, 0.75)',
              borderRadius: 32,
              padding: 32,
              borderWidth: 1,
              borderColor: colors.stone[200]
            }}>
              <Text className="text-sm mb-2" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>Welcome home</Text>
              <Text className="text-4xl mb-3" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '300', letterSpacing: -0.5 }}>
                What shall we{"\n"}cook today?
              </Text>
              <Text className="text-base" style={{ color: colors.text.secondary, fontFamily: 'Inter' }}>
                Your kitchen awaits
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* Quick Actions */}
        <View className="px-6 gap-5">
          {/* Primary Action - Add Recipe with Background */}
          <Link href="/recipe/add" asChild>
            <Pressable
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                shadowColor: colors.honey[400],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <ImageBackground
                source={require('../../assets/backgrounds/boheme05.png')}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 24 }}
                imageStyle={{ opacity: 0.2 }}
                resizeMode="cover"
              >
                {/* Semi-transparent overlay - allows image to show through */}
                <View
                  style={{
                    backgroundColor: 'rgba(193, 154, 107, 0.88)',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                  }}
                />
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 20,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    zIndex: 10
                  }}
                >
                  <Plus size={24} color="white" strokeWidth={2} />
                </View>
                <View style={{ flex: 1, zIndex: 10 }}>
                  <Text className="text-white text-lg" style={{ fontFamily: 'Inter', fontWeight: '600' }}>
                    Add Recipe
                  </Text>
                  <Text className="text-white/75 text-sm mt-1" style={{ fontFamily: 'Inter' }}>
                    Paste a link or add by hand
                  </Text>
                </View>
              </ImageBackground>
            </Pressable>
          </Link>

          {/* Secondary Actions Row */}
          <View className="flex-row gap-4">
            {/* What Can I Make */}
            <Pressable
              className="flex-1 bg-stone-100 border border-stone-200 rounded-xl p-5 active:opacity-80"
            >
              <View className="w-12 h-12 bg-sage-50 rounded-xl items-center justify-center mb-4">
                <Sparkles size={22} color={colors.sage[200]} strokeWidth={2} />
              </View>
              <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontWeight: '600', fontSize: 15 }}>
                What Can{"\n"}I Make?
              </Text>
              <Text className="text-xs mt-2" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>
                Match your pantry
              </Text>
            </Pressable>

            {/* What's for Dinner */}
            <Pressable
              className="flex-1 bg-stone-100 border border-stone-200 rounded-xl p-5 active:opacity-80"
            >
              <View className="w-12 h-12 bg-honey-100 rounded-xl items-center justify-center mb-4">
                <Heart size={22} color={colors.honey[300]} strokeWidth={2} />
              </View>
              <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontWeight: '600', fontSize: 15 }}>
                What's for{"\n"}Dinner?
              </Text>
              <Text className="text-xs mt-2" style={{ color: colors.text.muted, fontFamily: 'Inter' }}>
                Let us inspire you
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Kitchen Stats */}
        <View className="px-6 mt-10">
          <Text className="text-lg mb-4" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '500' }}>
            Your Kitchen
          </Text>
          <View className="flex-row gap-4">
            <Pressable
              onPress={() => router.push('/(tabs)/recipes')}
              className="flex-1 bg-stone-100 border border-stone-200 rounded-xl p-5 active:opacity-80"
            >
              <Text className="text-3xl" style={{ color: colors.honey[400], fontFamily: 'Cormorant Garamond', fontWeight: '300' }}>{recipes.length}</Text>
              <Text className="text-sm mt-2" style={{ color: colors.text.tertiary, fontFamily: 'Inter' }}>Saved Recipes</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/pantry')}
              className="flex-1 bg-stone-100 border border-stone-200 rounded-xl p-5 active:opacity-80"
            >
              <Text className="text-3xl" style={{ color: colors.sage[200], fontFamily: 'Cormorant Garamond', fontWeight: '300' }}>{pantryItems.length}</Text>
              <Text className="text-sm mt-2" style={{ color: colors.text.tertiary, fontFamily: 'Inter' }}>Pantry Items</Text>
            </Pressable>
            <View className="flex-1 bg-stone-100 border border-stone-200 rounded-xl p-5">
              <Text className="text-3xl" style={{ color: colors.honey[300], fontFamily: 'Cormorant Garamond', fontWeight: '300' }}>{totalCooked}</Text>
              <Text className="text-sm mt-2" style={{ color: colors.text.tertiary, fontFamily: 'Inter' }}>Dishes Made</Text>
            </View>
          </View>
        </View>

        {/* Recent Recipes */}
        <View className="mt-10 mb-10">
          <View className="px-6 flex-row items-center justify-between mb-4">
            <Text className="text-lg" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '500' }}>
              Recent Recipes
            </Text>
            {recentRecipes.length > 0 && (
              <Pressable onPress={() => router.push('/(tabs)/recipes')}>
                <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontSize: 13, fontWeight: '500' }}>
                  See All
                </Text>
              </Pressable>
            )}
          </View>

          {recentRecipes.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 24, paddingRight: 8 }}
            >
              {recentRecipes.map((recipe) => (
                <RecentRecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </ScrollView>
          ) : (
            <View className="px-6">
              <ImageBackground
                source={require('../../assets/backgrounds/boheme02.png')}
                style={{ borderRadius: 20, overflow: 'hidden' }}
                imageStyle={{ opacity: 0.08, borderRadius: 20 }}
                resizeMode="cover"
              >
                <View className="bg-stone-100/90 border border-stone-200 rounded-xl p-10 items-center">
                  <View className="w-20 h-20 bg-honey-100 rounded-full items-center justify-center mb-5">
                    <BookOpen size={32} color={colors.honey[400]} strokeWidth={1.5} />
                  </View>
                  <Text className="text-2xl text-center mb-3" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontWeight: '400' }}>
                    Your collection{"\n"}awaits
                  </Text>
                  <Text className="text-center mb-6" style={{ color: colors.text.tertiary, fontFamily: 'Inter', fontSize: 15, lineHeight: 24 }}>
                    Add a recipe to begin{"\n"}your culinary journey
                  </Text>
                  <Link href="/recipe/add" asChild>
                    <Pressable className="bg-honey-100 border border-honey-200 px-7 py-3 rounded-xl active:opacity-80">
                      <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontWeight: '600', fontSize: 14 }}>
                        Add Your First Recipe
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </ImageBackground>
            </View>
          )}
        </View>

        {/* Inspirational Footer */}
        <View className="px-6 pb-10 items-center">
          <Text className="italic" style={{ color: colors.text.disabled, fontFamily: 'Crimson Text', fontSize: 14 }}>
            Cook with love, eat with joy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
