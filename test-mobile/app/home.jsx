import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
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
import AddRecipeSheetContent from "../components/recipies/AddRecipeSheetContent";
import { useSuggestedStore } from "../store";

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

  const { recipes: suggested, loadSuggested } = useSuggestedStore();

  useEffect(() => {
    loadSuggested({ limit: 10 });
  }, []);

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

            <SearchBar placeholder="Search for a recipe" />

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
              onPressSeeAll={() => router.push("/recipies")}
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
});
