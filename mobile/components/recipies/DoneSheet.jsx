import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import RecipePlaceholder from "../RecipePlaceholder";

const C = {
  bg: "#F4F5F7",
  card: "#ffffff",
  text: "#111111",
  muted: "#B4B4B4",
  green: "#7FEF80",
  greenDark: "#385225",
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
  const metaText = metaParts.join("  ·  ");

  return (
    <View style={s.container}>
      {/* Back */}
      <Pressable style={s.backBtn} onPress={onBack}>
        <Text style={s.backIcon}>←</Text>
        <Text style={s.backText}>Back</Text>
      </Pressable>

      {/* Title */}
      <Text style={s.title}>All done</Text>
      <Text style={s.subtitle}>Take a moment, your dish is ready.</Text>

      {/* Image */}
      <View style={s.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.image} />
        ) : (
          <RecipePlaceholder title={title} variant="hero" style={s.image} />
        )}
      </View>

      {metaText ? <Text style={s.meta}>{metaText}</Text> : null}

      {/* Primary */}
      <Pressable style={s.primaryBtn} onPress={onServe}>
        <Text style={s.primaryText}>Serve & enjoy</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backIcon: {
    fontSize: 14,
    color: C.muted,
    marginRight: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.muted,
  },
  title: {
    marginTop: 18,
    fontSize: 28,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: C.muted,
    marginTop: 4,
  },

  imageWrap: {
    marginTop: 18,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  image: {
    width: "100%",
    height: 320,
    borderRadius: 24,
  },

  meta: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.muted,
  },

  primaryBtn: {
    marginTop: 18,
    backgroundColor: C.green,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
});
