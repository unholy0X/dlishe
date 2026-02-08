import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import FloatingNav from "../components/FloatingNav";
import RecipesHeader from "../components/recipies/RecipesHeader";
import SearchBar from "../components/SearchBar";
import RecipeCard from "../components/recipies/RecipeCard";
import BottomSheetModal from "../components/BottomSheetModal";
import AddRecipeSheetContent from "../components/recipies/AddRecipeSheetContent";

export default function RecipiesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "recipies";
  const [isSheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <RecipesHeader />
          <View style={{marginTop: 10}}>
            <SearchBar placeholder="Search for a recipe" />
          </View>

          <View style={{ marginTop: 10 }}>
            <RecipeCard
              title="Orange Chicken"
              description="How to make easy takeout meals at home, like classic orange chicken!"
              meta="30 min · Easy · 4 servings"
              image={require("../assets/recipie1.png")}
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
    backgroundColor: "#f4f5f7",
  },
  safeArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 140,
  },
});
