import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Animated,
} from "react-native";
import { sc } from "../utils/deviceScale";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SearchIcon from "./icons/SearchIcon";
import { useTranslation } from "react-i18next";
import RecipePlaceholder from "./RecipePlaceholder";
import { searchRecipes, searchPublicRecipes } from "../services/recipes";

const DEBOUNCE_MS = 300;

function renderResultCard(recipe, onSelect, t) {
  const imageSource = recipe.thumbnailUrl ? { uri: recipe.thumbnailUrl } : null;
  return (
    <Pressable
      key={recipe.id}
      style={styles.resultCard}
      onPress={() => onSelect(recipe)}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.resultImage} transition={200} />
      ) : (
        <RecipePlaceholder title={recipe.title} variant="small" style={styles.resultImage} />
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.resultMeta}>
          {recipe.cuisine ? (
            <View style={styles.resultTag}>
              <Text style={styles.resultTagText}>{recipe.cuisine}</Text>
            </View>
          ) : null}
          {recipe.difficulty ? (
            <View style={styles.resultTag}>
              <Text style={styles.resultTagText}>{t(`difficulty.${recipe.difficulty.toLowerCase()}`, { defaultValue: recipe.difficulty })}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function SearchOverlay({ visible, onClose, getToken, onSelectRecipe }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [publicResults, setPublicResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { t } = useTranslation("recipe");

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Auto-focus with slight delay for modal animation
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      fadeAnim.setValue(0);
      setQuery("");
      setResults([]);
      setPublicResults([]);
      setHasSearched(false);
    }
  }, [visible]);

  const doSearch = useCallback(
    async (q) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setPublicResults([]);
        setHasSearched(false);
        return;
      }
      setIsSearching(true);
      setHasSearched(true);
      try {
        const [userRes, publicRes] = await Promise.all([
          getToken
            ? searchRecipes({ getToken, query: trimmed, limit: 15 }).catch(() => ({ results: [] }))
            : Promise.resolve({ results: [] }),
          searchPublicRecipes({ query: trimmed, limit: 15 }).catch(() => ({ results: [] })),
        ]);
        const userResults = userRes.results || [];
        const userIds = new Set(userResults.map((r) => r.id));
        // Deduplicate: don't show public results already in user results
        const filteredPublic = (publicRes.results || []).filter((r) => !userIds.has(r.id));
        setResults(userResults);
        setPublicResults(filteredPublic);
      } catch {
        setResults([]);
        setPublicResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [getToken]
  );

  const handleChangeText = useCallback(
    (text) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text.trim()) {
        setResults([]);
        setPublicResults([]);
        setHasSearched(false);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        doSearch(text);
      }, DEBOUNCE_MS);
    },
    [doSearch]
  );

  const handleSelect = useCallback(
    (recipe) => {
      Keyboard.dismiss();
      onClose();
      onSelectRecipe(recipe);
    },
    [onClose, onSelectRecipe]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setPublicResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Search panel */}
        <View style={[styles.panel, { paddingTop: insets.top + 8 }]}>
          {/* Search input row */}
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <SearchIcon width={sc(20)} height={sc(20)} color="#B4B4B4" />
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={t("search.placeholder", "Search recipes...")}
                placeholderTextColor="#B4B4B4"
                value={query}
                onChangeText={handleChangeText}
                returnKeyType="search"
                onSubmitEditing={() => doSearch(query)}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable onPress={handleClear} hitSlop={10} style={styles.clearBtn}>
                  <Text style={styles.clearText}>{"\u2715"}</Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t("search.cancel", "Cancel")}</Text>
            </Pressable>
          </View>

          {/* Results */}
          <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Loading */}
            {isSearching && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color="#385225" />
                <Text style={styles.statusText}>{t("search.searching", "Searching...")}</Text>
              </View>
            )}

            {/* No results */}
            {!isSearching && hasSearched && results.length === 0 && publicResults.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("search.emptyTitle", "No recipes found")}</Text>
                <Text style={styles.emptySubtitle}>
                  {t("search.emptySubtitle", "Try a different keyword like cuisine,\ningredient, or dish name")}
                </Text>
              </View>
            )}

            {/* Hint */}
            {!hasSearched && !isSearching && (
              <View style={styles.hintState}>
                <SearchIcon width={sc(40)} height={sc(40)} color="#D4D4D4" />
                <Text style={styles.hintText}>
                  {t("search.hintText", "Search by name, cuisine, or ingredient")}
                </Text>
              </View>
            )}

            {/* User's saved recipes */}
            {results.length > 0 && (
              <>
                {publicResults.length > 0 && (
                  <Text style={styles.sectionTitle}>{t("search.yourRecipes", "Your recipes")}</Text>
                )}
                {results.map((recipe) => renderResultCard(recipe, handleSelect, t))}
              </>
            )}

            {/* Public / suggested recipes */}
            {publicResults.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t("search.suggestedRecipes", "Suggested recipes")}</Text>
                {publicResults.map((recipe) => renderResultCard(recipe, handleSelect, t))}
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  panel: {
    backgroundColor: "#F4F5F7",
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    marginStart: 10,
    fontSize: sc(16),
    color: "#111111",
    paddingVertical: 0,
  },
  clearBtn: {
    width: sc(24),
    height: sc(24),
    borderRadius: sc(12),
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    fontSize: sc(11),
    color: "#999999",
    fontWeight: "600",
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: sc(15),
    color: "#2a5a2a",
    fontWeight: "600",
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  // Status
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  statusText: {
    fontSize: sc(14),
    color: "#999999",
  },
  // Empty
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: sc(18),
    fontWeight: "600",
    color: "#111111",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: sc(14),
    color: "#B4B4B4",
    textAlign: "center",
    lineHeight: sc(20),
  },
  // Hint
  hintState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  hintText: {
    fontSize: sc(14),
    color: "#B4B4B4",
  },
  // Section title
  sectionTitle: {
    fontSize: sc(13),
    fontWeight: "600",
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 10,
  },
  // Results
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EBEBEB",
  },
  resultImage: {
    width: sc(72),
    height: sc(72),
  },
  resultInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultTitle: {
    fontSize: sc(15),
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
  },
  resultMeta: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  resultTag: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resultTagText: {
    fontSize: sc(12),
    color: "#6b6b6b",
    fontWeight: "500",
  },
});
