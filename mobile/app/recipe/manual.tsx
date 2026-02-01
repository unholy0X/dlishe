import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Plus, Minus, Clock, Users, ChefHat, Save } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useRecipeStore } from "@/store";
import type { IngredientFormData, InstructionFormData } from "@/types";

export default function ManualRecipeScreen() {
  const { addRecipe, isLoading } = useRecipeStore();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [ingredients, setIngredients] = useState<IngredientFormData[]>([
    { name: "", amount: "", unit: "" },
  ]);
  const [instructions, setInstructions] = useState<InstructionFormData[]>([
    { text: "" },
  ]);
  const [notes, setNotes] = useState("");

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", unit: "" }]);
  };

  const removeIngredient = (idx: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== idx));
    }
  };

  const updateIngredient = (idx: number, field: keyof IngredientFormData, value: string) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], [field]: value };
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, { text: "" }]);
  };

  const removeInstruction = (idx: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== idx));
    }
  };

  const updateInstruction = (idx: number, text: string) => {
    const updated = [...instructions];
    updated[idx] = { ...updated[idx], text };
    setInstructions(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a recipe title.");
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert("Missing Ingredients", "Please add at least one ingredient.");
      return;
    }

    const validInstructions = instructions.filter((inst) => inst.text.trim());
    if (validInstructions.length === 0) {
      Alert.alert("Missing Instructions", "Please add at least one instruction step.");
      return;
    }

    try {
      await addRecipe({
        title: title.trim(),
        description: description.trim() || undefined,
        sourceType: 'manual',
        prepTime: prepTime ? parseInt(prepTime) : undefined,
        cookTime: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        difficulty,
        ingredients: validIngredients.map((ing, i) => ({
          id: "temp-" + i,
          name: ing.name.trim(),
          amount: ing.amount ? parseFloat(ing.amount) : undefined,
          unit: ing.unit?.trim() || undefined,
        })),
        instructions: validInstructions.map((inst, i) => ({
          id: "temp-" + i,
          stepNumber: i + 1,
          text: inst.text.trim(),
        })),
        notes: notes.trim() || undefined,
        isFavorite: false,
      });

      router.back();
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to save recipe. Please try again.");
    }
  };

  const difficultyOptions: Array<{ value: 'easy' | 'medium' | 'hard'; label: string }> = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

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
          <View className="mt-4 mb-5">
            <Text className="mb-2 ml-1" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
              Recipe Title *
            </Text>
            <TextInput
              className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-4"
              placeholder="e.g., Grandma's Apple Pie"
              placeholderTextColor={colors.text.muted}
              value={title}
              onChangeText={setTitle}
              style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
            />
          </View>

          <View className="mb-5">
            <Text className="mb-2 ml-1" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
              Description
            </Text>
            <TextInput
              className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-4"
              placeholder="A brief description of your recipe..."
              placeholderTextColor={colors.text.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter', minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          <View className="flex-row gap-3 mb-5">
            <View className="flex-1">
              <Text className="mb-2 ml-1" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
                Prep (min)
              </Text>
              <TextInput
                className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3"
                placeholder="15"
                placeholderTextColor={colors.text.muted}
                value={prepTime}
                onChangeText={setPrepTime}
                keyboardType="numeric"
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-2 ml-1" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
                Cook (min)
              </Text>
              <TextInput
                className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3"
                placeholder="30"
                placeholderTextColor={colors.text.muted}
                value={cookTime}
                onChangeText={setCookTime}
                keyboardType="numeric"
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-2 ml-1" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
                Servings
              </Text>
              <TextInput
                className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-3"
                placeholder="4"
                placeholderTextColor={colors.text.muted}
                value={servings}
                onChangeText={setServings}
                keyboardType="numeric"
                style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter' }}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-2 ml-1" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
              Difficulty
            </Text>
            <View className="flex-row gap-2">
              {difficultyOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setDifficulty(option.value)}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: difficulty === option.value ? colors.honey[400] : colors.stone[100],
                    borderWidth: 1,
                    borderColor: difficulty === option.value ? colors.honey[400] : colors.stone[200],
                  }}
                >
                  <Text
                    style={{
                      color: difficulty === option.value ? 'white' : colors.text.secondary,
                      fontFamily: 'Inter',
                      fontWeight: '500',
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: '500' }}>
                Ingredients *
              </Text>
              <Pressable
                onPress={addIngredient}
                className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                style={{ backgroundColor: colors.honey[100] }}
              >
                <Plus size={16} color={colors.honey[400]} />
                <Text className="ml-1" style={{ color: colors.honey[400], fontFamily: 'Inter', fontWeight: '600', fontSize: 13 }}>
                  Add
                </Text>
              </Pressable>
            </View>
            
            {ingredients.map((ing, idx) => (
              <View key={idx} className="flex-row gap-2 mb-3">
                <TextInput
                  className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-3 py-3"
                  placeholder="Ingredient name"
                  placeholderTextColor={colors.text.muted}
                  value={ing.name}
                  onChangeText={(text) => updateIngredient(idx, 'name', text)}
                  style={{ fontSize: 15, color: colors.text.primary, fontFamily: 'Inter' }}
                />
                <TextInput
                  className="w-16 bg-stone-100 border border-stone-200 rounded-xl px-3 py-3"
                  placeholder="Qty"
                  placeholderTextColor={colors.text.muted}
                  value={ing.amount}
                  onChangeText={(text) => updateIngredient(idx, 'amount', text)}
                  keyboardType="decimal-pad"
                  style={{ fontSize: 15, color: colors.text.primary, fontFamily: 'Inter' }}
                />
                <TextInput
                  className="w-20 bg-stone-100 border border-stone-200 rounded-xl px-3 py-3"
                  placeholder="Unit"
                  placeholderTextColor={colors.text.muted}
                  value={ing.unit}
                  onChangeText={(text) => updateIngredient(idx, 'unit', text)}
                  style={{ fontSize: 15, color: colors.text.primary, fontFamily: 'Inter' }}
                />
                {ingredients.length > 1 && (
                  <Pressable
                    onPress={() => removeIngredient(idx)}
                    className="w-10 items-center justify-center rounded-xl active:opacity-80"
                    style={{ backgroundColor: colors.stone[200] }}
                  >
                    <Minus size={18} color={colors.text.muted} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: colors.text.primary, fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: '500' }}>
                Instructions *
              </Text>
              <Pressable
                onPress={addInstruction}
                className="flex-row items-center px-3 py-2 rounded-lg active:opacity-80"
                style={{ backgroundColor: colors.honey[100] }}
              >
                <Plus size={16} color={colors.honey[400]} />
                <Text className="ml-1" style={{ color: colors.honey[400], fontFamily: 'Inter', fontWeight: '600', fontSize: 13 }}>
                  Add Step
                </Text>
              </Pressable>
            </View>
            
            {instructions.map((inst, idx) => (
              <View key={idx} className="flex-row gap-2 mb-3 items-start">
                <View className="w-8 h-8 rounded-full items-center justify-center mt-1" style={{ backgroundColor: colors.honey[100] }}>
                  <Text style={{ color: colors.honey[400], fontFamily: 'Inter', fontWeight: '600', fontSize: 13 }}>
                    {idx + 1}
                  </Text>
                </View>
                <TextInput
                  className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-4 py-3"
                  placeholder={"Step " + (idx + 1) + "..."}
                  placeholderTextColor={colors.text.muted}
                  value={inst.text}
                  onChangeText={(text) => updateInstruction(idx, text)}
                  multiline
                  style={{ fontSize: 15, color: colors.text.primary, fontFamily: 'Inter', minHeight: 50, textAlignVertical: 'top' }}
                />
                {instructions.length > 1 && (
                  <Pressable
                    onPress={() => removeInstruction(idx)}
                    className="w-10 h-10 items-center justify-center rounded-xl active:opacity-80"
                    style={{ backgroundColor: colors.stone[200] }}
                  >
                    <Minus size={18} color={colors.text.muted} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          <View className="mb-8">
            <Text className="mb-2 ml-1" style={{ color: colors.text.secondary, fontFamily: 'Inter', fontWeight: '500' }}>
              Notes
            </Text>
            <TextInput
              className="bg-stone-100 border border-stone-200 rounded-xl px-4 py-4"
              placeholder="Any tips, variations, or personal notes..."
              placeholderTextColor={colors.text.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={{ fontSize: 16, color: colors.text.primary, fontFamily: 'Inter', minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={isLoading}
            className="rounded-xl py-4 flex-row items-center justify-center mb-10"
            style={{
              backgroundColor: colors.honey[400],
              opacity: isLoading ? 0.7 : 1,
              shadowColor: colors.honey[400],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
          >
            <Save size={20} color="white" />
            <Text className="text-white text-base ml-2" style={{ fontFamily: 'Inter', fontWeight: '600' }}>
              {isLoading ? "Saving..." : "Save Recipe"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
