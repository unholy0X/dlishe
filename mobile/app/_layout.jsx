import React, { useEffect } from "react";
import { View, Text, StyleSheet, Alert, Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import Purchases from "react-native-purchases";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { useAuth, useUser } from "@clerk/clerk-expo";
import UserSync from "../components/UserSync";
import ErrorBoundary from "../components/ErrorBoundary";
import { useSubscriptionStore } from "../store";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  });
}

const tokenCache = {
  async getToken(key) {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value;
    } catch (err) {
      console.error("SecureStore get error:", err);
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("SecureStore save error:", err);
    }
  },
};

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    const path = `/${segments.join("/")}`;
    const isAuthRoute = path === "/" || path === "/sign-up";

    if (!isSignedIn && !isAuthRoute) {
      router.replace("/");
    } else if (isSignedIn && isAuthRoute) {
      router.replace("/home");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  // Initialize RevenueCat after auth
  useEffect(() => {
    if (!isSignedIn || !isLoaded || !user?.id) return;

    const initRC = async () => {
      try {
        // RevenueCat native SDK doesn't work in Expo Go
        if (Constants.appOwnership === "expo") return;

        const apiKey = Platform.OS === "ios"
          ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
          : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;

        if (!apiKey) return;

        Purchases.configure({ apiKey });
        await Purchases.logIn(user.id);

        useSubscriptionStore.getState().loadSubscription({ getToken });
        useSubscriptionStore.getState().loadOfferings();
      } catch (err) {
        console.warn("RevenueCat init failed:", err);
      }
    };

    initRC();
  }, [isSignedIn, isLoaded, user?.id]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "ios_from_right",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ gestureEnabled: false, animation: "none" }} />
      <Stack.Screen name="sign-up" options={{ gestureEnabled: false, animation: "fade" }} />
      <Stack.Screen name="home" options={{ gestureEnabled: false, animation: "fade", animationDuration: 100 }} />
      <Stack.Screen name="recipies" options={{ gestureEnabled: false, animation: "fade", animationDuration: 100 }} />
      <Stack.Screen name="pantry" options={{ gestureEnabled: false, animation: "fade", animationDuration: 100 }} />
      <Stack.Screen name="shopping" options={{ gestureEnabled: false, animation: "fade", animationDuration: 100 }} />
      <Stack.Screen name="shoppingList" options={{ animation: "ios_from_right" }} />
      <Stack.Screen name="recipe/[id]" options={{ animation: "ios_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Proceed if fonts loaded OR if font loading failed (use system fonts as fallback)
  if (!fontsLoaded && !fontError) {
    return null;
  }

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return (
      <View style={missingKeyStyles.container}>
        <Text style={missingKeyStyles.title}>Configuration Error</Text>
        <Text style={missingKeyStyles.message}>
          Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please contact support.
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <UserSync />
          <AuthGate />
        </ClerkLoaded>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

const missingKeyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  title: { fontSize: 18, fontWeight: "600", color: "#cc3b3b", marginBottom: 12 },
  message: { fontSize: 14, color: "#666", textAlign: "center" },
});
