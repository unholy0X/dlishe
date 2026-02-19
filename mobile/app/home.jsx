import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import FloatingNav from "../components/FloatingNav";
import SwipeNavigator from "../components/SwipeNavigator";
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
import DinnerInspirationSheet from "../components/DinnerInspirationSheet";
import { useSuggestedStore, useFeaturedStore, useRecipeStore, usePantryStore, useMealPlanStore } from "../store";
import MealPlanCard from "../components/mealPlan/MealPlanCard";
import { useAuth } from "@clerk/clerk-expo";
import { cloneRecipe, toggleFavorite as toggleFavoriteApi } from "../services/recipes";
import { filterByMealCategory, CATEGORIES } from "../utils/mealCategories";

const { width: SCREEN_W } = Dimensions.get("window");
const MASONRY_GAP = 10;
const MASONRY_COL = (SCREEN_W - 40 - MASONRY_GAP) / 2;
const MASONRY_HEIGHT = MASONRY_COL * 1.25;

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

function friendlySaveError(err) {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("network request failed") || msg.includes("failed to fetch"))
    return "No internet connection. Check your network and try again.";
  if (
    msg.includes("token") ||
    msg.includes("unauthorized") ||
    msg.includes("not authenticated") ||
    msg.includes("sign-in session")
  )
    return "Your session needs a refresh. Please sign out and back in.";
  return "Couldn't save this recipe. Please try again.";
}

const recipeKeyExtractor = (item) => item.id;

const PAGE_SIZE = 10;

function RecipeGrid({ data, onPressRecipe, savedPublicIds, savingIds, onSave, renderBadge, scrollProps }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset visible count when data changes (new sheet opened)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [data]);

  const visibleData = useMemo(() => data.slice(0, visibleCount), [data, visibleCount]);
  const hasMore = visibleCount < data.length;

  const renderItem = useCallback(({ item: recipe }) => {
    const imageSource = recipe.thumbnailUrl ? { uri: recipe.thumbnailUrl } : null;
    const isSaved = savedPublicIds?.has(recipe.id);
    const isSaving = savingIds?.has(recipe.id);

    return (
      <Pressable
        style={styles.masonryCard}
        onPress={() => onPressRecipe(recipe)}
      >
        <RecipePlaceholder title={recipe.title} variant="large" style={styles.masonryImage} />
        {imageSource ? (
          <Image source={imageSource} style={styles.masonryImage} transition={200} recyclingKey={recipe.id} cachePolicy="memory-disk" />
        ) : null}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)"]}
          style={styles.masonryGradient}
        />
        {renderBadge ? renderBadge(recipe) : null}
        <Pressable
          style={styles.favHeartBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            if (onSave && !isSaved && !isSaving) onSave(recipe.id);
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
  }, [savedPublicIds, savingIds, onPressRecipe, onSave, renderBadge]);

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <Pressable
        style={styles.showMoreBtn}
        onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
      >
        <Text style={styles.showMoreText}>
          Show more ({data.length - visibleCount} remaining)
        </Text>
      </Pressable>
    );
  }, [hasMore, data.length, visibleCount]);

  return (
    <FlatList
      data={visibleData}
      renderItem={renderItem}
      keyExtractor={recipeKeyExtractor}
      numColumns={2}
      columnWrapperStyle={styles.masonryRow}
      showsVerticalScrollIndicator={false}
      initialNumToRender={PAGE_SIZE}
      maxToRenderPerBatch={8}
      windowSize={5}
      contentContainerStyle={styles.masonryListContent}
      scrollEventThrottle={16}
      ListFooterComponent={renderFooter}
      {...scrollProps}
    />
  );
}

/** Tokenize a pantry item name into match tokens (words > 2 chars + full phrase) */
function tokenize(name) {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  const tokens = new Set(words);
  if (words.length > 1) tokens.add(lower);
  return [...tokens];
}

/** Count how many unique pantry tokens appear in a recipe's text */
function countPantryMatches(recipe, pantryTokens) {
  const haystack = [
    recipe.title || "",
    ...(recipe.tags || []),
    recipe.cuisine || "",
  ]
    .join(" ")
    .toLowerCase();
  let count = 0;
  for (const token of pantryTokens) {
    if (haystack.includes(token)) count++;
  }
  return count;
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
  const [dinnerOpen, setDinnerOpen] = useState(false);
  const [dinnerRecipes, setDinnerRecipes] = useState([]);
  const [mealCatOpen, setMealCatOpen] = useState(false);
  const [mealCatKey, setMealCatKey] = useState(null);
  const [mealCatShuffled, setMealCatShuffled] = useState([]);
  const [savingIds, setSavingIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [pantryMatchOpen, setPantryMatchOpen] = useState(false);
  const [pantryMatchResults, setPantryMatchResults] = useState([]);
  const [pantryMatchLoading, setPantryMatchLoading] = useState(false);

  const closeAllSheets = useCallback(() => {
    setSheetOpen(false);
    setRecipesSheetOpen(false);
    setFavoritesOpen(false);
    setSearchOpen(false);
    setRecoSheetOpen(false);
    setDinnerOpen(false);
    setMealCatOpen(false);
    setPantryMatchOpen(false);
  }, []);

  const { getToken } = useAuth();
  const { recipes: suggested, allRecipes, isLoadingAll, loadSuggested, loadAll } = useSuggestedStore();
  const { recipes: featuredRecipes, loadFeatured } = useFeaturedStore();
  const { recipes: userRecipes, loadRecipes, toggleFavorite } = useRecipeStore();
  const { groups: pantryGroups, loadPantry } = usePantryStore();
  const { plan: mealPlan, loadCurrentWeek: loadMealPlan } = useMealPlanStore();
  const favoriteRecipes = userRecipes.filter((r) => r.isFavorite);
  const favoriteCount = favoriteRecipes.length;
  const favoriteIds = useMemo(() => new Set(favoriteRecipes.map((r) => r.id)), [favoriteRecipes]);

  useEffect(() => {
    loadSuggested({ limit: 20 }).catch(() => {});
    loadFeatured({ limit: 30 }).catch(() => {});
    loadRecipes({ getToken }).catch(() => {});
    loadMealPlan({ getToken }).catch(() => {});
  }, []);

  // Prefetch suggested recipe thumbnails for smooth carousel
  useEffect(() => {
    const urls = suggested
      .map((r) => r.thumbnailUrl)
      .filter(Boolean);
    if (urls.length > 0) {
      urls.forEach((url) => Image.prefetch(url));
    }
  }, [suggested]);

  // Refresh user recipes when navigating back to this screen
  useEffect(() => {
    if (pathname === "/home") {
      loadRecipes({ getToken }).catch(() => {});
      loadMealPlan({ getToken }).catch(() => {});
    }
  }, [pathname]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      loadSuggested({ limit: 20 }),
      loadFeatured({ limit: 30 }),
      loadRecipes({ getToken }),
      loadMealPlan({ getToken }),
    ])
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [getToken]);

  const handlePantryMatch = useCallback(() => {
    closeAllSheets();
    setPantryMatchOpen(true);
    setPantryMatchLoading(true);
    setPantryMatchResults([]);

    // Load pantry + full recipe pool in parallel
    const promises = [loadPantry({ getToken })];
    if (allRecipes.length === 0) promises.push(loadAll());

    Promise.all(promises)
      .catch(() => {})
      .finally(() => setPantryMatchLoading(false));
  }, [getToken, allRecipes.length]);

  // Reactively compute pantry matches when data arrives
  useEffect(() => {
    if (!pantryMatchOpen) return;

    const allItems = pantryGroups.flatMap((g) => g.items || []);
    if (allItems.length === 0) {
      setPantryMatchResults([]);
      return;
    }

    const tokens = allItems.flatMap((item) => item.name ? tokenize(item.name) : []);
    const uniqueTokens = [...new Set(tokens)];
    const pool = allRecipes.length > 0 ? allRecipes : suggested;

    const scored = pool
      .map((r) => ({ ...r, _matchCount: countPantryMatches(r, uniqueTokens) }))
      .filter((r) => r._matchCount > 0)
      .sort((a, b) => b._matchCount - a._matchCount);

    setPantryMatchResults(scored);
  }, [pantryMatchOpen, pantryGroups, allRecipes.length, suggested.length]);

  const handleRecommendation = useCallback((filter) => {
    closeAllSheets();
    setRecoFilter(filter);
    setRecoSheetOpen(true);

    // Load full dataset if needed
    if (allRecipes.length === 0) loadAll().catch(() => {});

    const pool = allRecipes.length > 0 ? allRecipes : suggested;

    const filtered = pool.filter((r) => {
      if (filter === "high-protein") {
        const protein = r.nutrition?.protein ?? r.dietaryInfo?.nutrition?.protein ?? 0;
        return protein >= 22;
      }
      if (filter === "quick-meals") {
        const total = (r.prepTime || 0) + (r.cookTime || 0);
        return total > 0 && total <= 20;
      }
      return false;
    });

    setRecoResults(shuffle(filtered));
  }, [allRecipes, suggested]);

  const handleDinnerInspiration = useCallback(() => {
    closeAllSheets();
    const withThumbnails = featuredRecipes.filter((r) => r.thumbnailUrl);
    setDinnerRecipes(shuffle(withThumbnails));
    setDinnerOpen(true);
  }, [featuredRecipes]);

  const handleMealCategory = useCallback((key) => {
    closeAllSheets();
    setMealCatKey(key);
    const pool = allRecipes.length > 0 ? allRecipes : suggested;
    setMealCatShuffled(shuffle(filterByMealCategory(pool, key)));
    setMealCatOpen(true);
    if (allRecipes.length === 0) {
      loadAll().catch(() => {});
    }
  }, [allRecipes.length, suggested]);

  // Re-filter when allRecipes finishes loading (user tapped before data was ready)
  useEffect(() => {
    if (recoSheetOpen && recoFilter && allRecipes.length > 0) {
      const filtered = allRecipes.filter((r) => {
        if (recoFilter === "high-protein") {
          const protein = r.nutrition?.protein ?? r.dietaryInfo?.nutrition?.protein ?? 0;
          return protein >= 22;
        }
        if (recoFilter === "quick-meals") {
          const total = (r.prepTime || 0) + (r.cookTime || 0);
          return total > 0 && total <= 20;
        }
        return false;
      });
      setRecoResults(shuffle(filtered));
    }
    if (mealCatOpen && mealCatKey && allRecipes.length > 0) {
      setMealCatShuffled(shuffle(filterByMealCategory(allRecipes, mealCatKey)));
    }
  }, [allRecipes.length]);

  const [savedPublicIds, setSavedPublicIds] = useState(new Set());
  const [saveError, setSaveError] = useState("");
  const saveErrorTimer = useRef(null);
  const saveErrorAnim = useRef(new Animated.Value(0)).current;

  // Animate the save-error toast in when it appears, and clean up on unmount
  useEffect(() => {
    if (!saveError) return;
    saveErrorAnim.setValue(0);
    Animated.spring(saveErrorAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 16,
      stiffness: 220,
    }).start();
  }, [saveError]);

  useEffect(() => {
    return () => {
      if (saveErrorTimer.current) clearTimeout(saveErrorTimer.current);
    };
  }, []);

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
      loadRecipes({ getToken }).catch(() => {});
    } catch (err) {
      // Revert optimistic update on failure
      setSavedPublicIds((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
      // Show a non-blocking friendly toast — no jarring alert dialogs
      const msg = friendlySaveError(err);
      setSaveError(msg);
      if (saveErrorTimer.current) clearTimeout(saveErrorTimer.current);
      saveErrorTimer.current = setTimeout(() => setSaveError(""), 4000);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  }, [getToken, savingIds, savedPublicIds]);

  const handleSeeAll = useCallback(() => {
    closeAllSheets();
    setRecipesSheetOpen(true);
    if (allRecipes.length === 0) {
      loadAll().catch(() => {});
    }
  }, [allRecipes.length]);

  const mealPlanEntries = mealPlan?.entries || [];
  const mealPlanPerDay = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    mealPlanEntries.forEach((e) => {
      if (e.dayIndex >= 0 && e.dayIndex <= 6) counts[e.dayIndex]++;
    });
    return counts;
  }, [mealPlanEntries]);
  const mealPlanTotal = mealPlanEntries.length;

  const carouselItems = suggested.map((r) => ({
    id: r.id,
    title: r.title,
    thumbnailUrl: r.thumbnailUrl,
  }));

  return (
    <View style={styles.screen}>
      <SwipeNavigator>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#385225"
            />
          }
        >
          <View style={styles.padded}>
            <ProfileName subtitle="Your kitchen awaits" />

            <SearchBar
              placeholder="Search for a recipe"
              onPress={() => { closeAllSheets(); setSearchOpen(true); }}
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
                  onPress: handlePantryMatch,
                },
                {
                  title: "Get Inspired",
                  subtitle: { txt: "Curated picks for you", color: "#5A1F33" },
                  Icon: () => <HeartBadgeIcon width={40} height={40} />,
                  onPress: handleDinnerInspiration,
                },
              ]}
            />
          </View>

          <View style={styles.padded}>
            <StatsCardsRow
              favoriteCount={favoriteCount}
              onPressFavorites={() => { closeAllSheets(); setFavoritesOpen(true); }}
              onPressHighProtein={() => handleRecommendation("high-protein")}
              onPressQuickMeals={() => handleRecommendation("quick-meals")}
            />

            <MealPlanCard
              mealsPerDay={mealPlanPerDay}
              totalMeals={mealPlanTotal}
              onPress={() => router.push("/mealPlan")}
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
      </SwipeNavigator>

      <FloatingNav
        onPressItem={(key) => {
          if (key !== activeKey) router.replace(`/${key}`);
        }}
        onPressPlus={() => { closeAllSheets(); setSheetOpen(true); }}
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
        customScroll
      >
        {({ onScroll, scrollEnabled }) => (
          <>
            <Text style={styles.recipesSheetTitle}>Suggested For You</Text>
            <Text style={styles.recipesSheetSubtitle}>
              {(allRecipes.length || suggested.length)} suggestion{(allRecipes.length || suggested.length) !== 1 ? "s" : ""}
            </Text>
            {isLoadingAll ? (
              <View style={styles.recipesSheetLoading}>
                <ActivityIndicator size="large" color="#385225" />
              </View>
            ) : (
              <RecipeGrid
                data={allRecipes.length > 0 ? allRecipes : suggested}
                savedPublicIds={savedPublicIds}
                savingIds={savingIds}
                onSave={handleSaveAndFavorite}
                onPressRecipe={(recipe) => {
                  setRecipesSheetOpen(false);
                  router.push(`/recipe/${recipe.id}`);
                }}
                scrollProps={{ onScroll, scrollEnabled, scrollEventThrottle: 16 }}
              />
            )}
          </>
        )}
      </BottomSheetModal>

      {/* Favorites Sheet */}
      <BottomSheetModal
        visible={isFavoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        customScroll={favoriteCount > 0}
      >
        {favoriteCount > 0 ? (
          ({ onScroll, scrollEnabled }) => (
            <>
              <View style={styles.favoritesHeader}>
                <HeartIcon width={22} height={22} color="#E84057" filled />
                <Text style={styles.favoritesTitle}>My Favorites</Text>
              </View>
              <Text style={styles.recipesSheetSubtitle}>
                {favoriteCount} recipe{favoriteCount !== 1 ? "s" : ""} saved
              </Text>
              <RecipeGrid
                data={favoriteRecipes}
                savedPublicIds={favoriteIds}
                savingIds={savingIds}
                onSave={(id) => toggleFavorite({ recipeId: id, getToken }).catch(() => {})}
                onPressRecipe={(recipe) => {
                  setFavoritesOpen(false);
                  router.push(`/recipe/${recipe.id}`);
                }}
                scrollProps={{ onScroll, scrollEnabled, scrollEventThrottle: 16 }}
              />
            </>
          )
        ) : (
          <View style={styles.recipesSheet}>
            <View style={styles.favoritesHeader}>
              <HeartIcon width={22} height={22} color="#E84057" filled />
              <Text style={styles.favoritesTitle}>My Favorites</Text>
            </View>
            <Text style={styles.recipesSheetSubtitle}>
              {favoriteCount} recipe{favoriteCount !== 1 ? "s" : ""} saved
            </Text>
            <View style={styles.emptyFavorites}>
              <View style={styles.emptyHeartCircle}>
                <HeartIcon width={32} height={32} color="#F9BABA" />
              </View>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the heart on any recipe to save it here
              </Text>
            </View>
          </View>
        )}
      </BottomSheetModal>

      {/* Recommendations Sheet */}
      <BottomSheetModal
        visible={recoSheetOpen}
        onClose={() => setRecoSheetOpen(false)}
        customScroll
      >
        {({ onScroll, scrollEnabled }) => (
          <>
            <Text style={styles.recipesSheetTitle}>
              {recoFilter === "high-protein" ? "High Protein" : "Quick Meals"}
            </Text>
            <Text style={styles.recipesSheetSubtitle}>
              {isLoadingAll ? "Loading..." : `${recoResults.length} recipe${recoResults.length !== 1 ? "s" : ""}`}
            </Text>
            {isLoadingAll ? (
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
              <RecipeGrid
                data={recoResults}
                savedPublicIds={savedPublicIds}
                savingIds={savingIds}
                onSave={handleSaveAndFavorite}
                onPressRecipe={(recipe) => {
                  setRecoSheetOpen(false);
                  router.push(`/recipe/${recipe.id}`);
                }}
                scrollProps={{ onScroll, scrollEnabled, scrollEventThrottle: 16 }}
              />
            )}
          </>
        )}
      </BottomSheetModal>

      {/* Meal Category Sheet */}
      <BottomSheetModal
        visible={mealCatOpen}
        onClose={() => setMealCatOpen(false)}
        customScroll
      >
        {({ onScroll, scrollEnabled }) => (
          <>
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
              <RecipeGrid
                data={mealCatShuffled}
                savedPublicIds={savedPublicIds}
                savingIds={savingIds}
                onSave={handleSaveAndFavorite}
                onPressRecipe={(recipe) => {
                  setMealCatOpen(false);
                  router.push(`/recipe/${recipe.id}`);
                }}
                scrollProps={{ onScroll, scrollEnabled, scrollEventThrottle: 16 }}
              />
            )}
          </>
        )}
      </BottomSheetModal>

      {/* Dinner Inspiration Sheet */}
      <BottomSheetModal
        visible={dinnerOpen}
        onClose={() => setDinnerOpen(false)}
      >
        <DinnerInspirationSheet
          recipes={dinnerRecipes}
          onSave={handleSaveAndFavorite}
          onCook={(recipe) => {
            setDinnerOpen(false);
            // Silently clone + favorite the recipe in the background so it
            // lands in the user's library — don't block navigation on it.
            handleSaveAndFavorite(recipe.id);
            // Delay navigation until modal close animation finishes, then
            // open the recipe page directly in immersive cooking mode.
            setTimeout(() => {
              router.push(`/recipe/${recipe.id}?cook=1`);
            }, 250);
          }}
          savedIds={savedPublicIds}
          savingIds={savingIds}
        />
      </BottomSheetModal>

      {/* Pantry Match Sheet */}
      <BottomSheetModal
        visible={pantryMatchOpen}
        onClose={() => setPantryMatchOpen(false)}
        customScroll
      >
        {({ onScroll, scrollEnabled }) => (
          <>
            <View style={styles.favoritesHeader}>
              <View style={{ backgroundColor: "rgba(128, 239, 128, 0.5)", borderRadius: 999 }}>
                <SparkleBadgeIcon width={22} height={22} />
              </View>
              <Text style={styles.favoritesTitle}>What Can I Make?</Text>
            </View>
            <Text style={styles.recipesSheetSubtitle}>
              {pantryMatchLoading
                ? "Matching your pantry..."
                : `${pantryMatchResults.length} recipe${pantryMatchResults.length !== 1 ? "s" : ""} matched`}
            </Text>
            {pantryMatchLoading ? (
              <View style={styles.recipesSheetLoading}>
                <ActivityIndicator size="large" color="#385225" />
              </View>
            ) : pantryGroups.flatMap((g) => g.items || []).length === 0 ? (
              <View style={styles.emptyFavorites}>
                <View style={[styles.emptyHeartCircle, { backgroundColor: "#EAF4E0" }]}>
                  <SparkleBadgeIcon width={32} height={32} />
                </View>
                <Text style={styles.emptyTitle}>Pantry is empty</Text>
                <Text style={styles.emptySubtitle}>
                  Add items to your pantry to see what you can cook
                </Text>
              </View>
            ) : pantryMatchResults.length === 0 ? (
              <View style={styles.emptyFavorites}>
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adding more items to your pantry
                </Text>
              </View>
            ) : (
              <RecipeGrid
                data={pantryMatchResults}
                savedPublicIds={savedPublicIds}
                savingIds={savingIds}
                onSave={handleSaveAndFavorite}
                onPressRecipe={(recipe) => {
                  setPantryMatchOpen(false);
                  router.push(`/recipe/${recipe.id}`);
                }}
                renderBadge={(recipe) => (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>
                      {recipe._matchCount} match{recipe._matchCount !== 1 ? "es" : ""}
                    </Text>
                  </View>
                )}
                scrollProps={{ onScroll, scrollEnabled, scrollEventThrottle: 16 }}
              />
            )}
          </>
        )}
      </BottomSheetModal>

      {/* Search overlay */}
      <SearchOverlay
        visible={isSearchOpen}
        onClose={() => setSearchOpen(false)}
        getToken={getToken}
        onSelectRecipe={(recipe) => router.push(`/recipe/${recipe.id}`)}
      />

      {/* Save-error toast — non-blocking, auto-dismisses, no Alert dialogs */}
      {saveError ? (
        <Animated.View
          style={[
            styles.saveToast,
            {
              opacity: saveErrorAnim,
              transform: [
                {
                  translateY: saveErrorAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.saveToastText}>{saveError}</Text>
        </Animated.View>
      ) : null}
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
  // Masonry grid (FlatList)
  masonryRow: {
    gap: MASONRY_GAP,
  },
  masonryListContent: {
    paddingBottom: 10,
    gap: MASONRY_GAP,
  },
  masonryCard: {
    width: MASONRY_COL,
    height: MASONRY_HEIGHT,
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
  matchBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#385225",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  showMoreBtn: {
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#385225",
  },
  // Non-blocking save-error toast — sits above the FloatingNav
  saveToast: {
    position: "absolute",
    bottom: 108,
    left: 24,
    right: 24,
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  saveToastText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 20,
  },
});
