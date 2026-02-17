import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import ArrowLeftIcon from "../icons/ArrowLeftIcon";
import LinkIcon from "../icons/LinkIcon";
import SparkleBadgeIcon from "../icons/SparkleBadgeIcon";
import ExtractionProgress from "./ExtractionProgress";
import ImageCapture from "../ImageCapture";
import { useAuth } from "@clerk/clerk-expo";
import { useExtractStore } from "../../store";
import PaywallSheet from "../paywall/PaywallSheet";

export default function AddRecipeSheetContent({ onPressBack }) {
  const { getToken } = useAuth();
  const {
    url,
    setUrl,
    startExtraction,
    startImageExtraction,
    reset,
    status,
    progress,
    error,
    isRunning,
    recipe,
  } = useExtractStore();

  const [capturedImages, setCapturedImages] = useState([]);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const handleBack = () => {
    setCapturedImages([]);
    reset();
    onPressBack();
  };

  const handleTryAnother = () => {
    setCapturedImages([]);
    reset();
  };

  const handleExtractFromPhotos = useCallback(() => {
    if (capturedImages.length === 0) return;
    startImageExtraction({
      images: capturedImages.map((img) => ({
        base64: img.base64,
        mimeType: img.mimeType,
      })),
      getToken,
    });
  }, [capturedImages, getToken, startImageExtraction]);

  // Quota exceeded view
  if (error === "QUOTA_EXCEEDED") {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack}>
            <BlurView intensity={100} tint="light" style={styles.backPill}>
              <ArrowLeftIcon width={9} height={8} color="#555555" />
              <Text style={styles.backText}>Back</Text>
            </BlurView>
          </Pressable>
          <Text style={styles.headerTitle}>Add a recipe</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.quotaIconWrap}>
          <Text style={styles.quotaIcon}>🔒</Text>
        </View>

        <Text style={styles.quotaTitle}>Monthly limit reached</Text>
        <Text style={styles.quotaSubtitle}>
          You've used all your free extractions this month.
        </Text>

        <Pressable
          style={styles.upgradeButton}
          onPress={() => setPaywallVisible(true)}
        >
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </Pressable>

        <Text style={styles.quotaHint}>
          No limits on extractions, pantry scans & more
        </Text>

        <Text style={styles.quotaReset}>Resets next month</Text>

        <PaywallSheet
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          reason="extraction_limit"
        />
      </View>
    );
  }

  // Success preview after completion
  if (recipe && status === "completed") {
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const ingredientCount = recipe.ingredients?.length || 0;
    const instructionCount = recipe.instructions?.length || recipe.steps?.length || 0;

    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack}>
            <BlurView intensity={100} tint="light" style={styles.backPill}>
              <ArrowLeftIcon width={9} height={8} color="#555555" />
              <Text style={styles.backText}>Back</Text>
            </BlurView>
          </Pressable>
          <Text style={styles.headerTitle}>Recipe ready!</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.successIconWrap}>
          <Text style={styles.successIcon}>{"\u2713"}</Text>
        </View>

        <Text style={styles.recipeTitle}>{recipe.title}</Text>

        {recipe.description ? (
          <Text style={styles.recipeDescription} numberOfLines={3}>
            {recipe.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {totalTime > 0 && (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{totalTime} min</Text>
            </View>
          )}
          {recipe.servings ? (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{recipe.servings} servings</Text>
            </View>
          ) : null}
          {recipe.difficulty ? (
            <View style={styles.metaPill}>
              <Text style={[styles.metaPillText, { textTransform: "capitalize" }]}>{recipe.difficulty}</Text>
            </View>
          ) : null}
          {recipe.cuisine ? (
            <View style={[styles.metaPill, { backgroundColor: "#DFF7C4" }]}>
              <Text style={[styles.metaPillText, { color: "#385225" }]}>{recipe.cuisine}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.countsCard}>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Ingredients</Text>
            <Text style={styles.countValue}>{ingredientCount} items</Text>
          </View>
          <View style={styles.countDivider} />
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Instructions</Text>
            <Text style={styles.countValue}>{instructionCount} steps</Text>
          </View>
        </View>

        {ingredientCount > 0 && (
          <View style={styles.ingredientPreview}>
            {recipe.ingredients.slice(0, 4).map((ing, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientText} numberOfLines={1}>
                  {ing.quantity && ing.unit ? `${ing.quantity} ${ing.unit} ` : ""}
                  {ing.name}
                </Text>
              </View>
            ))}
            {ingredientCount > 4 && (
              <Text style={styles.moreText}>+{ingredientCount - 4} more</Text>
            )}
          </View>
        )}

        <View style={styles.savedBanner}>
          <Text style={styles.savedText}>Saved to your recipe box</Text>
        </View>

        <Pressable style={styles.tryAnotherButton} onPress={handleTryAnother}>
          <Text style={styles.tryAnotherText}>Add another recipe</Text>
        </Pressable>
      </View>
    );
  }

  // Progress view
  if (isRunning) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack}>
            <BlurView intensity={100} tint="light" style={styles.backPill}>
              <ArrowLeftIcon width={9} height={8} color="#555555" />
              <Text style={styles.backText}>Cancel</Text>
            </BlurView>
          </Pressable>
          <Text style={styles.headerTitle}>Cooking it up</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ExtractionProgress progress={progress} />
      </View>
    );
  }

  // Default: Input form
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={handleBack}>
          <BlurView intensity={100} tint="light" style={styles.backPill}>
            <ArrowLeftIcon width={9} height={8} color="#555555" />
            <Text style={styles.backText}>Back</Text>
          </BlurView>
        </Pressable>
        <Text style={styles.headerTitle}>Add a recipe</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Image
        source={require("../../assets/AddRecipie.png")}
        style={styles.heroImage}
        resizeMode="contain"
      />

      <Text style={styles.title}>Add a new recipe</Text>
      <Text style={styles.subtitle}>
        Paste a link from YouTube or any recipe website and we'll do the rest
      </Text>

      <View style={styles.inputWrap}>
        <LinkIcon width={20} height={20} color={url ? "#385225" : "#B4B4B4"} />
        <TextInput
          placeholder="https://youtube.com/watch?v=..."
          placeholderTextColor="#B4B4B4"
          style={styles.input}
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            if (error) useExtractStore.setState({ error: "" });
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      <Pressable
        style={[
          styles.primaryButton,
          (!url.trim() || isRunning) && styles.primaryButtonDisabled,
        ]}
        onPress={() => startExtraction({ getToken })}
        disabled={!url.trim() || isRunning}
      >
        <SparkleBadgeIcon width={22} height={22} />
        <Text style={styles.primaryText}>Grab recipe</Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Or</Text>
        <View style={styles.divider} />
      </View>

      <ImageCapture
        images={capturedImages}
        onImagesChange={setCapturedImages}
        maxImages={3}
        quality={0.6}
        disabled={isRunning}
        label="Snap a cookbook"
        sublabel="Take a photo of any recipe page (up to 3)"
      />

      {capturedImages.length > 0 && !isRunning && (
        <Pressable style={styles.primaryButton} onPress={handleExtractFromPhotos}>
          <SparkleBadgeIcon width={22} height={22} />
          <Text style={styles.primaryText}>
            Extract recipe ({capturedImages.length} photo{capturedImages.length !== 1 ? "s" : ""})
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backPill: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#555555",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "normal",
    color: "#000",
    letterSpacing: -0.05,
  },
  headerSpacer: {
    width: 56,
  },
  heroImage: {
    width: "100%",
    height: 130,
    marginTop: 44,
  },
  title: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: "normal",
    color: "#000",
    textAlign: "center",
    letterSpacing: -0.05,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#B4B4B4",
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.05,
    paddingHorizontal: 20,
  },
  inputWrap: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: {
    marginLeft: 10,
    flex: 1,
    color: "#111111",
  },
  primaryButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: "#d9d9d9",
  },
  primaryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#385225",
    letterSpacing: -0.05,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: "#cc3b3b",
    textAlign: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#DFDFDF",
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: "#B4B4B4",
  },
  // Preview styles
  successIconWrap: {
    alignSelf: "center",
    marginTop: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DFF7C4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successIcon: {
    fontSize: 28,
    color: "#385225",
    fontWeight: "bold",
  },
  recipeTitle: {
    fontSize: 22,
    fontWeight: "500",
    color: "#111111",
    textAlign: "center",
    letterSpacing: -0.05,
  },
  recipeDescription: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b6b6b",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  metaPill: {
    backgroundColor: "#EAEAEA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  metaPillText: {
    fontSize: 12,
    color: "#6b6b6b",
  },
  countsCard: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  countDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 4,
  },
  countLabel: {
    fontSize: 14,
    color: "#6b6b6b",
  },
  countValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },
  ingredientPreview: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7FEF80",
    marginRight: 10,
  },
  ingredientText: {
    fontSize: 14,
    color: "#111111",
    flex: 1,
  },
  moreText: {
    marginTop: 6,
    fontSize: 13,
    color: "#B4B4B4",
    textAlign: "center",
  },
  savedBanner: {
    marginTop: 16,
    backgroundColor: "#DFF7C4",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  savedText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#385225",
  },
  tryAnotherButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#DFDFDF",
  },
  tryAnotherText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b6b6b",
  },
  // Quota exceeded styles
  quotaIconWrap: {
    alignSelf: "center",
    marginTop: 40,
    marginBottom: 16,
  },
  quotaIcon: {
    fontSize: 48,
  },
  quotaTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111111",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  quotaSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b6b6b",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  upgradeButton: {
    marginTop: 24,
    backgroundColor: "#385225",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  quotaHint: {
    marginTop: 12,
    fontSize: 13,
    color: "#6b6b6b",
    textAlign: "center",
  },
  quotaReset: {
    marginTop: 24,
    fontSize: 12,
    color: "#B4B4B4",
    textAlign: "center",
  },
});
