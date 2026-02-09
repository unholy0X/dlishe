import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
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
import { useSuggestedStore } from "../store";
import { useAuth } from "@clerk/clerk-expo";

function buildMeta(recipe) {
  const parts = [];
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalTime > 0) parts.push(`${totalTime} min`);
  if (recipe.difficulty) parts.push(recipe.difficulty);
  if (recipe.servings) parts.push(`${recipe.servings} servings`);
  return parts.join(" · ");
}

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "home";
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isRecipesSheetOpen, setRecipesSheetOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);

  const { getToken } = useAuth();
  const { recipes: suggested, allRecipes, isLoadingAll, loadSuggested, loadAll } = useSuggestedStore();

  useEffect(() => {
    loadSuggested({ limit: 10 });
  }, []);

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
    meta: buildMeta(r),
  }));

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.padded}>
            <ProfileName
              name="Samantha"
              subtitle="Your kitchen awaits"
              imageUrl="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
            />

            <SearchBar
              placeholder="Search for a recipe"
              onPress={() => setSearchOpen(true)}
            />

            <MealCategoryGrid />

            <Text style={styles.title}>What Shall we cook today?</Text>
          </View>
          <View style={{ marginHorizontal: 20 }}>
            <SuggestionRow
              items={[
                {
                  title: "What can I make ?",
                  subtitle: { txt: "Match your pantry", color: "#385225" },
                  Icon: () => (
                    <View style={{backgroundColor: "rgba(128, 239, 128, 0.5)", borderRadius: 999}}>
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
            <StatsCardsRow />

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
          router.push(`/${key}`);
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
          <Text style={styles.recipesSheetTitle}>Recent Recipes</Text>
          <Text style={styles.recipesSheetSubtitle}>
            {(allRecipes.length || suggested.length)} recipe{(allRecipes.length || suggested.length) !== 1 ? "s" : ""}
          </Text>

          {isLoadingAll ? (
            <View style={styles.recipesSheetLoading}>
              <ActivityIndicator size="large" color="#385225" />
            </View>
          ) : (
            <View style={styles.recipesSheetGrid}>
              {(allRecipes.length > 0 ? allRecipes : suggested).map((recipe) => {
                const imageSource = recipe.thumbnailUrl
                  ? { uri: recipe.thumbnailUrl }
                  : null;
                const meta = buildMeta(recipe);

                return (
                  <Pressable
                    key={recipe.id}
                    style={styles.recipeCard}
                    onPress={() => {
                      setRecipesSheetOpen(false);
                      router.push(`/recipe/${recipe.id}`);
                    }}
                  >
                    {imageSource ? (
                      <Image source={imageSource} style={styles.recipeCardImage} />
                    ) : (
                      <View style={[styles.recipeCardImage, styles.recipeCardPlaceholder]}>
                        <Text style={styles.recipeCardPlaceholderText}>
                          {recipe.title ? recipe.title.charAt(0).toUpperCase() : "?"}
                        </Text>
                      </View>
                    )}
                    <View style={styles.recipeCardInfo}>
                      <Text style={styles.recipeCardTitle} numberOfLines={2}>{recipe.title}</Text>
                      {meta ? <Text style={styles.recipeCardMeta}>{meta}</Text> : null}
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
    marginBottom: 20,
  },
  recipesSheetLoading: {
    alignItems: "center",
    paddingVertical: 40,
  },
  recipesSheetGrid: {
    gap: 12,
    paddingBottom: 10,
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EBEBEB",
  },
  recipeCardImage: {
    width: 80,
    height: 80,
  },
  recipeCardPlaceholder: {
    backgroundColor: "#DFF7C4",
    alignItems: "center",
    justifyContent: "center",
  },
  recipeCardPlaceholderText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#385225",
  },
  recipeCardInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recipeCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
  },
  recipeCardMeta: {
    fontSize: 13,
    color: "#B4B4B4",
    marginTop: 4,
  },
});
