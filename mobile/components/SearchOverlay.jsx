import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SearchIcon from "./icons/SearchIcon";
import RecipePlaceholder from "./RecipePlaceholder";
import { searchRecipes } from "../services/recipes";

const DEBOUNCE_MS = 300;

export default function SearchOverlay({ visible, onClose, getToken, onSelectRecipe }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      setHasSearched(false);
    }
  }, [visible]);

  const doSearch = useCallback(
    async (q) => {
      if (!q.trim() || !getToken) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      setIsSearching(true);
      setHasSearched(true);
      try {
        const data = await searchRecipes({ getToken, query: q.trim(), limit: 15 });
        setResults(data.results || []);
      } catch {
        setResults([]);
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
              <SearchIcon width={20} height={20} color="#B4B4B4" />
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Search your recipes..."
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
              <Text style={styles.cancelText}>Cancel</Text>
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
                <Text style={styles.statusText}>Searching...</Text>
              </View>
            )}

            {/* No results */}
            {!isSearching && hasSearched && results.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No recipes found</Text>
                <Text style={styles.emptySubtitle}>
                  Try a different keyword like cuisine,{"\n"}ingredient, or dish name
                </Text>
              </View>
            )}

            {/* Hint */}
            {!hasSearched && !isSearching && (
              <View style={styles.hintState}>
                <SearchIcon width={40} height={40} color="#D4D4D4" />
                <Text style={styles.hintText}>
                  Search by name, cuisine, or ingredient
                </Text>
              </View>
            )}

            {/* Results list */}
            {results.map((recipe) => {
              const imageSource = recipe.thumbnailUrl
                ? { uri: recipe.thumbnailUrl }
                : null;

              return (
                <Pressable
                  key={recipe.id}
                  style={styles.resultCard}
                  onPress={() => handleSelect(recipe)}
                >
                  {imageSource ? (
                    <Image source={imageSource} style={styles.resultImage} />
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
                          <Text style={styles.resultTagText}>{recipe.difficulty}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
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
    marginLeft: 10,
    fontSize: 16,
    color: "#111111",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    fontSize: 11,
    color: "#999999",
    fontWeight: "600",
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
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
    fontSize: 14,
    color: "#999999",
  },
  // Empty
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#B4B4B4",
    textAlign: "center",
    lineHeight: 20,
  },
  // Hint
  hintState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  hintText: {
    fontSize: 14,
    color: "#B4B4B4",
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
    width: 72,
    height: 72,
  },
  resultInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultTitle: {
    fontSize: 15,
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
    fontSize: 11,
    color: "#6b6b6b",
    fontWeight: "500",
  },
});
