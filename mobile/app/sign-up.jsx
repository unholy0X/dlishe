import React, { useState } from "react";
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
import { useSignUp } from "@clerk/clerk-expo";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignUp = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
        router.replace("/home");
      }
    } catch (err) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Invalid verification code";
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          <View style={styles.formCard}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!pendingVerification ? (
              <>
                <Pressable style={styles.googleButton} onPress={() => {}}>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.nameRow}>
                  <TextInput
                    placeholder="First name"
                    placeholderTextColor="#9d9388"
                    style={[styles.input, styles.nameInput]}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                  <TextInput
                    placeholder="Last name"
                    placeholderTextColor="#9d9388"
                    style={[styles.input, styles.nameInput]}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>

                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#9d9388"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9d9388"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <Pressable style={styles.primaryButton} onPress={onSignUp}>
                  {loading ? (
                    <ActivityIndicator color="#2a5a2a" />
                  ) : (
                    <Text style={styles.primaryText}>Sign up</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  placeholder="123456"
                  placeholderTextColor="#9d9388"
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                />

                <Pressable style={styles.primaryButton} onPress={onVerify}>
                  {loading ? (
                    <ActivityIndicator color="#2a5a2a" />
                  ) : (
                    <Text style={styles.primaryText}>Verify</Text>
                  )}
                </Pressable>
              </>
            )}

            <Pressable
              style={styles.link}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.linkText}>
                Already have an account?{" "}
                <Text style={styles.linkAccent}>Sign In</Text>
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
    marginTop: 12,
    backgroundColor: "#F4F5F7",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#111111",
    borderWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  nameInput: {
    width: "48%",
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
  googleButton: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  googleText: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e5e5",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#b0b0b0",
    fontSize: 12,
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
