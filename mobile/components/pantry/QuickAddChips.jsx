import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";

const ITEMS = ["Eggs", "Milk", "Butter"];
const ITEMS_C = ["Onions", "Garlic", "Lemons"];

export default function QuickAddChips({ onPressItem }) {
  const { t } = useTranslation("pantry");
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("quickAdd.title", "Quick add")}</Text>
      <View style={styles.grid}>
        {ITEMS.map((label) => (
          <View key={label} style={styles.chipWrap}>
            <Pressable onPress={() => onPressItem?.(label)}>
              <BlurView intensity={100} tint="light" style={styles.blur}>
                <Text style={styles.chipText}>{label}</Text>
              </BlurView>
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {ITEMS_C.map((label) => (
          <View key={label} style={styles.chipWrap}>
            <Pressable onPress={() => onPressItem?.(label)}>
              <BlurView intensity={100} tint="light" style={styles.blur}>
                <Text style={styles.chipText}>{label}</Text>
              </BlurView>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#000",
    marginBottom: 16,
    letterSpacing: -0.05
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20
  },
  chipWrap: {
    marginBottom: 12,
  },

  blur: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    margin: 3
  },
  chipText: {
    fontSize: 14,
    color: "#555555",
    fontWeight: "medium"
  },
});
