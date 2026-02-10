import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import FloatingNav from "../components/FloatingNav";
import ProfileName from "../components/home/ProfileName";
import SearchBar from "../components/SearchBar";
import MealCategoryGrid from "../components/home/MealCategoryGrid";
import SuggestionRow from "../components/home/SuggestionRow";
import SparkleBadgeIcon from "../components/icons/SparkleBadgeIcon";
import HeartBadgeIcon from "../components/icons/HeartBadgeIcon";
import StatsCardsRow from "../components/home/StatsCardsRow";
import RecentRecipesHeader from "../components/home/RecentRecipesHeader";
import RecentRecipesCarousel from "../components/home/RecentRecipesCarousel";
import BottomSheetModal from "../components/BottomSheetModal";
import SearchOverlay from "../components/SearchOverlay";
import AddRecipeSheetContent from "../components/recipies/AddRecipeSheetContent";
import HeartIcon from "../components/icons/HeartIcon";
import RecipePlaceholder from "../components/RecipePlaceholder";
import { useSuggestedStore, useRecipeStore } from "../store";
import { useAuth } from "@clerk/clerk-expo";
import { fetchRecommendations, cloneRecipe, toggleFavorite as toggleFavoriteApi } from "../services/recipes";
import { filterByMealCategory, CATEGORIES } from "../utils/mealCategories";

const { width: SCREEN_W } = Dimensions.get("window");
const MASONRY_GAP = 10;
const MASONRY_COL = (SCREEN_W - 40 - MASONRY_GAP) / 2;
const MASONRY_TALL = MASONRY_COL * 1.45;
const MASONRY_SHORT = MASONRY_COL * 1.1;

function buildMeta(recipe) {
  const parts = [];
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalTime > 0) parts.push(`${totalTime} min`);
  if (recipe.difficulty) parts.push(recipe.difficulty);
  if (recipe.servings) parts.push(`${recipe.servings} servings`);
  return parts.join(" · ");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "home";
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isRecipesSheetOpen, setRecipesSheetOpen] = useState(false);
  const [isFavoritesOpen, setFavoritesOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [recoSheetOpen, setRecoSheetOpen] = useState(false);
  const [recoFilter, setRecoFilter] = useState(null);
  const [recoResults, setRecoResults] = useState([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [mealCatOpen, setMealCatOpen] = useState(false);
  const [mealCatKey, setMealCatKey] = useState(null);
  const [mealCatShuffled, setMealCatShuffled] = useState([]);
  const [savingIds, setSavingIds] = useState(new Set());

  const { getToken } = useAuth();
  const { recipes: suggested, allRecipes, isLoadingAll, loadSuggested, loadAll } = useSuggestedStore();
  const { recipes: userRecipes, loadRecipes, toggleFavorite } = useRecipeStore();
  const favoriteRecipes = userRecipes.filter((r) => r.isFavorite);
  const favoriteCount = favoriteRecipes.length;

  useEffect(() => {
    loadSuggested({ limit: 20 });
    loadRecipes({ getToken });
  }, []);

  const handleRecommendation = useCallback(async (filter) => {
    setRecoFilter(filter);
    setRecoSheetOpen(true);
    setRecoLoading(true);
    try {
      const data = await fetchRecommendations({ getToken, filter, limit: 20 });
      setRecoResults(data.items || []);
    } catch {
      setRecoResults([]);
    } finally {
      setRecoLoading(false);
    }
  }, [getToken]);

  const handleMealCategory = useCallback((key) => {
    setMealCatKey(key);
    const pool = allRecipes.length > 0 ? allRecipes : suggested;
    setMealCatShuffled(shuffle(filterByMealCategory(pool, key)));
    setMealCatOpen(true);
    if (allRecipes.length === 0) {
      loadAll();
    }
  }, [allRecipes.length, suggested]);

  // Re-shuffle when allRecipes finishes loading (user tapped before data was ready)
  useEffect(() => {
    if (mealCatOpen && mealCatKey && allRecipes.length > 0) {
      setMealCatShuffled(shuffle(filterByMealCategory(allRecipes, mealCatKey)));
    }
  }, [allRecipes.length]);

  const [savedPublicIds, setSavedPublicIds] = useState(new Set());

  const handleSaveAndFavorite = useCallback(async (recipeId) => {
    if (savingIds.has(recipeId) || savedPublicIds.has(recipeId)) return;

    // Optimistic — fill heart immediately
    setSavedPublicIds((prev) => new Set(prev).add(recipeId));
    setSavingIds((prev) => new Set(prev).add(recipeId));

    try {
      const cloned = await cloneRecipe({ recipeId, getToken });
      const clonedId = cloned?.id || cloned?.recipe?.id;
      if (clonedId) {
        await toggleFavoriteApi({ recipeId: clonedId, isFavorite: true, getToken });
      }
      loadRecipes({ getToken });
    } catch {
      // Revert optimistic update on failure
      setSavedPublicIds((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  }, [getToken, savingIds, savedPublicIds]);

  const handleSeeAll = useCallback(() => {
    setRecipesSheetOpen(true);
    if (allRecipes.length === 0) {
      loadAll();
    }
  }, [allRecipes.length]);

  const carouselItems = suggested.map((r) => ({
    id: r.id,
    title: r.title,
    thumbnailUrl: r.thumbnailUrl,
  }));

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.padded}>
            <ProfileName subtitle="Your kitchen awaits" />

            <SearchBar
              placeholder="Search for a recipe"
              onPress={() => setSearchOpen(true)}
            />

            <MealCategoryGrid onPress={handleMealCategory} />

            <Text style={styles.title}>What Shall we cook today?</Text>
          </View>
          <View style={{ marginHorizontal: 20 }}>
            <SuggestionRow
              items={[
                {
                  title: "What can I make ?",
                  subtitle: { txt: "Match your pantry", color: "#385225" },
                  Icon: () => (
                    <View style={{ backgroundColor: "rgba(128, 239, 128, 0.5)", borderRadius: 999 }}>
                      <SparkleBadgeIcon width={40} height={40} />
                    </View>
                  ),
                },
                {
                  title: "What's for dinner",
                  subtitle: { txt: "Let us inspire you", color: "#5A1F33" },
                  Icon: () => <HeartBadgeIcon width={40} height={40} />,
                },
              ]}
            />
          </View>

          <View style={styles.padded}>
            <StatsCardsRow
              favoriteCount={favoriteCount}
              onPressFavorites={() => setFavoritesOpen(true)}
              onPressHighProtein={() => handleRecommendation("high-protein")}
              onPressQuickMeals={() => handleRecommendation("quick-meals")}
            />

            <RecentRecipesHeader
              onPressSeeAll={handleSeeAll}
            />
          </View>
          <View style={{ marginHorizontal: 20 }}>
            <RecentRecipesCarousel
              items={carouselItems}
              onPressItem={(item) => router.push(`/recipe/${item.id}`)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <FloatingNav
        onPressItem={(key) => {
          if (key !== activeKey) router.replace(`/${key}`);
        }}
        onPressPlus={() => setSheetOpen(true)}
        activeKey={activeKey}
      />

      <BottomSheetModal
        visible={isSheetOpen}
        onClose={() => setSheetOpen(false)}
      >
        <AddRecipeSheetContent onPressBack={() => setSheetOpen(false)} />
      </BottomSheetModal>

      {/* All Recent Recipes Sheet */}
      <BottomSheetModal
        visible={isRecipesSheetOpen}
        onClose={() => setRecipesSheetOpen(false)}
      >
        <View style={styles.recipesSheet}>
          <Text style={styles.recipesSheetTitle}>Suggested For You</Text>
          <Text style={styles.recipesSheetSubtitle}>
            {(allRecipes.length || suggested.length)} suggestion{(allRecipes.length || suggested.length) !== 1 ? "s" : ""}
          </Text>

          {isLoadingAll ? (
            <View style={styles.recipesSheetLoading}>
              <ActivityIndicator size="large" color="#385225" />
            </View>
          ) : (
            <View style={styles.masonryGrid}>
              {(allRecipes.length > 0 ? allRecipes : suggested).map((recipe, index) => {
                const imageSource = recipe.thumbnailUrl
                  ? { uri: recipe.thumbnailUrl }
                  : null;
                const isTall = index % 3 === 0;
                const isSaved = savedPublicIds.has(recipe.id);
                const isSaving = savingIds.has(recipe.id);

                return (
                  <Pressable
                    key={recipe.id}
                    style={[
                      styles.masonryCard,
                      { height: isTall ? MASONRY_TALL : MASONRY_SHORT },
                    ]}
                    onPress={() => {
                      setRecipesSheetOpen(false);
                      router.push(`/recipe/${recipe.id}`);
                    }}
                  >
                    {imageSource ? (
                      <Image source={imageSource} style={styles.masonryImage} />
                    ) : (
                      <RecipePlaceholder title={recipe.title} variant="large" style={styles.masonryImage} />
                    )}
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.6)"]}
                      style={styles.masonryGradient}
                    />
                    <Pressable
                      style={styles.favHeartBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        if (!isSaved && !isSaving) {
                          handleSaveAndFavorite(recipe.id);
                        }
                      }}
                      hitSlop={10}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#E84057" />
                      ) : (
                        <HeartIcon width={18} height={18} color="#E84057" filled={isSaved} />
                      )}
                    </Pressable>
                    <View style={styles.masonryOverlay}>
                      <Text style={styles.masonryTitle} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </BottomSheetModal>

      {/* Favorites Sheet */}
      <BottomSheetModal
        visible={isFavoritesOpen}
        onClose={() => setFavoritesOpen(false)}
      >
        <View style={styles.recipesSheet}>
          <View style={styles.favoritesHeader}>
            <HeartIcon width={22} height={22} color="#E84057" filled />
            <Text style={styles.favoritesTitle}>My Favorites</Text>
          </View>
          <Text style={styles.recipesSheetSubtitle}>
            {favoriteCount} recipe{favoriteCount !== 1 ? "s" : ""} saved
          </Text>

          {favoriteCount === 0 ? (
            <View style={styles.emptyFavorites}>
              <View style={styles.emptyHeartCircle}>
                <HeartIcon width={32} height={32} color="#F9BABA" />
              </View>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the heart on any recipe to save it here
              </Text>
            </View>
          ) : (
            <View style={styles.masonryGrid}>
              {favoriteRecipes.map((recipe, index) => {
                const imageSource = recipe.thumbnailUrl
                  ? { uri: recipe.thumbnailUrl }
                  : null;
                const isTall = index % 3 === 0;

                return (
                  <Pressable
                    key={recipe.id}
                    style={[
                      styles.masonryCard,
                      { height: isTall ? MASONRY_TALL : MASONRY_SHORT },
                    ]}
                    onPress={() => {
                      setFavoritesOpen(false);
                      router.push(`/recipe/${recipe.id}`);
                    }}
                  >
                    {imageSource ? (
                      <Image source={imageSource} style={styles.masonryImage} />
                    ) : (
                      <RecipePlaceholder title={recipe.title} variant="large" style={styles.masonryImage} />
                    )}
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.6)"]}
                      style={styles.masonryGradient}
                    />
                    <Pressable
                      style={styles.favHeartBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        toggleFavorite({ recipeId: recipe.id, getToken });
                      }}
                      hitSlop={10}
                    >
                      <HeartIcon width={18} height={18} color="#E84057" filled />
                    </Pressable>
                    <View style={styles.masonryOverlay}>
                      <Text style={styles.masonryTitle} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </BottomSheetModal>

      {/* Recommendations Sheet */}
      <BottomSheetModal
        visible={recoSheetOpen}
        onClose={() => setRecoSheetOpen(false)}
      >
        <View style={styles.recipesSheet}>
          <Text style={styles.recipesSheetTitle}>
            {recoFilter === "high-protein" ? "High Protein" : "Quick Meals"}
          </Text>
          <Text style={styles.recipesSheetSubtitle}>
            {recoLoading ? "Loading..." : `${recoResults.length} recipe${recoResults.length !== 1 ? "s" : ""}`}
          </Text>

          {recoLoading ? (
            <View style={styles.recipesSheetLoading}>
              <ActivityIndicator size="large" color="#385225" />
            </View>
          ) : recoResults.length === 0 ? (
            <View style={styles.emptyFavorites}>
              <Text style={styles.emptyTitle}>No recipes found</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find any recipes for this category right now
              </Text>
            </View>
          ) : (
            <View style={styles.masonryGrid}>
              {recoResults.map((recipe, index) => {
                const imageSource = recipe.thumbnailUrl
                  ? { uri: recipe.thumbnailUrl }
                  : null;
                const isTall = index % 3 === 0;
                const isSaved = savedPublicIds.has(recipe.id);
                const isSaving = savingIds.has(recipe.id);

                return (
                  <Pressable
                    key={recipe.id}
                    style={[
                      styles.masonryCard,
                      { height: isTall ? MASONRY_TALL : MASONRY_SHORT },
                    ]}
                    onPress={() => {
                      setRecoSheetOpen(false);
                      router.push(`/recipe/${recipe.id}`);
                    }}
                  >
                    {imageSource ? (
                      <Image source={imageSource} style={styles.masonryImage} />
                    ) : (
                      <RecipePlaceholder title={recipe.title} variant="large" style={styles.masonryImage} />
                    )}
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.6)"]}
                      style={styles.masonryGradient}
                    />
                    <Pressable
                      style={styles.favHeartBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        if (!isSaved && !isSaving) {
                          handleSaveAndFavorite(recipe.id);
                        }
                      }}
                      hitSlop={10}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#E84057" />
                      ) : (
                        <HeartIcon width={18} height={18} color="#E84057" filled={isSaved} />
                      )}
                    </Pressable>
                    <View style={styles.masonryOverlay}>
                      <Text style={styles.masonryTitle} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </BottomSheetModal>

      {/* Meal Category Sheet */}
      <BottomSheetModal
        visible={mealCatOpen}
        onClose={() => setMealCatOpen(false)}
      >
        <View style={styles.recipesSheet}>
          <Text style={styles.recipesSheetTitle}>
            {mealCatKey ? CATEGORIES[mealCatKey]?.label : ""}
          </Text>
          <Text style={styles.recipesSheetSubtitle}>
            {isLoadingAll
              ? "Loading..."
              : `${mealCatShuffled.length} recipe${mealCatShuffled.length !== 1 ? "s" : ""}`}
          </Text>

          {isLoadingAll ? (
            <View style={styles.recipesSheetLoading}>
              <ActivityIndicator size="large" color="#385225" />
            </View>
          ) : mealCatShuffled.length === 0 ? (
            <View style={styles.emptyFavorites}>
              <Text style={styles.emptyTitle}>No recipes found</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find any recipes for this category right now
              </Text>
            </View>
          ) : (
            <View style={styles.masonryGrid}>
              {mealCatShuffled.map((recipe, index) => {
                const imageSource = recipe.thumbnailUrl
                  ? { uri: recipe.thumbnailUrl }
                  : null;
                const isTall = index % 3 === 0;
                const isSaved = savedPublicIds.has(recipe.id);
                const isSaving = savingIds.has(recipe.id);

                return (
                  <Pressable
                    key={recipe.id}
                    style={[
                      styles.masonryCard,
                      { height: isTall ? MASONRY_TALL : MASONRY_SHORT },
                    ]}
                    onPress={() => {
                      setMealCatOpen(false);
                      router.push(`/recipe/${recipe.id}`);
                    }}
                  >
                    {imageSource ? (
                      <Image source={imageSource} style={styles.masonryImage} />
                    ) : (
                      <RecipePlaceholder title={recipe.title} variant="large" style={styles.masonryImage} />
                    )}
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.6)"]}
                      style={styles.masonryGradient}
                    />
                    <Pressable
                      style={styles.favHeartBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        if (!isSaved && !isSaving) {
                          handleSaveAndFavorite(recipe.id);
                        }
                      }}
                      hitSlop={10}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#E84057" />
                      ) : (
                        <HeartIcon width={18} height={18} color="#E84057" filled={isSaved} />
                      )}
                    </Pressable>
                    <View style={styles.masonryOverlay}>
                      <Text style={styles.masonryTitle} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </BottomSheetModal>

      {/* Search overlay */}
      <SearchOverlay
        visible={isSearchOpen}
        onClose={() => setSearchOpen(false)}
        getToken={getToken}
        onSelectRecipe={(recipe) => router.push(`/recipe/${recipe.id}`)}
      />
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
    paddingTop: 12,
  },
  padded: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  title: {
    fontSize: 28,
    fontWeight: "normal",
    color: "#111111",
    marginVertical: 20,
    letterSpacing: -0.05,
  },
  subtitle: {
    marginTop: 4,
    color: "#6b6b6b",
  },
  // Recipes sheet
  recipesSheet: {
    paddingBottom: 20,
  },
  recipesSheetTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
  },
  recipesSheetSubtitle: {
    fontSize: 14,
    color: "#B4B4B4",
    marginTop: 4,
    marginBottom: 16,
  },
  recipesSheetLoading: {
    alignItems: "center",
    paddingVertical: 40,
  },
  // Masonry grid
  masonryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: MASONRY_GAP,
    paddingBottom: 10,
  },
  masonryCard: {
    width: MASONRY_COL,
    borderRadius: 20,
    overflow: "hidden",
  },
  masonryImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  masonryGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  masonryOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  masonryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Favorites sheet styles
  favoritesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  favoritesTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
  },
  emptyFavorites: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyHeartCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FDEEEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#B4B4B4",
    textAlign: "center",
    maxWidth: 220,
  },
  favHeartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
