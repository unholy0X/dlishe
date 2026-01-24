import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "@/constants/colors";
import { useRecipeStore, usePantryStore, useShoppingStore } from "@/store";

export default function RootLayout() {
  const loadRecipes = useRecipeStore((state) => state.loadRecipes);
  const loadPantryItems = usePantryStore((state) => state.loadItems);
  const loadShoppingItems = useShoppingStore((state) => state.loadItems);

  useEffect(() => {
    // Initialize database and load data
    loadRecipes();
    loadPantryItems();
    loadShoppingItems();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="recipe/[id]"
          options={{
            headerShown: true,
            headerTitle: "Recipe",
            headerBackTitle: "Back",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: {
              color: colors.textPrimary,
              fontWeight: "600",
            },
          }}
        />
        <Stack.Screen
          name="recipe/add"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Add Recipe",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: {
              color: colors.textPrimary,
              fontWeight: "600",
            },
          }}
        />
        <Stack.Screen
          name="recipe/manual"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Add Manually",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: {
              color: colors.textPrimary,
              fontWeight: "600",
            },
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
