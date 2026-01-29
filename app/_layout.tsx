import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "@/constants/colors";
import { useRecipeStore, usePantryStore, useShoppingStore } from "@/store";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRecipes = useRecipeStore((state) => state.loadRecipes);
  const loadPantryItems = usePantryStore((state) => state.loadItems);
  const loadShoppingItems = useShoppingStore((state) => state.loadItems);

  useEffect(() => {
    async function initializeApp() {
      try {
        await Promise.all([
          loadRecipes(),
          loadPantryItems(),
          loadShoppingItems(),
        ]);
      } catch (error) {
        setLoadError("Failed to load app data. Please restart the app.");
      } finally {
        setIsLoading(false);
      }
    }
    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <AppContent />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
