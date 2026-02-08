import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useSignIn } from "@clerk/clerk-expo";

export default function LoginScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/home");
    }
  }, [isSignedIn, router]);

  const handleEmailSignIn = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
      }
    } catch (err) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Incorrect email or password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Your kitchen awaits</Text>

          <View style={styles.formCard}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="you@email.com"
              placeholderTextColor="#B4B4B4"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#B4B4B4"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable style={styles.primaryButton} onPress={handleEmailSignIn}>
              {loading ? (
                <ActivityIndicator color="#2a5a2a" />
              ) : (
                <Text style={styles.primaryText}>Sign in</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.link}
              onPress={() => router.push("/sign-up")}
            >
              <Text style={styles.linkText}>
                Don&apos;t have an account?{" "}
                <Text style={styles.linkAccent}>Sign Up</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  safeArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  title: {
    fontSize: 32,
    fontWeight: "500",
    color: "#111111",
  },
  subtitle: {
    marginTop: 4,
    color: "#a0a0a0",
    fontSize: 14,
  },
  formCard: {
    marginTop: 20,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
  },
  error: {
    color: "#cc3b3b",
    fontSize: 12,
    marginBottom: 10,
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    color: "#7a7a7a",
  },
  input: {
    marginTop: 8,
    backgroundColor: "#F4F5F7",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#111111",
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#2a5a2a",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    marginTop: 14,
    alignItems: "center",
  },
  linkText: {
    color: "#6b6b6b",
    fontSize: 12,
  },
  linkAccent: {
    color: "#2a5a2a",
    fontWeight: "600",
  },
});
