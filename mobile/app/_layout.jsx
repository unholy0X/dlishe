import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { useAuth } from "@clerk/clerk-expo";
import UserSync from "../components/UserSync";

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
      // SecureStore can fail on Android production (keystore issues, value too large)
      console.error("SecureStore save error:", err);
      alert(`Token save failed: ${err?.message}`);
    }
  },
};

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { isSignedIn, isLoaded } = useAuth();

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
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to your .env file."
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <UserSync />
        <AuthGate />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
