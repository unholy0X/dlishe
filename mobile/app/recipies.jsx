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
import { useRecipeStore } from "../store";
import { deleteRecipe } from "../services/recipes";

function buildMeta(recipe) {
  const parts = [];
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalTime > 0) parts.push(`${totalTime} min`);
  if (recipe.difficulty) parts.push(recipe.difficulty);
  if (recipe.servings) parts.push(`${recipe.servings} servings`);
  return parts.join(" · ");
}

export default function RecipiesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "recipies";
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
    loadRecipes({ getToken });
  }, []);

  // Refresh when navigating back to this screen
  useEffect(() => {
    if (pathname === "/recipies") {
      refresh({ getToken });
    }
  }, [pathname]);

  const onRefresh = useCallback(() => {
    refresh({ getToken });
  }, [getToken]);

  const onEndReached = useCallback(() => {
    if (hasMore) {
      loadMore({ getToken });
    }
  }, [hasMore, getToken]);

  const handleSheetClose = () => {
    setSheetOpen(false);
    refresh({ getToken }).catch(() => {});
  };

  const handleClearAll = useCallback(() => {
    setMenuOpen(false);
    Alert.alert(
      "Reset Recipes",
      `This will permanently delete all ${total} recipe${total !== 1 ? "s" : ""}. This can't be undone.`,
      [
        { text: "Keep Recipes", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearAll({ getToken });
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to clear recipes");
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  }, [getToken, total]);

  const handleToggleFavorite = useCallback((recipeId) => {
    toggleFavorite({ recipeId, getToken });
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
      "Delete Recipes",
      `Permanently delete ${count} recipe${count !== 1 ? "s" : ""}? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Delete ${count}`,
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
                Alert.alert("Partial Failure", `Failed to delete ${failCount} recipe${failCount !== 1 ? "s" : ""}. Please try again.`);
              }
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to delete recipes");
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
              meta={buildMeta(item)}
              thumbnailUrl={item.thumbnailUrl}
              isFavorite={item.isFavorite}
              onPress={() => toggleSelection(item.id)}
              onToggleFavorite={() => {}}
            />
          </View>
          <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxActive]}>
            {isSelected && <CheckIcon width={14} height={14} color="#fff" />}
          </View>
        </Pressable>
      );
    }
    return (
      <RecipeCard
        title={item.title}
        meta={buildMeta(item)}
        thumbnailUrl={item.thumbnailUrl}
        isFavorite={item.isFavorite}
        onPress={() => router.push(`/recipe/${item.id}`)}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
      />
    );
  }, [router, handleToggleFavorite, isSelectMode, selectedIds, toggleSelection]);

  const ListHeader = isSelectMode ? (
    <View style={styles.selectBar}>
      <Pressable onPress={exitSelectMode} hitSlop={8}>
        <Text style={styles.selectBarCancel}>Cancel</Text>
      </Pressable>
      <Text style={styles.selectBarCount}>
        {selectedIds.size} selected
      </Text>
      <Pressable onPress={handleSelectAll} hitSlop={8}>
        <Text style={styles.selectAllBtn}>
          {selectedIds.size === recipes.length ? "Deselect All" : "Select All"}
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
            Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Text>
        )}
      </Pressable>
    </View>
  ) : (
    <>
      <RecipesHeader
        subtitle={`${total} recipe${total !== 1 ? "s" : ""} saved`}
        onPressMore={() => setMenuOpen(true)}
        onPressAdd={() => setSheetOpen(true)}
      />
      <View style={{ marginTop: 10, marginBottom: 10 }}>
        <SearchBar
          placeholder="Search for a recipe"
          onPress={() => setSearchOpen(true)}
        />
      </View>
    </>
  );

  const ListEmpty = isLoading ? (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#385225" />
      <Text style={styles.loadingText}>Loading recipes…</Text>
    </View>
  ) : error ? (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  ) : (
    <View style={styles.centered}>
      <Text style={styles.emptyTitle}>No recipes yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap + to add your first recipe
      </Text>
    </View>
  );

  const ListFooter = isLoadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color="#385225" />
      <Text style={styles.loadingText}>Loading more…</Text>
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
          <Text style={styles.menuTitle}>Recipe Options</Text>
          <Pressable
            style={[styles.menuOption, styles.menuOptionGreen]}
            onPress={handleEnterSelect}
            disabled={total === 0}
          >
            <View style={[styles.menuOptionIcon, styles.menuOptionIconGreen]}>
              <CheckIcon width={16} height={16} color="#385225" />
            </View>
            <View style={styles.menuOptionInfo}>
              <Text style={[styles.menuOptionLabel, styles.menuOptionLabelGreen, total === 0 && styles.menuOptionDisabled]}>
                Select
              </Text>
              <Text style={styles.menuOptionDesc}>
                Select recipes to delete
              </Text>
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
                Reset Recipes
              </Text>
              <Text style={styles.menuOptionDesc}>
                {total === 0 ? "No recipes to remove" : `Remove all ${total} recipe${total !== 1 ? "s" : ""}`}
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.menuDismiss} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuDismissText}>Cancel</Text>
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
    fontSize: 14,
    color: "#6b6b6b",
  },
  errorText: {
    fontSize: 14,
    color: "#cc3b3b",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.05,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
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
    fontSize: 18,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FDDEDE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuOptionIconText: {
    fontSize: 16,
    color: "#cc3b3b",
    fontWeight: "600",
  },
  menuOptionInfo: {
    flex: 1,
  },
  menuOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cc3b3b",
  },
  menuOptionDisabled: {
    color: "#C0C0C0",
  },
  menuOptionDesc: {
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: "500",
    color: "#6b6b6b",
  },
  selectBarCount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  selectAllBtn: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  selectCheckbox: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
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
