import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import Svg, { Path, Circle } from "react-native-svg";
import RecipePlaceholder from "../RecipePlaceholder";
import BottomSheetModal from "../BottomSheetModal";
import { useTranslation } from "react-i18next";

function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#B4B4B4" strokeWidth={2} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8" />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}

function buildMeta(recipe, t) {
  const parts = [];
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalTime > 0) parts.push(t("time.minOnly", { m: totalTime, ns: "common" }));
  if (recipe.difficulty) parts.push(t(`difficulty.${recipe.difficulty.toLowerCase()}`, { ns: "recipe", defaultValue: recipe.difficulty }));
  return parts.join(" \u00B7 ");
}

export default function AddRecipeSheet({ visible, onClose, recipes = [], isLoading, onSelect }) {
  const { t } = useTranslation("mealPlan");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visible) setSearch("");
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter((r) => r.title?.toLowerCase().includes(q));
  }, [recipes, search]);

  const renderItem = useCallback(({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.recipeRow, pressed && { backgroundColor: "#F4F5F7" }]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.thumbWrap}>
        <RecipePlaceholder title={item.title} variant="small" style={styles.thumb} />
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumb}
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.recipeTitle} numberOfLines={2}>{item.title}</Text>
        {buildMeta(item, t) ? (
          <Text style={styles.recipeMeta}>{buildMeta(item, t)}</Text>
        ) : null}
      </View>
      <View style={styles.addIndicator}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#385225" strokeWidth={2.5} strokeLinecap="round">
          <Path d="M12 5v14M5 12h14" />
        </Svg>
      </View>
    </Pressable>
  ), [onSelect, t]);

  return (
    <BottomSheetModal visible={visible} onClose={onClose} customScroll>
      {({ onScroll, scrollEnabled }) => (
        <>
          <Text style={styles.title}>{t("addSheet.title", "Add Recipe")}</Text>

          <View style={styles.searchWrap}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder={t("addSheet.searchPlaceholder", "Search your recipes...")}
              placeholderTextColor="#B4B4B4"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#385225" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {search ? t("addSheet.emptyMatch", "No recipes match your search") : t("addSheet.emptySaved", "No saved recipes")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? t("addSheet.tryDifferent", "Try a different search term")
                  : t("addSheet.extractFirst", "Extract or create a recipe first")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEnabled={scrollEnabled}
              scrollEventThrottle={16}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 10,
    fontSize: 15,
    color: "#111111",
    letterSpacing: -0.1,
  },
  loading: {
    alignItems: "center",
    paddingVertical: 40,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 50,
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
    maxWidth: 220,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 20,
  },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
  },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
  },
  thumb: {
    width: 52,
    height: 52,
    position: "absolute",
    top: 0,
    left: 0,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
  },
  recipeMeta: {
    fontSize: 12,
    color: "#6b6b6b",
    marginTop: 2,
  },
  addIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EAF4E0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
