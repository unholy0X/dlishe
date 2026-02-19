import "../i18n"; // initialize i18next before any component renders
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, Platform, AppState, I18nManager } from "react-native";
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
import { useDemoStore } from "../store/demoStore";
import { useLanguageStore } from "../store/languageStore";
import { useArabicFonts } from "../utils/fonts";

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
  const isDemoMode = useDemoStore((s) => s.isDemoMode);
  const [demoHydrated, setDemoHydrated] = useState(false);

  // Hydrate demo store before running the auth gate so we don't flash the
  // sign-in screen when the user is already in demo mode.
  useEffect(() => {
    useDemoStore.getState().hydrate().then(() => setDemoHydrated(true));
  }, []);

  useEffect(() => {
    if (!isLoaded || !demoHydrated) return;
    const path = `/${segments.join("/")}`;
    const isAuthRoute = path === "/" || path === "/sign-up";
    const isAuthenticated = isSignedIn || isDemoMode;

    if (!isAuthenticated && !isAuthRoute) {
      router.replace("/");
    } else if (isAuthenticated && isAuthRoute) {
      router.replace("/home");
    }
  }, [isSignedIn, isLoaded, isDemoMode, demoHydrated, segments, router]);

  // Hydrate cached subscription state immediately (before network)
  useEffect(() => {
    useSubscriptionStore.getState().hydrate();
  }, []);

  // Demo mode — hardcode Pro subscription so all features are visible.
  useEffect(() => {
    if (!isDemoMode) return;
    useSubscriptionStore.setState({ entitlement: "pro", isActive: true });
  }, [isDemoMode]);

  // Initialize RevenueCat after auth (real users only)
  useEffect(() => {
    if (!isSignedIn || !isLoaded || !user?.id || isDemoMode) return;

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
  }, [isSignedIn, isLoaded, user?.id, isDemoMode]);

  // Reload subscription when app returns to foreground (real users only)
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!isSignedIn || !isLoaded || isDemoMode) return;

    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        useSubscriptionStore.getState().loadSubscription({ getToken });
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, [isSignedIn, isLoaded, getToken, isDemoMode]);

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
      <Stack.Screen name="mealPlan" options={{ animation: "ios_from_right" }} />
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
  const { arabicFontsLoaded, arabicFontsError } = useArabicFonts();
  const [langHydrated, setLangHydrated] = useState(false);

  // Hydrate language preference and apply RTL before first render.
  useEffect(() => {
    useLanguageStore.getState().hydrate().then(() => {
      const { isRTL } = useLanguageStore.getState();
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);
      }
      setLangHydrated(true);
    });
  }, []);

  // Proceed if fonts loaded OR if font loading failed (use system fonts as fallback)
  const interReady = fontsLoaded || !!fontError;
  const arabicReady = arabicFontsLoaded || !!arabicFontsError;
  if (!interReady || !arabicReady || !langHydrated) {
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
