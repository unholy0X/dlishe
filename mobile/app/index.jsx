import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useSignIn, useOAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Svg, { Path } from "react-native-svg";

WebBrowser.maybeCompleteAuthSession();

/* ─── design tokens ─── */
const C = {
  bg: "#111111",
  card: "#1c1c1e",
  green: "#2DD955",
  greenMuted: "rgba(45,217,85,0.12)",
  white: "#ffffff",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.55)",
  textTertiary: "rgba(255,255,255,0.3)",
  inputBg: "rgba(255,255,255,0.08)",
  inputBorder: "rgba(255,255,255,0.10)",
  border: "rgba(255,255,255,0.08)",
  error: "#ff5a5a",
};

/* ─── google "G" icon ─── */
function GoogleIcon({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyStrategy, setVerifyStrategy] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/home");
    }
  }, [isSignedIn, router]);

  /* ── Google OAuth ── */
  const handleGoogleSignIn = useCallback(async () => {
    if (googleLoading) return;
    setError("");
    setGoogleLoading(true);
    try {
      const redirectUrl = Linking.createURL("oauth-native-callback");
      const { createdSessionId, setActive: setActiveSession } =
        await startOAuthFlow({ redirectUrl });
      if (createdSessionId) {
        await setActiveSession({ session: createdSessionId });
      }
    } catch (err) {
      if (err?.message?.includes("cancelled")) return;
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Google sign-in failed";
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  }, [startOAuthFlow, googleLoading]);

  /* ── Email / password ── */
  const handleEmailSignIn = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
      } else if (result.status === "needs_second_factor") {
        const factors = result.supportedSecondFactors;
        const strategy =
          factors?.find((f) => f.strategy === "email_code")?.strategy ??
          factors?.find((f) => f.strategy === "phone_code")?.strategy ??
          factors?.find((f) => f.strategy === "totp")?.strategy ??
          null;

        if (!strategy) {
          setError("Verification required but no supported method found.");
          return;
        }
        if (strategy === "email_code" || strategy === "phone_code") {
          await signIn.prepareSecondFactor({ strategy });
        }
        setVerifyStrategy(strategy);
      } else {
        setError(`Unexpected status: ${result.status}`);
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

  /* ── 2FA verify ── */
  const handleVerify = async () => {
    if (!isLoaded || !verifyStrategy) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: verifyStrategy,
        code: verifyCode,
      });
      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
      } else {
        setError(`Unexpected status: ${result.status}`);
      }
    } catch (err) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Invalid code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyLabel =
    verifyStrategy === "email_code"
      ? "We sent a code to your email"
      : verifyStrategy === "phone_code"
      ? "We sent a code to your phone"
      : "Enter code from your authenticator app";

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Logo + Brand ── */}
            <View style={styles.brandSection}>
              <Image
                source={require("../assets/icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.brandName}>DLISHE</Text>
              <Text style={styles.brandTagline}>Your kitchen awaits</Text>
            </View>

            {/* ── Form area ── */}
            <View style={styles.formArea}>
              {error ? <Text style={styles.error}>{error}</Text> : null}

              {!verifyStrategy ? (
                <>
                  {/* Google */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.googleButton,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <View style={styles.googleInner}>
                        <GoogleIcon />
                        <Text style={styles.googleText}>Continue with Google</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Divider */}
                  <View style={styles.dividerRow}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or sign in with email</Text>
                    <View style={styles.divider} />
                  </View>

                  {/* Email */}
                  <TextInput
                    placeholder="Email address"
                    placeholderTextColor={C.textTertiary}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                  />

                  {/* Password */}
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor={C.textTertiary}
                    style={[styles.input, { marginTop: 12 }]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleEmailSignIn}
                  />

                  {/* Sign in */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={handleEmailSignIn}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={C.bg} />
                    ) : (
                      <Text style={styles.primaryText}>Sign in</Text>
                    )}
                  </Pressable>

                  {/* Sign up link */}
                  <Pressable
                    style={styles.link}
                    onPress={() => router.push("/sign-up")}
                  >
                    <Text style={styles.linkText}>
                      New to DLISHE?{" "}
                      <Text style={styles.linkAccent}>Create account</Text>
                    </Text>
                  </Pressable>
                </>
              ) : (
                /* ── 2FA verification ── */
                <>
                  <View style={styles.verifyHeader}>
                    <View style={styles.verifyBadge}>
                      <Text style={styles.verifyBadgeText}>
                        {verifyStrategy === "email_code" ? "\u2709\uFE0F" : verifyStrategy === "phone_code" ? "\uD83D\uDCF1" : "\uD83D\uDD10"}
                      </Text>
                    </View>
                    <Text style={styles.verifyTitle}>Verification</Text>
                    <Text style={styles.verifyHint}>{verifyLabel}</Text>
                  </View>

                  <TextInput
                    placeholder="000000"
                    placeholderTextColor={C.textTertiary}
                    style={[styles.input, styles.codeInput]}
                    value={verifyCode}
                    onChangeText={setVerifyCode}
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={6}
                    textAlign="center"
                  />

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={handleVerify}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={C.bg} />
                    ) : (
                      <Text style={styles.primaryText}>Verify</Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.link}
                    onPress={() => {
                      setVerifyStrategy(null);
                      setVerifyCode("");
                      setError("");
                    }}
                  >
                    <Text style={styles.linkText}>Back to login</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: "center",
  },

  /* ── brand ── */
  brandSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 88,
    height: 88,
  },
  brandName: {
    marginTop: 16,
    fontSize: 32,
    fontFamily: "Inter_600SemiBold",
    color: C.white,
    letterSpacing: 6,
  },
  brandTagline: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },

  /* ── form ── */
  formArea: {},
  error: {
    color: C.error,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
    textAlign: "center",
  },

  /* ── google ── */
  googleButton: {
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  googleInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  googleText: {
    color: C.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },

  /* ── divider ── */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  dividerText: {
    marginHorizontal: 14,
    color: C.textTertiary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  /* ── inputs ── */
  input: {
    backgroundColor: C.inputBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: C.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  codeInput: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 10,
    paddingVertical: 18,
  },

  /* ── primary ── */
  primaryButton: {
    marginTop: 20,
    backgroundColor: C.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: {
    color: C.bg,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── links ── */
  link: {
    marginTop: 22,
    alignItems: "center",
  },
  linkText: {
    color: C.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  linkAccent: {
    color: C.green,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── verify ── */
  verifyHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  verifyBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.greenMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  verifyBadgeText: {
    fontSize: 26,
  },
  verifyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: C.textPrimary,
  },
  verifyHint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
});
