import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import HeartIcon from "./icons/HeartIcon";
import RecipePlaceholder from "./RecipePlaceholder";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_H = SCREEN_W * 1.25;

function buildMeta(recipe) {
  const parts = [];
  const total = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (total > 0) parts.push(`${total} min`);
  if (recipe.difficulty) parts.push(recipe.difficulty);
  if (recipe.servings) parts.push(`${recipe.servings} servings`);
  return parts.join("  ·  ");
}

export default function DinnerInspirationSheet({
  recipes,
  onSave,
  onCook,
  savedIds,
  savingIds,
}) {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastText, setToastText] = useState("");
  const isAnimating = useRef(false);
  const pendingAutoAdvance = useRef(false);

  // Reset index when recipes array changes (sheet reopened with new shuffled data)
  useEffect(() => {
    setIndex(0);
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
    toastAnim.setValue(0);
    isAnimating.current = false;
    pendingAutoAdvance.current = false;
  }, [recipes]);

  const recipe = recipes[index];

  const animateNext = useCallback(() => {
    if (!recipes.length) return;

    // Allow interrupting — stop any ongoing animation and reset
    slideAnim.stopAnimation();
    fadeAnim.stopAnimation();
    isAnimating.current = true;
    pendingAutoAdvance.current = false;

    // Ensure card is visible before sliding out
    fadeAnim.setValue(1);
    slideAnim.setValue(0);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_W * 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndex((prev) => (prev + 1) % recipes.length);
      slideAnim.setValue(SCREEN_W * 0.15);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
          mass: 0.8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  }, [recipes.length, fadeAnim, slideAnim]);

  const showToast = useCallback((text) => {
    setToastText(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 200,
      }),
      Animated.delay(800),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Only auto-advance if user hasn't already skipped manually
      if (pendingAutoAdvance.current) {
        pendingAutoAdvance.current = false;
        animateNext();
      }
    });
  }, [toastAnim, animateNext]);

  const handleHeartPress = useCallback(() => {
    if (!recipe) return;
    const id = recipe.id;
    if (savedIds?.has(id) || savingIds?.has(id)) return;

    onSave?.(id);
    pendingAutoAdvance.current = true;
    showToast("Saved to your favorites");
  }, [recipe, savedIds, savingIds, onSave, showToast]);

  if (!recipes.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No dinner ideas yet</Text>
        <Text style={styles.emptySubtitle}>
          Add more recipes to get inspired
        </Text>
      </View>
    );
  }

  if (!recipe) return null;

  const imageSource = recipe.thumbnailUrl ? { uri: recipe.thumbnailUrl } : null;
  const meta = buildMeta(recipe);
  const isSaved = savedIds?.has(recipe.id);
  const isSaving = savingIds?.has(recipe.id);
  const cuisine = recipe.cuisine || recipe.dietaryInfo?.cuisine;
  const protein = recipe.nutrition?.protein;
  const calories = recipe.nutrition?.calories;

  const toastTranslateY = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });

  return (
    <View style={styles.container}>
      {/* Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {index + 1} / {recipes.length}
        </Text>
      </View>

      {/* Hero card */}
      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {imageSource ? (
          <Image source={imageSource} style={styles.heroImage} />
        ) : (
          <RecipePlaceholder title={recipe.title} variant="large" style={styles.heroImage} />
        )}

        {/* Top badges */}
        <View style={styles.badgeRow}>
          {cuisine ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cuisine}</Text>
            </View>
          ) : null}
          {protein ? (
            <View style={[styles.badge, styles.badgeProtein]}>
              <Text style={styles.badgeText}>{protein}g protein</Text>
            </View>
          ) : null}
        </View>

        {/* Gradient overlay */}
        <LinearGradient
          colors={["transparent", "transparent", "rgba(0,0,0,0.75)"]}
          locations={[0, 0.35, 1]}
          style={styles.heroGradient}
        />

        {/* Toast notification */}
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
          pointerEvents="none"
        >
          <HeartIcon width={16} height={16} color="#fff" filled />
          <Text style={styles.toastText}>{toastText}</Text>
        </Animated.View>

        {/* Info overlay */}
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {recipe.title}
          </Text>
          {meta ? <Text style={styles.heroMeta}>{meta}</Text> : null}
          {calories ? (
            <Text style={styles.heroCals}>{calories} kcal / serving</Text>
          ) : null}
        </View>
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
          onPress={animateNext}
        >
          <Text style={styles.skipText}>Not feeling it</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.heartBtn,
            isSaved && styles.heartBtnSaved,
            pressed && { transform: [{ scale: 0.9 }] },
          ]}
          onPress={handleHeartPress}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <HeartIcon width={22} height={22} color="#fff" filled={isSaved} />
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.cookBtn, pressed && { opacity: 0.85 }]}
          onPress={() => onCook?.(recipe)}
        >
          <Text style={styles.cookText}>Let's cook!</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
  },
  // Counter
  counterRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  counterText: {
    fontSize: 13,
    color: "#B4B4B4",
    fontWeight: "600",
    letterSpacing: 1,
  },
  // Hero card
  heroCard: {
    width: "100%",
    height: CARD_H,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#E8E8E8",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  // Badges
  badgeRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    backdropFilter: "blur(10px)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeProtein: {
    backgroundColor: "rgba(127, 238, 127, 0.25)",
    borderColor: "rgba(127, 238, 127, 0.4)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Toast
  toast: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(232, 64, 87, 0.9)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  // Info overlay
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 22,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroMeta: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    fontWeight: "500",
  },
  heroCals: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 3,
  },
  // Actions
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 18,
  },
  skipBtn: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888",
  },
  heartBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E84057",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E84057",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  heartBtnSaved: {
    backgroundColor: "#C43049",
  },
  cookBtn: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  cookText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
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
});
