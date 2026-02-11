import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
  fetchRecipeById,
  deleteRecipe,
  cloneRecipe,
} from "../../services/recipes";
import {
  createShoppingList,
  addFromRecipe,
  deleteShoppingList,
} from "../../services/shopping";
import { useRecipeStore, useShoppingStore } from "../../store";
import ArrowLeftIcon from "../../components/icons/ArrowLeftIcon";
import RecipePlaceholder from "../../components/RecipePlaceholder";
import PrepChecklistSheet from "../../components/recipies/PrepShecklistSheet";
import StepTimerSheet from "../../components/recipies/StepTimerSheet";
import DoneSheet from "../../components/recipies/DoneSheet";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

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

// ─── Icons ───────────────────────────────────────────────────────
const PlayIcon = ({ size = 14, color = "#385225" }) => (
  <Svg width={size} height={size + 1} viewBox="0 0 13 14" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.3101 4.92362C12.646 5.6658 12.646 7.58702 11.3101 8.32921L2.89382 13.0048C1.59551 13.7262 -8.06676e-05 12.7874 -8.06027e-05 11.3021L-8.01939e-05 1.95072C-8.0129e-05 0.465462 1.59551 -0.473371 2.89382 0.247932L11.3101 4.92362Z"
      fill={color}
    />
  </Svg>
);

const DeleteIcon = ({ size = 17, color = "#FF0000" }) => (
  <Svg width={size} height={size} viewBox="0 0 17 17" fill="none">
    <Path
      d="M13.8125 3.89587L13.3735 10.997C13.2613 12.8112 13.2053 13.7184 12.7506 14.3706C12.5257 14.6931 12.2362 14.9652 11.9005 15.1697C11.2215 15.5834 10.3126 15.5834 8.49483 15.5834C6.67471 15.5834 5.76463 15.5834 5.08516 15.1689C4.74923 14.9641 4.45967 14.6914 4.2349 14.3684C3.78029 13.7152 3.72544 12.8068 3.61577 10.99L3.1875 3.89587"
      stroke={color}
      strokeLinecap="round"
    />
    <Path
      d="M2.125 3.89579H14.875M11.3728 3.89579L10.8893 2.89827C10.568 2.23564 10.4074 1.90433 10.1304 1.6977C10.069 1.65186 10.0039 1.61109 9.93579 1.57579C9.62901 1.41663 9.26082 1.41663 8.52444 1.41663C7.76957 1.41663 7.39217 1.41663 7.08027 1.58246C7.01115 1.61922 6.94519 1.66164 6.88308 1.70929C6.60283 1.92429 6.44628 2.26772 6.13318 2.9546L5.70415 3.89579"
      stroke={color}
      strokeLinecap="round"
    />
    <Path d="M6.729 11.6875V7.4375" stroke={color} strokeLinecap="round" />
    <Path d="M10.2708 11.6875V7.4375" stroke={color} strokeLinecap="round" />
  </Svg>
);

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
        {step.technique || step.durationSeconds ? (
          <View style={s.stepMetaRow}>
            {step.technique ? (
              <View style={s.stepChip}>
                <Text style={s.stepChipText}>{step.technique}</Text>
              </View>
            ) : null}
            {step.durationSeconds ? (
              <View style={s.stepChip}>
                <Text style={s.stepChipText}>
                  {formatDuration(step.durationSeconds)}
                </Text>
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
      <Text style={s.nutritionValue}>
        {Math.round(value)}
        {unit}
      </Text>
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

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cooking mode state
  const [cookingOpen, setCookingOpen] = useState(false);
  const [cookingPhase, setCookingPhase] = useState("prep");
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState({});

  const refreshList = useRecipeStore((state) => state.refresh);
  const myRecipes = useRecipeStore((state) => state.recipes);

  // A recipe is "own" if it exists in the user's recipe list (by id or as a clone source)
  const isOwn = recipe && myRecipes.some((r) => r.id === recipe.id);
  const alreadySaved =
    recipe &&
    !isOwn &&
    myRecipes.some(
      (r) => r.sourceRecipeId === recipe.id || r.id === recipe.id
    );

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
      ],
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
        if (!cancelled) {
          setRecipe(data);
          // Prefetch thumbnail so it's ready when the hero renders
          if (data?.thumbnailUrl) {
            Image.prefetch(data.thumbnailUrl);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load recipe");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchRecipeById({ recipeId: id, getToken });
      setRecipe(data);
    } catch {
      // Keep existing data on refresh failure
    } finally {
      setIsRefreshing(false);
    }
  }, [id, getToken]);


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

  const sections = {};
  ingredients.forEach((ing) => {
    const key = ing.section || "Ingredients";
    if (!sections[key]) sections[key] = [];
    sections[key].push(ing);
  });
  const sectionEntries = Object.entries(sections);

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

  // Cooking mode helpers
  const sortedSteps = steps.slice().sort((a, b) => a.stepNumber - b.stepNumber);

  const handleNextStep = () => {
    if (currentStep >= sortedSteps.length - 1) {
      setCookingPhase("done");
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={C.greenDark}
          />
        }
      >
        {/* Hero */}
        <View style={s.heroWrap}>
          {recipe.thumbnailUrl ? (
            <>
              <Image
                source={{ uri: recipe.thumbnailUrl }}
                style={s.heroImage}
                transition={200}
                cachePolicy="memory-disk"
                placeholder={null}
              />
              {/* <View style={s.heroGradient} /> */}
              <LinearGradient
                colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0)"]}
                start={{ x: 0.5, y: 1 }}
                end={{ x: 0.5, y: 0 }}
                style={s.heroGradient}
              />
            </>
          ) : (
            <RecipePlaceholder
              title={recipe.title}
              variant="hero"
              style={s.heroImage}
            />
          )}
          <SafeAreaView style={s.heroOverlay} edges={["top"]}>
            <BackButton light onPress={() => router.back()} />
          </SafeAreaView>
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>{recipe.title}</Text>
            {recipe.sourceUrl ? (
              <Pressable
                style={s.heroPlay}
                onPress={() => Linking.openURL(recipe.sourceUrl)}
              >
                <PlayIcon />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={s.body}>
          {/* Description */}
          {recipe.description ? (
            <Text style={s.description}>{recipe.description}</Text>
          ) : null}

          {/* Inline Meta */}
          <View style={s.metaInline}>
            {totalTime > 0 ? (
              <Text style={s.metaInlineText}>{formatTime(totalTime)}</Text>
            ) : null}
            {totalTime > 0 && recipe.difficulty ? (
              <Text style={s.metaDot}>·</Text>
            ) : null}
            {recipe.difficulty ? (
              <Text style={s.metaInlineText}>{recipe.difficulty}</Text>
            ) : null}
            {recipe.difficulty && recipe.servings ? (
              <Text style={s.metaDot}>·</Text>
            ) : null}
            {recipe.servings ? (
              <Text style={s.metaInlineText}>{recipe.servings} servings</Text>
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
          {nutrition &&
          (nutrition.calories ||
            nutrition.protein ||
            nutrition.carbs ||
            nutrition.fat) ? (
            <View style={s.card}>
              <SectionTitle>Nutrition</SectionTitle>
              <View style={s.nutritionGrid}>
                <NutritionItem
                  label="Calories"
                  value={nutrition.calories}
                  unit=""
                />
                <NutritionItem
                  label="Protein"
                  value={nutrition.protein}
                  unit="g"
                />
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
                    let createdList = null;
                    try {
                      createdList = await createShoppingList({
                        getToken,
                        name: recipe.title,
                      });
                      const result = await addFromRecipe({
                        getToken,
                        listId: createdList.id,
                        recipeId: id,
                      });
                      const addedCount =
                        result?.count || result?.items?.length || 0;
                      if (addedCount === 0) {
                        try {
                          await deleteShoppingList({
                            getToken,
                            listId: createdList.id,
                          });
                        } catch {}
                        Alert.alert(
                          "No Ingredients",
                          "This recipe has no ingredients to add.",
                        );
                      } else {
                        useShoppingStore.setState((state) => ({
                          lists: [
                            {
                              ...createdList,
                              itemCount: addedCount,
                              checkedCount: 0,
                            },
                            ...(state.lists || []),
                          ],
                        }));
                        Alert.alert(
                          "Shopping List Created",
                          `Added ${addedCount} ingredient${addedCount !== 1 ? "s" : ""} to "${recipe.title}"`,
                        );
                      }
                    } catch (err) {
                      const msg = err?.message || "";
                      if (msg.includes("already")) {
                        Alert.alert(
                          "Already Added",
                          "This recipe's ingredients are already in a shopping list.",
                        );
                      } else {
                        if (createdList?.id) {
                          try {
                            await deleteShoppingList({
                              getToken,
                              listId: createdList.id,
                            });
                          } catch {}
                        }
                        Alert.alert(
                          "Error",
                          msg || "Failed to create shopping list",
                        );
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
                <View key={si} style={s.ingredientsCard}>
                  <View style={s.ingredientsHeaderRow}>
                    {/* Replace with correct icon for section */}
                    <Image
                      source={require("../../assets/produce.png")}
                      style={s.ingredientsIcon}
                    />
                    <Text style={s.ingredientsTitle}>{section}</Text>
                  </View>
                  <View style={s.ingredientsList}>
                    {items.map((ing, i) => (
                      <Text key={ing.id || i} style={s.ingredientsBullet}>
                        • {ing.name}
                      </Text>
                    ))}
                  </View>
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
                  <View key={step.id || i} style={s.stepCard}>
                    <View style={s.stepBadge}>
                      <Text style={s.stepBadgeText}>{step.stepNumber}</Text>
                    </View>
                    <Text style={s.stepCardText}>{step.instruction}</Text>
                  </View>
                ))}
            </View>
          ) : null}

          {/* Actions */}
          <View style={s.actionsZone}>
            {isOwn ? (
              <>
                {sortedSteps.length > 0 && (
                <Pressable
                  style={s.primaryBtn}
                  onPress={() => {
                    setCookingPhase("prep");
                    setCurrentStep(0);
                    setCheckedIngredients({});
                    setCookingOpen(true);
                  }}
                >
                  <Text style={s.primaryBtnText}>
                    <PlayIcon size={12} /> Start cooking
                  </Text>
                </Pressable>
                )}
                <Pressable
                  style={s.deleteBtn}
                  onPress={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FF0000" />
                  ) : (
                    <View style={s.deleteRow}>
                      <DeleteIcon />
                      <Text style={s.deleteBtnText}>Delete recipe</Text>
                    </View>
                  )}
                </Pressable>
              </>
            ) : saved || alreadySaved ? (
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

      {/* Cooking mode — full-screen immersive */}
      <Modal
        visible={cookingOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCookingOpen(false)}
      >
        <StatusBar barStyle="dark-content" />
        <View style={s.cookingModal}>
          {cookingPhase === "prep" && (
            <PrepChecklistSheet
              ingredients={ingredients}
              checkedIngredients={checkedIngredients}
              onToggle={(idx) =>
                setCheckedIngredients((prev) => ({ ...prev, [idx]: !prev[idx] }))
              }
              onBack={() => setCookingOpen(false)}
              onReady={() => {
                setCookingPhase("steps");
                setCurrentStep(0);
              }}
            />
          )}
          {cookingPhase === "steps" && sortedSteps.length > 0 && sortedSteps[currentStep] && (
            <StepTimerSheet
              step={sortedSteps[currentStep]}
              currentStep={currentStep}
              totalSteps={sortedSteps.length}
              onQuit={() => setCookingOpen(false)}
              onPrev={handlePrevStep}
              onNext={handleNextStep}
            />
          )}
          {cookingPhase === "steps" && (!sortedSteps.length || !sortedSteps[currentStep]) && (
            <DoneSheet
              title={recipe?.title}
              imageUri={recipe?.thumbnailUrl}
              totalSteps={0}
              totalTime={totalTime}
              onBack={() => setCookingOpen(false)}
              onServe={() => setCookingOpen(false)}
            />
          )}
          {cookingPhase === "done" && (
            <DoneSheet
              title={recipe?.title}
              imageUri={recipe?.thumbnailUrl}
              totalSteps={sortedSteps.length}
              totalTime={totalTime}
              onBack={() => setCookingPhase("steps")}
              onServe={() => setCookingOpen(false)}
            />
          )}
        </View>
      </Modal>
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
  cookingModal: {
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
  heroWrap: { position: "relative" },
  heroImage: {
    width: "100%",
    height: 340,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 130,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroContent: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: FONT.semibold,
    width: "75%",
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
  heroPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.greenBright,
    alignItems: "center",
    justifyContent: "center",
  },

  // Body
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.05,
  },

  // Inline Meta
  metaInline: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  metaInlineText: {
    fontSize: 13,
    color: C.textMeta,
    fontFamily: FONT.regular,
  },
  metaDot: {
    marginHorizontal: 6,
    color: C.textMeta,
  },

  // Meta pills (unused now but kept)
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

  // Ingredients (new)
  ingredientsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
  },
  ingredientsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ingredientsIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: C.textPrimary,
  },
  ingredientsList: {
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 12,
  },
  ingredientsBullet: {
    fontSize: 14,
    color: C.textPrimary,
    fontFamily: FONT.regular,
    marginBottom: 6,
  },

  // Steps (new)
  stepCard: {
    flexDirection: "row",
    backgroundColor: "#F7F7F7",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stepBadgeText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
  stepCardText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: C.textPrimary,
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
  primaryBtn: {
    marginTop: 20,
    backgroundColor: C.greenBright,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: C.greenDark,
    fontSize: 16,
    fontFamily: FONT.semibold,
  },
  deleteBtn: {
    marginTop: 14,
    backgroundColor: "#FDECEC",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtnText: {
    color: "#E24B4B",
    fontSize: 15,
    fontFamily: FONT.medium,
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
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
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
    width: "100%",
    justifyContent: "center",
    alignContent: "center",
  },
  savedText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.greenDark,
    letterSpacing: -0.05,
    textAlign: "center",
  },

  // Old ingredient styles kept
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
  ingredientContent: { flex: 1 },
  ingredientName: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: C.textPrimary,
    lineHeight: 22,
    letterSpacing: -0.05,
  },
  ingredientQty: { fontFamily: FONT.semibold },
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

  // Old steps styles kept
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
  stepContent: { flex: 1 },
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
});
