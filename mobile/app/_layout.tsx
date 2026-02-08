import "../global.css";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@/lib/clerk";
import { colors } from "@/constants/colors";
import { useRecipeStore, usePantryStore, useShoppingStore } from "@/store";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function AuthRouter({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments]);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { isSignedIn, getToken } = useAuth();

  const loadRecipes = useRecipeStore((state) => state.loadRecipes);
  const loadPantryItems = usePantryStore((state) => state.loadItems);
  const loadShoppingItems = useShoppingStore((state) => state.loadItems);

  useEffect(() => {
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    // Wire up the auth token provider for API calls
    // Must happen BEFORE loadRecipes is called
    useRecipeStore.setState({ getToken });

    async function initializeApp() {
      try {
        console.log("[_layout] Starting to load app data...");
        await Promise.all([
          loadRecipes(),
          loadPantryItems(),
          loadShoppingItems(),
        ]);
        console.log("[_layout] App data loaded successfully");
      } catch (error) {
        console.error("Failed to load app data:", error);
        setLoadError("Failed to load app data. Please restart the app.");
      } finally {
        setIsLoading(false);
      }
    }
    initializeApp();
  }, [isSignedIn, getToken]);

  if (isLoading && isSignedIn) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError && isSignedIn) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <AuthRouter>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
    </AuthRouter>
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
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <AppContent />
        </GestureHandlerRootView>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
