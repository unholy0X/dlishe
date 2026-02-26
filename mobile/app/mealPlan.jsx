import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import Svg, { Path } from "react-native-svg";
import { useMealPlanStore, useRecipeStore, useShoppingStore } from "../store";
import { useLanguageStore } from "../store/languageStore";
import DayPills from "../components/mealPlan/DayPills";
import MealSlot from "../components/mealPlan/MealSlot";
import AddRecipeSheet from "../components/mealPlan/AddRecipeSheet";
import { useTranslation } from "react-i18next";
import ArrowLeftIcon from "../components/icons/ArrowLeftIcon";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function ChevronLeft({ color = "#385225" }) {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ChevronRight({ color = "#385225" }) {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function formatWeekRange(weekStart, locale = "en-US") {
  if (!weekStart) return "";
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(locale, opts)} \u2013 ${end.toLocaleDateString(locale, opts)}`;
}

export default function MealPlanScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t, i18n } = useTranslation("mealPlan");
  const { recipes: userRecipes, isLoading: recipesLoading, loadRecipes } = useRecipeStore();

  const {
    plan,
    selectedDay,
    isLoading,
    isGenerating,
    error,
    loadCurrentWeek,
    navigateWeek,
    setSelectedDay,
    addEntry,
    removeEntry,
    generateShoppingList,
    clearError,
  } = useMealPlanStore();

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addMealType, setAddMealType] = useState("dinner");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCurrentWeek({ getToken }).catch(() => { });
    loadRecipes({ getToken }).catch(() => { });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCurrentWeek({ getToken })
      .catch(() => { })
      .finally(() => setRefreshing(false));
  }, [getToken]);

  const entries = plan?.entries || [];

  const entriesForDay = useMemo(
    () => entries.filter((e) => e.dayIndex === selectedDay),
    [entries, selectedDay]
  );

  const mealsPerDay = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    entries.forEach((e) => {
      if (e.dayIndex >= 0 && e.dayIndex <= 6) counts[e.dayIndex]++;
    });
    return counts;
  }, [entries]);

  const totalMeals = entries.length;

  const handleAdd = useCallback((mealType) => {
    setAddMealType(mealType);
    setAddSheetOpen(true);
  }, []);

  const handleSelectRecipe = useCallback(async (recipe) => {
    setAddSheetOpen(false);
    try {
      await addEntry({
        getToken,
        recipeId: recipe.id,
        dayIndex: selectedDay,
        mealType: addMealType,
      });
    } catch {
      Alert.alert(t("errors:mealPlan.addFailed"), t("tryAgain", { ns: "common" }));
    }
  }, [getToken, selectedDay, addMealType, t]);

  const handleRemove = useCallback(async (entryId) => {
    try {
      await removeEntry({ getToken, entryId });
    } catch {
      // error set in store
    }
  }, [getToken]);

  const handleRecipePress = useCallback((recipeId) => {
    if (recipeId) router.push(`/recipe/${recipeId}`);
  }, [router]);

  const handleGenerateList = useCallback(async () => {
    try {
      const weekDate = plan?.weekStart ? new Date(plan.weekStart) : new Date();
      const dateStr = weekDate.toLocaleDateString(i18n.language, { month: "short", day: "numeric" });
      const name = t("generatedListName", { date: dateStr });
      const result = await generateShoppingList({ getToken, name });
      if (result?.list) {
        const list = result.list;
        const itemCount = list.items?.length ?? list.itemCount ?? 0;
        // Inject the new list into the shopping store so it's ready in the Shopping tab
        useShoppingStore.setState((state) => ({
          lists: [
            { ...list, itemCount, checkedCount: 0 },
            ...(state.lists || []),
          ],
        }));
        Alert.alert(t("listCreated"), t("listCreatedMsg", { count: itemCount, name: list.name }));
      } else if (result?.message) {
        Alert.alert(t("info"), t("allInPantry"));
      }
    } catch (err) {
      Alert.alert(t("errors:shopping.generateFailed"), err?.message || t("tryAgain", { ns: "common" }));
    }
  }, [getToken, t]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          >
            <ArrowLeftIcon width={18} height={18} color="#111111" />
          </Pressable>
          <Text style={styles.headerTitle}>{t("title")}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Inline error toast — auto-clears after 4 s */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Week navigation */}
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => navigateWeek({ getToken, direction: -1 }).catch(() => { })}
            hitSlop={10}
            style={({ pressed }) => [styles.weekArrow, pressed && { backgroundColor: "#EAEAEA" }]}
          >
            <ChevronLeft />
          </Pressable>
          <Text style={styles.weekLabel}>{formatWeekRange(plan?.weekStart, i18n.language)}</Text>
          <Pressable
            onPress={() => navigateWeek({ getToken, direction: 1 }).catch(() => { })}
            hitSlop={10}
            style={({ pressed }) => [styles.weekArrow, pressed && { backgroundColor: "#EAEAEA" }]}
          >
            <ChevronRight />
          </Pressable>
        </View>

        {/* Day pills */}
        <DayPills
          weekStart={plan?.weekStart}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          mealsPerDay={mealsPerDay}
        />

        {/* Content */}
        {isLoading && !refreshing ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#385225" />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#385225"
              />
            }
          >
            {MEAL_TYPES.map((type) => (
              <MealSlot
                key={type}
                mealType={type}
                entries={entriesForDay.filter((e) => e.mealType === type)}
                onAdd={() => handleAdd(type)}
                onRemove={handleRemove}
                onPressRecipe={handleRecipePress}
              />
            ))}

            {totalMeals > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.generateBtn,
                  isGenerating && styles.generateBtnDisabled,
                  pressed && !isGenerating && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                onPress={handleGenerateList}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.generateBtnText}>{t("generateList")}</Text>
                )}
              </Pressable>
            )}

            {/* Empty state */}
            {totalMeals === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("empty.noMeals")}</Text>
                <Text style={styles.emptySubtitle}>{t("empty.hint")}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Add Recipe Sheet */}
      <AddRecipeSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        recipes={userRecipes}
        isLoading={recipesLoading}
        onSelect={handleSelectRecipe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  errorBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: "#FDECEA",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#F5C6C2",
  },
  errorBannerText: {
    fontSize: 13,
    color: "#cc3b3b",
    textAlign: "center",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 2,
  },
  weekArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#385225",
    letterSpacing: -0.2,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  generateBtn: {
    backgroundColor: "#385225",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#385225",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#B4B4B4",
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 18,
  },
});
