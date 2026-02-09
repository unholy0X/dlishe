import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";

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
  onBack,
  onServe,
  onWatchStep,
  imageUri,
}) {
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
        <Image
          source={imageUri ? { uri: imageUri } : require("../assets/recipe-done.png")}
          style={s.image}
        />
      </View>

      <Text style={s.meta}>7 steps completed ≈25 minutes active</Text>

      {/* Primary */}
      <Pressable style={s.primaryBtn} onPress={onServe}>
        <Text style={s.primaryText}>🍽  Serve & enjoy</Text>
      </Pressable>

      {/* Secondary row */}
      <View style={s.secondaryRow}>
        <Pressable style={s.secondaryBtn} onPress={onWatchStep}>
          <Text style={s.secondaryText}>🔖  Watch this step</Text>
        </Pressable>
        <Pressable style={s.secondaryBtn} onPress={onWatchStep}>
          <Text style={s.secondaryText}>🎥  Watch this step</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 20,
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

  secondaryRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.greenDark,
  },
});
