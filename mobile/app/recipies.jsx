import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import FloatingNav from "../components/FloatingNav";
import SwipeNavigator from "../components/SwipeNavigator";
import RecipesHeader from "../components/recipies/RecipesHeader";
import SearchBar from "../components/SearchBar";
import RecipeCard from "../components/recipies/RecipeCard";
import BottomSheetModal from "../components/BottomSheetModal";
import SearchOverlay from "../components/SearchOverlay";
import AddRecipeSheetContent from "../components/recipies/AddRecipeSheetContent";
import CheckIcon from "../components/icons/CheckIcon";
import { useTranslation } from "react-i18next";
import { useRecipeStore } from "../store";
import { deleteRecipe } from "../services/recipes";
import { sc } from "../utils/deviceScale";

function buildMeta(recipe, t) {
  const parts = [];
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalTime > 0) parts.push(t("time.minOnly", { m: totalTime, ns: "common" }));
  if (recipe.difficulty) parts.push(t(`difficulty.${recipe.difficulty.toLowerCase()}`, { defaultValue: recipe.difficulty }));
  if (recipe.servings) parts.push(t("units.servings", { count: recipe.servings, ns: "common" }));
  return parts.join(" · ");
}

export default function RecipiesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "recipies";
  const { t } = useTranslation("recipe");
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const { getToken } = useAuth();
  const { recipes, total, isLoading, isLoadingMore, error, loadRecipes, loadMore, refresh, clearAll, toggleFavorite } =
    useRecipeStore();

  const hasMore = recipes.length < total;

  useEffect(() => {
    loadRecipes({ getToken }).catch(() => { });
  }, []);

  // Refresh when navigating back to this screen
  useEffect(() => {
    if (pathname === "/recipies") {
      refresh({ getToken }).catch(() => { });
    }
  }, [pathname]);

  const onRefresh = useCallback(() => {
    refresh({ getToken }).catch(() => { });
  }, [getToken]);

  const onEndReached = useCallback(() => {
    if (hasMore) {
      loadMore({ getToken });
    }
  }, [hasMore, getToken]);

  const handleSheetClose = () => {
    setSheetOpen(false);
    refresh({ getToken }).catch(() => { });
  };

  const handleClearAll = useCallback(() => {
    setMenuOpen(false);
    Alert.alert(
      t("list.clearAll"),
      t("list.clearConfirm", { count: total }),
      [
        { text: t("list.keepRecipes"), style: "cancel" },
        {
          text: t("list.deleteAll"),
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearAll({ getToken });
            } catch (err) {
              Alert.alert(t("errors:recipe.clearFailed"), t("tryAgain", { ns: "common" }));
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  }, [getToken, total]);

  const handleToggleFavorite = useCallback((recipeId) => {
    toggleFavorite({ recipeId, getToken }).catch(() => { });
  }, [getToken]);

  const handleEnterSelect = useCallback(() => {
    setMenuOpen(false);
    setIsSelectMode(true);
    setSelectedIds(new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === recipes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recipes.map((r) => r.id)));
    }
  }, [recipes, selectedIds.size]);

  const handleBulkDelete = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      t("list.bulkDeleteTitle"),
      t("list.bulkDeleteConfirm", { count }),
      [
        { text: t("buttons.cancel", { ns: "common" }), style: "cancel" },
        {
          text: t("list.deleteSelected", { count }),
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const results = await Promise.allSettled(
                [...selectedIds].map((id) => deleteRecipe({ recipeId: id, getToken }))
              );
              const failCount = results.filter((r) => r.status === "rejected").length;
              exitSelectMode();
              await refresh({ getToken });
              if (failCount > 0) {
                Alert.alert(t("errors:recipe.deleteFailed"), t("errors:recipe.partialDelete", { count: failCount }));
              }
            } catch (err) {
              Alert.alert(t("errors:recipe.deleteBulkFailed"), t("tryAgain", { ns: "common" }));
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [selectedIds, getToken]);

  const renderItem = useCallback(({ item }) => {
    if (isSelectMode) {
      const isSelected = selectedIds.has(item.id);
      return (
        <Pressable onPress={() => toggleSelection(item.id)}>
          <View style={{ opacity: isSelected ? 1 : 0.6 }}>
            <RecipeCard
              title={item.title}
              meta={buildMeta(item, t)}
              thumbnailUrl={item.thumbnailUrl}
              isFavorite={item.isFavorite}
              onPress={() => toggleSelection(item.id)}
              onToggleFavorite={() => { }}
            />
          </View>
          <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxActive]}>
            {isSelected && <CheckIcon width={sc(14)} height={sc(14)} color="#fff" />}
          </View>
        </Pressable>
      );
    }
    return (
      <RecipeCard
        title={item.title}
        meta={buildMeta(item, t)}
        thumbnailUrl={item.thumbnailUrl}
        isFavorite={item.isFavorite}
        onPress={() => router.push(`/recipe/${item.id}`)}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
      />
    );
  }, [router, handleToggleFavorite, isSelectMode, selectedIds, toggleSelection, t]);

  const ListHeader = isSelectMode ? (
    <View style={styles.selectBar}>
      <Pressable onPress={exitSelectMode} hitSlop={8}>
        <Text style={styles.selectBarCancel}>{t("buttons.cancel", { ns: "common" })}</Text>
      </Pressable>
      <Text style={styles.selectBarCount}>
        {t("list.selected", { count: selectedIds.size })}
      </Text>
      <Pressable onPress={handleSelectAll} hitSlop={8}>
        <Text style={styles.selectAllBtn}>
          {selectedIds.size === recipes.length ? t("buttons.deselectAll", { ns: "common" }) : t("buttons.selectAll", { ns: "common" })}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.deleteBtn, selectedIds.size === 0 && { opacity: 0.4 }]}
        onPress={handleBulkDelete}
        disabled={selectedIds.size === 0 || isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.deleteBtnText}>
            {selectedIds.size > 0 ? t("list.deleteSelected", { count: selectedIds.size }) : t("buttons.delete", { ns: "common" })}
          </Text>
        )}
      </Pressable>
    </View>
  ) : (
    <>
      <RecipesHeader
        subtitle={t("list.title", { count: total })}
        onPressMore={() => setMenuOpen(true)}
        onPressAdd={() => setSheetOpen(true)}
      />
      <View style={{ marginTop: 10, marginBottom: 10 }}>
        <SearchBar
          placeholder={t("list.searchPlaceholder")}
          onPress={() => setSearchOpen(true)}
        />
      </View>
    </>
  );

  const ListEmpty = isLoading ? (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#385225" />
      <Text style={styles.loadingText}>{t("list.loading")}</Text>
    </View>
  ) : error ? (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  ) : (
    <View style={styles.centered}>
      <Text style={styles.emptyTitle}>{t("list.empty")}</Text>
      <Text style={styles.emptySubtitle}>{t("list.emptySubtitle")}</Text>
    </View>
  );

  const ListFooter = isLoadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color="#385225" />
      <Text style={styles.loadingText}>{t("list.loadingMore")}</Text>
    </View>
  ) : null;

  return (
    <View style={styles.screen}>
      <SwipeNavigator>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            ListFooterComponent={ListFooter}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && recipes.length > 0}
                onRefresh={onRefresh}
                tintColor="#385225"
              />
            }
          />
        </SafeAreaView>
      </SwipeNavigator>

      <FloatingNav
        onPressItem={(key) => {
          if (key !== activeKey) router.replace(`/${key}`);
        }}
        onPressPlus={() => setSheetOpen(true)}
        activeKey={activeKey}
      />

      <BottomSheetModal
        visible={isSheetOpen}
        onClose={handleSheetClose}
      >
        <AddRecipeSheetContent onPressBack={handleSheetClose} />
      </BottomSheetModal>

      {/* Menu sheet */}
      <BottomSheetModal visible={isMenuOpen} onClose={() => setMenuOpen(false)}>
        <View style={styles.menuSheet}>
          <Text style={styles.menuTitle}>{t("list.menuTitle")}</Text>
          <Pressable
            style={[styles.menuOption, styles.menuOptionGreen]}
            onPress={handleEnterSelect}
            disabled={total === 0}
          >
            <View style={[styles.menuOptionIcon, styles.menuOptionIconGreen]}>
              <CheckIcon width={sc(16)} height={sc(16)} color="#385225" />
            </View>
            <View style={styles.menuOptionInfo}>
              <Text style={[styles.menuOptionLabel, styles.menuOptionLabelGreen, total === 0 && styles.menuOptionDisabled]}>
                {t("buttons.select", { ns: "common" })}
              </Text>
              <Text style={styles.menuOptionDesc}>{t("list.selectToDelete")}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.menuOption}
            onPress={handleClearAll}
            disabled={total === 0 || isClearing}
          >
            <View style={styles.menuOptionIcon}>
              {isClearing ? (
                <ActivityIndicator size="small" color="#cc3b3b" />
              ) : (
                <Text style={styles.menuOptionIconText}>{"\u2715"}</Text>
              )}
            </View>
            <View style={styles.menuOptionInfo}>
              <Text style={[styles.menuOptionLabel, total === 0 && styles.menuOptionDisabled]}>
                {t("list.clearAll")}
              </Text>
              <Text style={styles.menuOptionDesc}>
                {total === 0 ? t("list.noRecipesToRemove") : t("list.removeAll", { count: total })}
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.menuDismiss} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuDismissText}>{t("buttons.cancel", { ns: "common" })}</Text>
          </Pressable>
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
    backgroundColor: "#f4f5f7",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 140,
    flexGrow: 1,
  },
  centered: {
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: sc(14),
    color: "#6b6b6b",
  },
  errorText: {
    fontSize: sc(14),
    color: "#cc3b3b",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: sc(20),
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.05,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: sc(14),
    color: "#B4B4B4",
    textAlign: "center",
    letterSpacing: -0.05,
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  // Menu sheet
  menuSheet: {
    paddingBottom: 20,
  },
  menuTitle: {
    fontSize: sc(18),
    fontWeight: "600",
    color: "#111111",
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  menuOptionIcon: {
    width: sc(40),
    height: sc(40),
    borderRadius: sc(20),
    backgroundColor: "#FDDEDE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuOptionIconText: {
    fontSize: sc(16),
    color: "#cc3b3b",
    fontWeight: "600",
  },
  menuOptionInfo: {
    flex: 1,
  },
  menuOptionLabel: {
    fontSize: sc(16),
    fontWeight: "600",
    color: "#cc3b3b",
  },
  menuOptionDisabled: {
    color: "#C0C0C0",
  },
  menuOptionDesc: {
    fontSize: sc(13),
    color: "#999999",
    marginTop: 2,
  },
  menuDismiss: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#F4F5F7",
  },
  menuDismissText: {
    fontSize: sc(15),
    fontWeight: "500",
    color: "#6b6b6b",
  },
  // Green menu option variant
  menuOptionGreen: {
    backgroundColor: "#F2F7ED",
  },
  menuOptionIconGreen: {
    backgroundColor: "#DDE9CF",
  },
  menuOptionLabelGreen: {
    color: "#385225",
  },
  // Selection mode
  selectBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 8,
  },
  selectBarCancel: {
    fontSize: sc(15),
    fontWeight: "500",
    color: "#6b6b6b",
  },
  selectBarCount: {
    fontSize: sc(15),
    fontWeight: "600",
    color: "#111111",
  },
  selectAllBtn: {
    fontSize: sc(14),
    fontWeight: "600",
    color: "#385225",
  },
  deleteBtn: {
    backgroundColor: "#cc3b3b",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  deleteBtnText: {
    fontSize: sc(14),
    fontWeight: "600",
    color: "#ffffff",
  },
  selectCheckbox: {
    position: "absolute",
    top: 12,
    left: 12,
    width: sc(26),
    height: sc(26),
    borderRadius: sc(13),
    borderWidth: 2,
    borderColor: "#B4B4B4",
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectCheckboxActive: {
    backgroundColor: "#385225",
    borderColor: "#385225",
  },
});
