import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ITEMS = [
  {
    key: "saved",
    title: "Saved\nRecipes",
    value: "10",
    bg: "#9BC6FB",
    accent: "#6FAFEF",
    accent2: "#86BCF7",
    text: "#28457A",
  },
  {
    key: "lunch",
    title: "Lunch",
    value: "0",
    bg: "#CCB7F9",
    accent: "#A896F0",
    accent2: "#BFAEFF",
    text: "#4A2D73",
  },
  {
    key: "dinner",
    title: "Dinner",
    value: "0",
    bg: "#FDC597",
    accent: "#F0A45E",
    accent2: "#F7BC85",
    text: "#7A4A21",
  },
];

export default function StatsCardsRow() {
  return (
    <View style={styles.row}>
      {ITEMS.map((item) => (
        <View
          key={item.key}
          style={[styles.card, { backgroundColor: item.bg }]}
        >
          <View style={[styles.accent, { backgroundColor: item.accent }]} />
          <View style={[styles.accent2, { backgroundColor: item.accent }]} />
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <Text style={[styles.title, { color: item.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.value, { color: item.text }]}>
              {item.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  card: {
    width: "31%",
    borderRadius: 20,
    padding: 13,
    minHeight: 10,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 45,
    top: -20,
    right: -20,
    opacity: 0.7,
  },
  accent2: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 45,
    top: -15,
    right: -15,
    opacity: 0.7,
  },
  title: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 13,
  },
  value: {
    marginTop: 18,
    fontSize: 35,
    fontWeight: "medium",
  },
});
