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
import { useAuth, useSignIn, useOAuth, useSignInWithApple } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Svg, { Path } from "react-native-svg";
import { useDemoStore } from "../store/demoStore";

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

/* ─── parse auth errors into user-friendly messages ─── */
function parseAuthError(err, fallback) {
  const raw = (err?.message ?? "").toLowerCase();
  if (raw.includes("network request failed") || raw.includes("failed to fetch")) {
    return "No internet connection. Please check your network and try again.";
  }
  if (
    raw.includes("cannot read") ||
    raw.includes("network") ||
    raw.includes("timeout") ||
    raw.includes("tostring") ||
    err?.status === 503 ||
    err?.status === 500
  ) {
    return "Sign-in services are temporarily unavailable. Please try again shortly.";
  }
  return (
    err?.errors?.[0]?.longMessage ??
    err?.errors?.[0]?.message ??
    err?.message ??
    fallback
  );
}

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
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startAppleAuthenticationFlow } = useSignInWithApple();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyStrategy, setVerifyStrategy] = useState(null);
  const [verifyFactor, setVerifyFactor] = useState(null); // "first" or "second"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [serviceWarning, setServiceWarning] = useState("");

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/home");
    }
  }, [isSignedIn, router]);

  /* ── Clerk status monitor — polls every 60s, clears when recovered ── */
  useEffect(() => {
    let interval;

    function checkStatus() {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      fetch("https://status.clerk.com/api/v2/status.json", { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          if (data?.status?.indicator && data.status.indicator !== "none") {
            setServiceWarning(
              "Our sign-in provider is experiencing issues. Authentication may be temporarily slow or unavailable — please try again shortly."
            );
          } else {
            setServiceWarning("");
          }
        })
        .catch(() => {})
        .finally(() => clearTimeout(timer));
    }

    checkStatus();
    interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ── Google OAuth ── */
  const handleGoogleSignIn = useCallback(async () => {
    if (googleLoading) return;
    setError("");
    setGoogleLoading(true);
    try {
      const redirectUrl = Linking.createURL("oauth-native-callback");
      const { createdSessionId, setActive: setActiveSession } =
        await startGoogleOAuth({ redirectUrl });
      if (createdSessionId) {
        await setActiveSession({ session: createdSessionId });
      }
    } catch (err) {
      if (err?.message?.includes("cancelled")) return;
      setError(parseAuthError(err, "Google sign-in failed"));
    } finally {
      setGoogleLoading(false);
    }
  }, [startGoogleOAuth, googleLoading]);

  /* ── Apple (native) ── */
  const handleAppleSignIn = useCallback(async () => {
    if (appleLoading) return;
    setError("");
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive: setActiveSession } =
        await startAppleAuthenticationFlow();
      if (createdSessionId) {
        const activate = setActiveSession ?? setActive;
        await activate({ session: createdSessionId });
      } else {
        setError("Apple sign-in failed. Please try again.");
      }
    } catch (err) {
      if (err?.code === "ERR_REQUEST_CANCELED") return;
      if (err?.message?.includes("cancelled")) return;
      setError(parseAuthError(err, "Apple sign-in failed"));
    } finally {
      setAppleLoading(false);
    }
  }, [startAppleAuthenticationFlow, setActive, appleLoading]);

  /* ── Email / password ── */
  const handleEmailSignIn = async () => {
    if (!isLoaded) return;
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    // Demo account — bypass Clerk entirely.
    // Credentials are set via EXPO_PUBLIC_DEMO_EMAIL / EXPO_PUBLIC_DEMO_PASSWORD.
    const demoEmail = process.env.EXPO_PUBLIC_DEMO_EMAIL;
    const demoPassword = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
    if (demoEmail && demoPassword && trimmedEmail === demoEmail && password === demoPassword) {
      setLoading(true);
      try {
        await useDemoStore.getState().activate();
        router.replace("/home");
      } catch {
        setError("Demo login failed. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({ identifier: trimmedEmail, password });

      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
      } else if (result.status === "needs_first_factor") {
        // Clerk requires first-factor verification (e.g. email on new device)
        const factors = result.supportedFirstFactors;
        const strategy =
          factors?.find((f) => f.strategy === "email_code")?.strategy ??
          factors?.find((f) => f.strategy === "phone_code")?.strategy ??
          null;

        if (!strategy) {
          setError("Verification required but no supported method found.");
          return;
        }
        await signIn.prepareFirstFactor({ strategy });
        setVerifyFactor("first");
        setVerifyStrategy(strategy);
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
        setVerifyFactor("second");
        setVerifyStrategy(strategy);
      } else {
        setError("Sign in failed. Please try again or use another method.");
      }
    } catch (err) {
      setError(parseAuthError(err, "Incorrect email or password"));
    } finally {
      setLoading(false);
    }
  };

  /* ── Verify (first-factor or second-factor) ── */
  const handleVerify = async () => {
    if (!isLoaded || !verifyStrategy || !verifyFactor) return;
    setError("");
    setLoading(true);
    try {
      const attempt = verifyFactor === "first"
        ? signIn.attemptFirstFactor({ strategy: verifyStrategy, code: verifyCode })
        : signIn.attemptSecondFactor({ strategy: verifyStrategy, code: verifyCode });

      const result = await attempt;

      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
      } else if (result.status === "needs_second_factor") {
        // First factor passed, now need 2FA
        const factors = result.supportedSecondFactors;
        const strategy =
          factors?.find((f) => f.strategy === "email_code")?.strategy ??
          factors?.find((f) => f.strategy === "phone_code")?.strategy ??
          factors?.find((f) => f.strategy === "totp")?.strategy ??
          null;

        if (!strategy) {
          setError("2FA required but no supported method found.");
          return;
        }
        if (strategy === "email_code" || strategy === "phone_code") {
          await signIn.prepareSecondFactor({ strategy });
        }
        setVerifyCode("");
        setVerifyFactor("second");
        setVerifyStrategy(strategy);
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err) {
      setError(parseAuthError(err, "Invalid code"));
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
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
              {serviceWarning ? (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>⚠️  {serviceWarning}</Text>
                  <Pressable onPress={() => setServiceWarning("")} hitSlop={12}>
                    <Text style={styles.warningDismiss}>✕</Text>
                  </Pressable>
                </View>
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              {!verifyStrategy ? (
                <>
                  {/* Apple */}
                  {Platform.OS === "ios" && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.appleButton,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={handleAppleSignIn}
                      disabled={appleLoading}
                    >
                      {appleLoading ? (
                        <ActivityIndicator color={C.bg} size="small" />
                      ) : (
                        <View style={styles.googleInner}>
                          <Svg width={18} height={18} viewBox="0 0 24 24" fill={C.bg}>
                            <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                          </Svg>
                          <Text style={styles.appleText}>Continue with Apple</Text>
                        </View>
                      )}
                    </Pressable>
                  )}

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

                  {/* Legal links */}
                  <View style={styles.legalRow}>
                    <Pressable onPress={() => Linking.openURL("https://dlishe.com/terms")}>
                      <Text style={styles.legalText}>Terms of Use</Text>
                    </Pressable>
                    <Text style={styles.legalDot}> · </Text>
                    <Pressable onPress={() => Linking.openURL("https://dlishe.com/privacy")}>
                      <Text style={styles.legalText}>Privacy Policy</Text>
                    </Pressable>
                  </View>
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
                      setVerifyFactor(null);
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
    paddingTop: "25%",
    paddingBottom: 80,
    flexGrow: 1,
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
  warningBanner: {
    backgroundColor: "rgba(255,184,0,0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,184,0,0.28)",
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  warningText: {
    color: "#FFB800",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },
  warningDismiss: {
    color: "#FFB800",
    fontSize: 14,
    opacity: 0.7,
    marginTop: 1,
  },
  error: {
    color: C.error,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
    textAlign: "center",
  },

  /* ── apple ── */
  appleButton: {
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  appleText: {
    color: C.bg,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
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
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  legalText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 12,
    color: C.textSecondary,
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
