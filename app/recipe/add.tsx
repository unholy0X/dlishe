import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Link } from "expo-router";
import { Link2, Sparkles, X, BookOpen, PenLine, FileText, Check, ChevronRight } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { extractRecipeFromUrl, extractRecipeFromText, detectUrlType } from "@/lib/recipeExtractor";
import { useRecipeStore } from "@/store";
import type { Recipe } from "@/types";

type ExtractionState = "idle" | "extracting" | "preview" | "error";

export default function AddRecipeScreen() {
  const [url, setUrl] = useState("");
  const [extractionState, setExtractionState] = useState<ExtractionState>("idle");
  const [extractedRecipe, setExtractedRecipe] = useState<Partial<Recipe> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isPasteExtracting, setIsPasteExtracting] = useState(false);

  const { addRecipe } = useRecipeStore();

  const isLoading = extractionState === "extracting";

  const handleExtract = async () => {
    if (!url.trim()) return;

    const urlType = detectUrlType(url);

    // For TikTok/Instagram, show paste modal
    if (urlType === "tiktok" || urlType === "instagram") {
      setShowPasteModal(true);
      return;
    }

    setExtractionState("extracting");
    setErrorMessage("");

    try {
      const result = await extractRecipeFromUrl(url.trim());

      if (result.success && result.recipe) {
        setExtractedRecipe(result.recipe);
        setExtractionState("preview");
      } else {
        setErrorMessage(result.error || "Failed to extract recipe");
        setExtractionState("error");
      }
    } catch (error) {
      console.error("Extraction error:", error);
      setErrorMessage("Something went wrong. Please try again.");
      setExtractionState("error");
    }
  };

  const handlePasteExtract = async () => {
    if (!pastedText.trim()) return;

    setIsPasteExtracting(true);

    try {
      const result = await extractRecipeFromText(pastedText.trim(), url);

      if (result.success && result.recipe) {
        setExtractedRecipe(result.recipe);
        setShowPasteModal(false);
        setPastedText("");
        setExtractionState("preview");
      } else {
        Alert.alert("Extraction Failed", result.error || "Could not find a recipe in the text");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsPasteExtracting(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!extractedRecipe) return;

    try {
      await addRecipe({
        title: extractedRecipe.title || "Untitled Recipe",
        description: extractedRecipe.description,
        sourceUrl: extractedRecipe.sourceUrl,
        sourceType: extractedRecipe.sourceType,
        prepTime: extractedRecipe.prepTime,
        cookTime: extractedRecipe.cookTime,
        servings: extractedRecipe.servings,
        difficulty: extractedRecipe.difficulty,
        cuisine: extractedRecipe.cuisine,
        tags: extractedRecipe.tags,
        notes: extractedRecipe.notes,
        ingredients: extractedRecipe.ingredients || [],
        instructions: extractedRecipe.instructions || [],
        isFavorite: false,
      });

      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to save recipe. Please try again.");
    }
  };

  const resetState = () => {
    setExtractionState("idle");
    setExtractedRecipe(null);
    setErrorMessage("");
    setUrl("");
  };

  // Preview Screen
  if (extractionState === "preview" && extractedRecipe) {
    const totalTime = (extractedRecipe.prepTime || 0) + (extractedRecipe.cookTime || 0);

    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Success Header */}
          <View className="items-center pt-6 pb-4">
            <View className="w-16 h-16 bg-sage-50 rounded-full items-center justify-center mb-3" style={{ borderWidth: 2, borderColor: colors.sage[100] }}>
              <Check size={32} color={colors.sage[200]} strokeWidth={2} />
            </View>
            <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500' }}>
              Recipe Extracted!
            </Text>
            <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 14, marginTop: 4 }}>
              Review and save to your collection
            </Text>
          </View>

          {/* Recipe Preview Card */}
          <View className="bg-stone-100 border border-stone-200 rounded-xl p-5 mb-4">
            <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: '500', marginBottom: 8 }}>
              {extractedRecipe.title}
            </Text>

            {extractedRecipe.description && (
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
                {extractedRecipe.description}
              </Text>
            )}

            {/* Meta Info */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {totalTime > 0 && (
                <View className="bg-stone-200 px-3 py-1 rounded-full">
                  <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 12 }}>
                    {totalTime} min
                  </Text>
                </View>
              )}
              {extractedRecipe.servings && (
                <View className="bg-stone-200 px-3 py-1 rounded-full">
                  <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 12 }}>
                    {extractedRecipe.servings} servings
                  </Text>
                </View>
              )}
              {extractedRecipe.difficulty && (
                <View className="bg-stone-200 px-3 py-1 rounded-full">
                  <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 12, textTransform: 'capitalize' }}>
                    {extractedRecipe.difficulty}
                  </Text>
                </View>
              )}
              {extractedRecipe.cuisine && (
                <View className="bg-honey-100 px-3 py-1 rounded-full">
                  <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontSize: 12 }}>
                    {extractedRecipe.cuisine}
                  </Text>
                </View>
              )}
            </View>

            {/* Ingredients Count */}
            <View className="flex-row items-center justify-between py-3 border-t border-stone-200">
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 14 }}>
                Ingredients
              </Text>
              <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontSize: 14, fontWeight: '600' }}>
                {extractedRecipe.ingredients?.length || 0} items
              </Text>
            </View>

            {/* Instructions Count */}
            <View className="flex-row items-center justify-between py-3 border-t border-stone-200">
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 14 }}>
                Instructions
              </Text>
              <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontSize: 14, fontWeight: '600' }}>
                {extractedRecipe.instructions?.length || 0} steps
              </Text>
            </View>

            {/* Techniques Row */}
            {extractedRecipe.instructions?.some((inst) => inst.technique) && (
              <View className="py-3 border-t border-stone-200">
                <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 14, marginBottom: 6 }}>
                  Techniques
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {[...new Set(extractedRecipe.instructions.filter((inst) => inst.technique).map((inst) => inst.technique!))].map((technique, idx) => (
                    <View key={idx} className="bg-sage-50 px-3 py-1 rounded-full" style={{ borderWidth: 1, borderColor: colors.sage[100] }}>
                      <Text style={{ color: colors.sage[200], fontFamily: 'Inter', fontSize: 12, textTransform: 'capitalize' }}>
                        {technique}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Chef Notes */}
          {extractedRecipe.notes && (
            <View className="bg-honey-50 border border-honey-100 rounded-xl p-4 mb-4">
              <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontWeight: '600', fontSize: 14, marginBottom: 4 }}>
                Chef Notes
              </Text>
              <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontSize: 14, lineHeight: 20, fontStyle: 'italic' }}>
                {extractedRecipe.notes}
              </Text>
            </View>
          )}

          {/* Ingredients Preview */}
          {extractedRecipe.ingredients && extractedRecipe.ingredients.length > 0 && (
            <View className="mb-4">
              <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: '500', marginBottom: 12, marginLeft: 4 }}>
                Ingredients
              </Text>
              <View className="bg-stone-100 border border-stone-200 rounded-xl p-4">
                {extractedRecipe.ingredients.slice(0, 6).map((ing, idx) => (
                  <View key={idx} className="flex-row items-center py-2" style={{ borderBottomWidth: idx < Math.min(5, extractedRecipe.ingredients!.length - 1) ? 1 : 0, borderBottomColor: colors.stone[200] }}>
                    <View className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: colors.honey[400] }} />
                    <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontSize: 14, flex: 1 }}>
                      {ing.amount && ing.unit ? `${ing.amount} ${ing.unit} ` : ''}{ing.name}
                    </Text>
                  </View>
                ))}
                {extractedRecipe.ingredients.length > 6 && (
                  <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                    +{extractedRecipe.ingredients.length - 6} more ingredients
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-3 mb-8">
            <Pressable
              onPress={handleSaveRecipe}
              className="py-4 rounded-xl items-center"
              style={{
                backgroundColor: colors.honey[400],
                shadowColor: colors.honey[400],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
                Save to My Recipes
              </Text>
            </Pressable>

            <Pressable
              onPress={resetState}
              className="py-3 rounded-xl items-center"
              style={{ backgroundColor: colors.stone[100], borderWidth: 1, borderColor: colors.stone[200] }}
            >
              <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontWeight: '500', fontSize: 14 }}>
                Try Another Link
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main Input Screen
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Illustration */}
          <ImageBackground
            source={require('../../assets/backgrounds/boheme05.png')}
            style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 16 }}
            imageStyle={{ opacity: 0.06 }}
          >
            <View className="w-20 h-20 bg-honey-100 rounded-full items-center justify-center border-2" style={{ borderColor: colors.honey[200] }}>
              <BookOpen size={32} color={colors.honey[400]} strokeWidth={1.5} />
            </View>
          </ImageBackground>

          {/* Instructions */}
          <View className="mb-6">
            <Text className="text-center mb-2" style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 28, fontWeight: '400' }}>
              Add a New Recipe
            </Text>
            <Text className="text-center" style={{ color: colors.text.tertiary, fontFamily: 'Inter', fontSize: 15, lineHeight: 24 }}>
              Paste a link from YouTube or any recipe{"\n"}
              website and watch the magic happen
            </Text>
          </View>

          {/* URL Input */}
          <View className="mb-5">
            <Text style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500', marginBottom: 8, marginLeft: 4 }}>
              Recipe Link
            </Text>
            <View
              className="flex-row items-center bg-stone-100 rounded-xl px-4 py-4"
              style={{
                borderWidth: 2,
                borderColor: url ? colors.honey[400] : colors.stone[200],
              }}
            >
              <Link2 size={20} color={url ? colors.honey[400] : colors.text.muted} />
              <TextInput
                className="flex-1 ml-3"
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={colors.text.muted}
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (extractionState === "error") setExtractionState("idle");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
              />
              {url.length > 0 && (
                <Pressable
                  onPress={() => setUrl("")}
                  className="p-2 -mr-2 active:opacity-50"
                >
                  <X size={18} color={colors.text.muted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Error Message */}
          {extractionState === "error" && errorMessage && (
            <View className="bg-honey-50 border border-honey-200 rounded-xl p-4 mb-4">
              <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontSize: 14 }}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Extract Button */}
          <Pressable
            onPress={handleExtract}
            disabled={!url.trim() || isLoading}
            className="rounded-xl py-4 flex-row items-center justify-center mb-2"
            style={{
              backgroundColor: url.trim() && !isLoading ? colors.honey[400] : colors.stone[200],
              shadowColor: url.trim() && !isLoading ? colors.honey[400] : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 16, marginLeft: 12 }}>
                  {detectUrlType(url) === "youtube" ? "Analyzing video..." : "Extracting recipe..."}
                </Text>
              </>
            ) : (
              <>
                <Sparkles size={20} color={url.trim() ? "white" : colors.text.muted} />
                <Text
                  style={{
                    color: url.trim() ? "white" : colors.text.muted,
                    fontFamily: 'Inter',
                    fontWeight: '600',
                    fontSize: 16,
                    marginLeft: 8,
                  }}
                >
                  Extract with AI
                </Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center my-8">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.stone[200] }} />
            <View className="px-4">
              <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 14 }}>or</Text>
            </View>
            <View className="flex-1 h-px" style={{ backgroundColor: colors.stone[200] }} />
          </View>

          {/* TikTok/Instagram Option */}
          <Pressable
            onPress={() => setShowPasteModal(true)}
            className="bg-stone-100 border border-stone-200 rounded-xl p-5 active:bg-stone-200 mb-4"
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-sage-50 rounded-xl items-center justify-center mr-4">
                <FileText size={22} color={colors.sage[200]} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
                  Paste Description
                </Text>
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 14, marginTop: 2 }}>
                  For TikTok & Instagram videos
                </Text>
              </View>
              <ChevronRight size={20} color={colors.text.muted} />
            </View>
          </Pressable>

          {/* Manual Entry Option */}
          <Link href="/recipe/manual" asChild>
            <Pressable className="bg-stone-100 border border-stone-200 rounded-xl p-5 active:bg-stone-200 mb-8">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-honey-100 rounded-xl items-center justify-center mr-4">
                  <PenLine size={22} color={colors.honey[400]} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text.primary, fontFamily: 'Inter', fontWeight: '600', fontSize: 16 }}>
                    Add Manually
                  </Text>
                  <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 14, marginTop: 2 }}>
                    Type in your recipe by hand
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.text.muted} />
              </View>
            </Pressable>
          </Link>

          {/* Supported Platforms */}
          <View className="mb-8">
            <Text style={{ color: colors.text.disabled, fontFamily: 'Inter', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              Works with
            </Text>
            <View className="flex-row justify-center gap-6">
              <View className="items-center">
                <View className="w-12 h-12 bg-stone-100 border border-stone-200 rounded-xl items-center justify-center mb-2">
                  <Text className="text-xl">▶️</Text>
                </View>
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 11 }}>YouTube</Text>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 bg-stone-100 border border-stone-200 rounded-xl items-center justify-center mb-2">
                  <Text className="text-xl">🌐</Text>
                </View>
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 11 }}>Websites</Text>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 bg-stone-100 border border-stone-200 rounded-xl items-center justify-center mb-2">
                  <Text className="text-xl">📱</Text>
                </View>
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 11 }}>TikTok</Text>
              </View>
              <View className="items-center">
                <View className="w-12 h-12 bg-stone-100 border border-stone-200 rounded-xl items-center justify-center mb-2">
                  <Text className="text-xl">📸</Text>
                </View>
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 11 }}>Instagram</Text>
              </View>
            </View>
          </View>

          {/* Inspirational footer */}
          <View className="items-center pb-6">
            <Text style={{ color: colors.text.disabled, fontFamily: 'Crimson Text', fontSize: 14, fontStyle: 'italic' }}>
              Every recipe tells a story
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Paste Description Modal */}
      <Modal visible={showPasteModal} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View className="bg-stone-50 rounded-t-3xl px-6 pt-6 pb-10">
              <View className="flex-row items-center justify-between mb-4">
                <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: '500' }}>
                  Paste Description
                </Text>
                <Pressable onPress={() => setShowPasteModal(false)} className="p-2 -mr-2">
                  <X size={24} color={colors.text.muted} />
                </Pressable>
              </View>

              <Text style={{ color: colors.text.muted, fontFamily: 'Inter', fontSize: 14, marginBottom: 16, lineHeight: 20 }}>
                Copy the video description or caption from TikTok/Instagram and paste it here. We'll extract the recipe for you.
              </Text>

              <TextInput
                className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-4 mb-5"
                placeholder="Paste the video description here..."
                placeholderTextColor={colors.text.muted}
                value={pastedText}
                onChangeText={setPastedText}
                multiline
                numberOfLines={6}
                style={{
                  fontSize: 15,
                  color: colors.text.primary,
                  fontFamily: 'Inter',
                  minHeight: 150,
                  textAlignVertical: 'top',
                }}
                autoFocus
              />

              <Pressable
                onPress={handlePasteExtract}
                disabled={!pastedText.trim() || isPasteExtracting}
                className="py-4 rounded-xl flex-row items-center justify-center"
                style={{
                  backgroundColor: pastedText.trim() && !isPasteExtracting ? colors.honey[400] : colors.stone[200],
                }}
              >
                {isPasteExtracting ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={{ color: 'white', fontFamily: 'Inter', fontWeight: '600', fontSize: 16, marginLeft: 12 }}>
                      Extracting...
                    </Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} color={pastedText.trim() ? "white" : colors.text.muted} />
                    <Text
                      style={{
                        color: pastedText.trim() ? "white" : colors.text.muted,
                        fontFamily: 'Inter',
                        fontWeight: '600',
                        fontSize: 16,
                        marginLeft: 8,
                      }}
                    >
                      Extract Recipe
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
