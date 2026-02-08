import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { fetchRecipeById, deleteRecipe, cloneRecipe } from "../../services/recipes";
import { createShoppingList, addFromRecipe } from "../../services/shopping";
import { useRecipeStore } from "../../store";
import ArrowLeftIcon from "../../components/icons/ArrowLeftIcon";

// ─── Design tokens ───────────────────────────────────────────────
const C = {
  bg: "#F4F5F7",
  card: "#ffffff",
  textPrimary: "#111111",
  textSecondary: "#6b6b6b",
  textMeta: "#B4B4B4",
  greenDark: "#385225",
  greenBright: "#7FEF80",
  greenLight: "#DFF7C4",
  orangeLight: "#FDC597",
  orangeDark: "#7A4A21",
  blueDark: "#28457A",
  blueLight: "#9BC6FB",
  purpleLight: "#CCB7F9",
  purpleDark: "#4A2D73",
  border: "#EAEAEA",
  error: "#cc3b3b",
};

const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
};

// ─── Helpers ─────────────────────────────────────────────────────
function formatTime(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s ? `${m}m ${s}s` : `${m} min`;
}

// ─── Sub-components ──────────────────────────────────────────────

function MetaPill({ label, color }) {
  return (
    <View style={[s.pill, color && { backgroundColor: color }]}>
      <Text style={s.pillText}>{label}</Text>
    </View>
  );
}

function SectionTitle({ children }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function IngredientRow({ ingredient, isLast }) {
  const qty = ingredient.quantity
    ? `${ingredient.quantity}${ingredient.unit ? ` ${ingredient.unit}` : ""}`
    : null;

  return (
    <View style={[s.ingredientRow, !isLast && s.ingredientBorder]}>
      <View style={s.ingredientDot} />
      <View style={s.ingredientContent}>
        <Text style={s.ingredientName}>
          {qty ? <Text style={s.ingredientQty}>{qty} </Text> : null}
          {ingredient.name}
          {ingredient.isOptional ? (
            <Text style={s.ingredientOptional}> (optional)</Text>
          ) : null}
        </Text>
        {ingredient.notes ? (
          <Text style={s.ingredientNotes}>{ingredient.notes}</Text>
        ) : null}
      </View>
    </View>
  );
}

function StepRow({ step }) {
  return (
    <View style={s.stepRow}>
      <View style={s.stepNumber}>
        <Text style={s.stepNumberText}>{step.stepNumber}</Text>
      </View>
      <View style={s.stepContent}>
        <Text style={s.stepInstruction}>{step.instruction}</Text>
        {(step.technique || step.durationSeconds) ? (
          <View style={s.stepMetaRow}>
            {step.technique ? (
              <View style={s.stepChip}>
                <Text style={s.stepChipText}>{step.technique}</Text>
              </View>
            ) : null}
            {step.durationSeconds ? (
              <View style={s.stepChip}>
                <Text style={s.stepChipText}>{formatDuration(step.durationSeconds)}</Text>
              </View>
            ) : null}
            {step.temperature ? (
              <View style={s.stepChip}>
                <Text style={s.stepChipText}>{step.temperature}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {step.tip ? (
          <View style={s.tipBanner}>
            <Text style={s.tipText}>{step.tip}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function NutritionItem({ label, value, unit }) {
  if (value == null) return null;
  return (
    <View style={s.nutritionItem}>
      <Text style={s.nutritionValue}>{Math.round(value)}{unit}</Text>
      <Text style={s.nutritionLabel}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();

  const [recipe, setRecipe] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const refreshList = useRecipeStore((state) => state.refresh);
  const isOwn = recipe && !recipe.isPublic;

  const handleDelete = () => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe?.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteRecipe({ recipeId: id, getToken });
              await refreshList({ getToken });
              router.back();
            } catch (err) {
              setIsDeleting(false);
              Alert.alert("Error", err?.message || "Failed to delete recipe");
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await cloneRecipe({ recipeId: id, getToken });
      await refreshList({ getToken });
      setSaved(true);
    } catch (err) {
      const msg = err?.message || "";
      // Backend returns 409 if already cloned
      if (msg.includes("already")) {
        setSaved(true);
      } else {
        Alert.alert("Error", msg || "Failed to save recipe");
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await fetchRecipeById({ recipeId: id, getToken });
        if (!cancelled) setRecipe(data);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load recipe");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Loading
  if (isLoading) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.centered}>
          <ActivityIndicator size="large" color={C.greenDark} />
          <Text style={s.loadingText}>Loading recipe…</Text>
        </SafeAreaView>
      </View>
    );
  }

  // Error
  if (error || !recipe) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safeTop} edges={["top"]}>
          <BackButton onPress={() => router.back()} />
          <View style={s.centered}>
            <Text style={s.errorText}>{error || "Recipe not found"}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const ingredients = recipe.ingredients || [];
  const steps = recipe.steps || [];
  const nutrition = recipe.nutrition;
  const dietary = recipe.dietaryInfo;

  // Group ingredients by section
  const sections = {};
  ingredients.forEach((ing) => {
    const key = ing.section || "Ingredients";
    if (!sections[key]) sections[key] = [];
    sections[key].push(ing);
  });
  const sectionEntries = Object.entries(sections);

  // Dietary badges
  const dietaryBadges = [];
  if (dietary) {
    if (dietary.isVegetarian) dietaryBadges.push("Vegetarian");
    if (dietary.isVegan) dietaryBadges.push("Vegan");
    if (dietary.isGlutenFree) dietaryBadges.push("Gluten-Free");
    if (dietary.isDairyFree) dietaryBadges.push("Dairy-Free");
    if (dietary.isNutFree) dietaryBadges.push("Nut-Free");
    if (dietary.isKeto) dietaryBadges.push("Keto");
    if (dietary.isHalal) dietaryBadges.push("Halal");
    if (dietary.isKosher) dietaryBadges.push("Kosher");
  }

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Hero */}
        {recipe.thumbnailUrl ? (
          <View>
            <Image source={{ uri: recipe.thumbnailUrl }} style={s.heroImage} />
            <SafeAreaView style={s.heroOverlay} edges={["top"]}>
              <BackButton light onPress={() => router.back()} />
            </SafeAreaView>
          </View>
        ) : (
          <SafeAreaView style={s.noImageHeader} edges={["top"]}>
            <BackButton onPress={() => router.back()} />
          </SafeAreaView>
        )}

        <View style={s.body}>
          {/* Title & Description */}
          <Text style={s.title}>{recipe.title}</Text>
          {recipe.description ? (
            <Text style={s.description}>{recipe.description}</Text>
          ) : null}

          {/* Meta Row */}
          <View style={s.metaRow}>
            {totalTime > 0 && <MetaPill label={formatTime(totalTime)} />}
            {recipe.servings ? <MetaPill label={`${recipe.servings} servings`} /> : null}
            {recipe.difficulty ? (
              <MetaPill label={recipe.difficulty} />
            ) : null}
            {recipe.cuisine ? (
              <MetaPill label={recipe.cuisine} color={C.greenLight} />
            ) : null}
            {recipe.sourceType ? (
              <MetaPill label={recipe.sourceType} color={C.blueLight} />
            ) : null}
          </View>

          {/* Tags */}
          {recipe.tags?.length > 0 ? (
            <View style={s.tagsRow}>
              {recipe.tags.map((tag, i) => (
                <View key={i} style={s.tag}>
                  <Text style={s.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Dietary Badges */}
          {dietaryBadges.length > 0 ? (
            <View style={s.dietaryRow}>
              {dietaryBadges.map((badge, i) => (
                <View key={i} style={s.dietaryBadge}>
                  <Text style={s.dietaryText}>{badge}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Nutrition */}
          {nutrition && (nutrition.calories || nutrition.protein || nutrition.carbs || nutrition.fat) ? (
            <View style={s.card}>
              <SectionTitle>Nutrition</SectionTitle>
              <View style={s.nutritionGrid}>
                <NutritionItem label="Calories" value={nutrition.calories} unit="" />
                <NutritionItem label="Protein" value={nutrition.protein} unit="g" />
                <NutritionItem label="Carbs" value={nutrition.carbs} unit="g" />
                <NutritionItem label="Fat" value={nutrition.fat} unit="g" />
                <NutritionItem label="Fiber" value={nutrition.fiber} unit="g" />
              </View>
            </View>
          ) : null}

          {/* Ingredients */}
          {ingredients.length > 0 ? (
            <View style={s.card}>
              <View style={s.ingredientsHeader}>
                <View>
                  <SectionTitle>Ingredients</SectionTitle>
                  <Text style={s.countText}>{ingredients.length} items</Text>
                </View>
                <Pressable
                  style={s.addToListBtn}
                  onPress={async () => {
                    setIsAddingToList(true);
                    try {
                      // Create a new shopping list named after the recipe
                      const list = await createShoppingList({
                        getToken,
                        name: recipe.title,
                        icon: "🍽️",
                      });
                      // Add all recipe ingredients to the list
                      await addFromRecipe({
                        getToken,
                        listId: list.id,
                        recipeId: id,
                      });
                      Alert.alert(
                        "Shopping List Created",
                        `Added ${ingredients.length} ingredients to "${recipe.title}"`
                      );
                    } catch (err) {
                      const msg = err?.message || "";
                      if (msg.includes("already")) {
                        Alert.alert("Already Added", "This recipe is already in a shopping list");
                      } else {
                        Alert.alert("Error", msg || "Failed to create shopping list");
                      }
                    } finally {
                      setIsAddingToList(false);
                    }
                  }}
                  disabled={isAddingToList}
                >
                  {isAddingToList ? (
                    <ActivityIndicator size="small" color={C.greenDark} />
                  ) : (
                    <Text style={s.addToListBtnText}>+ Shop</Text>
                  )}
                </Pressable>
              </View>
              {sectionEntries.map(([section, items], si) => (
                <View key={si}>
                  {sectionEntries.length > 1 ? (
                    <Text style={s.ingredientSection}>{section}</Text>
                  ) : null}
                  {items.map((ing, i) => (
                    <IngredientRow
                      key={ing.id || i}
                      ingredient={ing}
                      isLast={i === items.length - 1}
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {/* Steps */}
          {steps.length > 0 ? (
            <View style={s.card}>
              <SectionTitle>Instructions</SectionTitle>
              <Text style={s.countText}>{steps.length} steps</Text>
              {steps
                .sort((a, b) => a.stepNumber - b.stepNumber)
                .map((step, i) => (
                  <StepRow key={step.id || i} step={step} />
                ))}
            </View>
          ) : null}

          {/* Actions */}
          <View style={s.actionsZone}>
            {isOwn ? (
              <Pressable
                style={({ pressed }) => [
                  s.deleteButton,
                  pressed && s.deleteButtonPressed,
                ]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={C.error} />
                ) : (
                  <Text style={s.deleteButtonText}>Delete Recipe</Text>
                )}
              </Pressable>
            ) : saved ? (
              <View style={s.savedBanner}>
                <Text style={s.savedText}>Saved to your collection</Text>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  s.saveButton,
                  pressed && s.saveButtonPressed,
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={s.saveButtonText}>Save to My Recipes</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Back Button ─────────────────────────────────────────────────

function BackButton({ onPress, light }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.backButton, light && s.backButtonLight]}
    >
      <ArrowLeftIcon
        width={10}
        height={10}
        color={light ? "#ffffff" : C.textSecondary}
      />
      <Text style={[s.backButtonText, light && s.backButtonTextLight]}>
        Back
      </Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.textSecondary,
  },
  errorText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.error,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // Hero
  heroImage: {
    width: "100%",
    height: 300,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  noImageHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  safeTop: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Back button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backButtonLight: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: FONT.medium,
    color: C.textSecondary,
    letterSpacing: -0.05,
  },
  backButtonTextLight: {
    color: "#ffffff",
  },

  // Body
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: FONT.semibold,
    color: C.textPrimary,
    letterSpacing: -0.05,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.05,
  },

  // Meta pills
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  pill: {
    backgroundColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: C.textSecondary,
    textTransform: "capitalize",
    letterSpacing: -0.05,
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: C.textMeta,
    letterSpacing: -0.05,
  },

  // Dietary
  dietaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  dietaryBadge: {
    backgroundColor: C.greenLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dietaryText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: C.greenDark,
    letterSpacing: -0.05,
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONT.semibold,
    color: C.textPrimary,
    letterSpacing: -0.05,
  },
  countText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: C.textMeta,
    marginTop: 4,
    marginBottom: 14,
    letterSpacing: -0.05,
  },
  ingredientsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  addToListBtn: {
    backgroundColor: C.greenLight,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: "center",
  },
  addToListBtnText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: C.greenDark,
    letterSpacing: -0.05,
  },

  // Ingredients
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  ingredientBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.greenBright,
    marginTop: 6,
    marginRight: 12,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: C.textPrimary,
    lineHeight: 22,
    letterSpacing: -0.05,
  },
  ingredientQty: {
    fontFamily: FONT.semibold,
  },
  ingredientOptional: {
    fontFamily: FONT.regular,
    color: C.textMeta,
    fontStyle: "italic",
  },
  ingredientNotes: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: C.textMeta,
    marginTop: 2,
    fontStyle: "italic",
    letterSpacing: -0.05,
  },
  ingredientSection: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: C.greenDark,
    marginTop: 14,
    marginBottom: 4,
    letterSpacing: -0.05,
  },

  // Steps
  stepRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: C.textPrimary,
    lineHeight: 24,
    letterSpacing: -0.05,
  },
  stepMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  stepChip: {
    backgroundColor: C.bg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepChipText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: C.textSecondary,
    textTransform: "capitalize",
    letterSpacing: -0.05,
  },
  tipBanner: {
    backgroundColor: "#FFF9F0",
    borderLeftWidth: 3,
    borderLeftColor: C.orangeLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  tipText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: C.orangeDark,
    fontStyle: "italic",
    lineHeight: 20,
    letterSpacing: -0.05,
  },

  // Nutrition
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  nutritionItem: {
    backgroundColor: C.bg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    minWidth: 70,
  },
  nutritionValue: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    color: C.textPrimary,
    letterSpacing: -0.05,
  },
  nutritionLabel: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: C.textMeta,
    marginTop: 2,
    letterSpacing: -0.05,
  },

  // Actions zone
  actionsZone: {
    marginTop: 36,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    alignItems: "center",
  },
  deleteButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F0D0D0",
    backgroundColor: "#FFF5F5",
  },
  deleteButtonPressed: {
    backgroundColor: "#FFE8E8",
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.error,
    letterSpacing: -0.05,
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    backgroundColor: C.greenBright,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: C.greenDark,
    letterSpacing: -0.05,
  },
  savedBanner: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    backgroundColor: C.greenLight,
  },
  savedText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.greenDark,
    letterSpacing: -0.05,
  },
});
