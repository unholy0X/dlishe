import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import RecipePlaceholder from "../RecipePlaceholder";

const C = {
  bg: "#F4F5F7",
  card: "#ffffff",
  text: "#111111",
  muted: "#B4B4B4",
  green: "#7FEF80",
  greenDark: "#385225",
  greenLight: "#DFF7C4",
};

const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
};

export default function DoneSheet({
  title,
  imageUri,
  totalSteps,
  totalTime,
  onBack,
  onServe,
}) {
  const insets = useSafeAreaInsets();

  const metaParts = [];
  if (totalSteps) metaParts.push(`${totalSteps} steps completed`);
  if (totalTime > 0) metaParts.push(`\u2248${totalTime} min`);

  // Entrance animation
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Delayed text fade-in
    const timeout = setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 200);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable style={s.backBtn} onPress={onBack}>
          <Text style={s.backIcon}>←</Text>
          <Text style={s.backText}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        style={s.scrollView}
      >
        {/* Hero card */}
        <Animated.View
          style={[
            s.heroCard,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <View style={s.imageWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={s.image} transition={200} />
            ) : (
              <RecipePlaceholder title={title} variant="hero" style={s.image} />
            )}
          </View>

          <View style={s.heroBody}>
            <Animated.Text style={[s.doneLabel, { opacity: textOpacity }]}>
              All done!
            </Animated.Text>
            {title ? (
              <Text style={s.recipeTitle} numberOfLines={2}>{title}</Text>
            ) : null}
            <Text style={s.subtitle}>Your dish is ready to serve.</Text>

            {metaParts.length > 0 ? (
              <View style={s.metaRow}>
                {metaParts.map((part, i) => (
                  <View key={i} style={s.metaPill}>
                    <Text style={s.metaPillText}>{part}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Primary — pinned bottom */}
      <View style={[s.bottomAction, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={s.primaryBtn} onPress={onServe}>
          <Text style={s.primaryText}>Serve & enjoy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backIcon: {
    fontSize: 14,
    color: C.muted,
    marginRight: 6,
  },
  backText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.muted,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // ─── Hero card ────────────────────────────────
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 28,
    overflow: "hidden",
  },
  imageWrap: {
    backgroundColor: C.bg,
  },
  image: {
    width: "100%",
    height: 240,
  },
  heroBody: {
    padding: 24,
  },
  doneLabel: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: C.green,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  recipeTitle: {
    fontSize: 22,
    fontFamily: FONT.semibold,
    color: C.text,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.muted,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  metaPill: {
    backgroundColor: C.greenLight,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  metaPillText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: C.greenDark,
    letterSpacing: -0.05,
  },

  // ─── Bottom action ────────────────────────────
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  primaryBtn: {
    backgroundColor: C.green,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
});
