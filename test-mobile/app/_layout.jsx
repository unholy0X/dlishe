import React, { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
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
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key, value) {
    return SecureStore.setItemAsync(key, value);
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

  return <Slot />;
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
