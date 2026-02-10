import React from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from "react-native";
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
  const metaParts = [];
  if (totalSteps) metaParts.push(`${totalSteps} steps completed`);
  if (totalTime > 0) metaParts.push(`≈${totalTime} min`);

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
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
        <View style={s.heroCard}>
          <View style={s.imageWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={s.image} />
            ) : (
              <RecipePlaceholder title={title} variant="hero" style={s.image} />
            )}
          </View>

          <View style={s.heroBody}>
            <Text style={s.doneLabel}>All done!</Text>
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
        </View>
      </ScrollView>

      {/* Primary — pinned bottom */}
      <View style={s.bottomAction}>
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
    paddingTop: 10,
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
    paddingBottom: 8,
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
