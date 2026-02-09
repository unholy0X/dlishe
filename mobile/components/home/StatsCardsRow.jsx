import React from "react";
import { View, Text, StyleSheet } from "react-native";
import HeartIcon from "../icons/HeartIcon";

const CARDS = [
  {
    key: "favorites",
    title: "Favorites",
    bg: "#FDEEEE",
    accent: "#F9BABA",
    accent2: "#F9DEDE",
    text: "#943040",
    iconColor: "#E84057",
  },
  {
    key: "lunch",
    title: "Lunch",
    bg: "#CCB7F9",
    accent: "#A896F0",
    accent2: "#BFAEFF",
    text: "#4A2D73",
  },
  {
    key: "dinner",
    title: "Dinner",
    bg: "#FDC597",
    accent: "#F0A45E",
    accent2: "#F7BC85",
    text: "#7A4A21",
  },
];

export default function StatsCardsRow({ favoriteCount = 0 }) {
  const values = {
    favorites: String(favoriteCount),
    lunch: "0",
    dinner: "0",
  };

  return (
    <View style={styles.row}>
      {CARDS.map((card) => (
        <View
          key={card.key}
          style={[styles.card, { backgroundColor: card.bg }]}
        >
          <View style={[styles.accent, { backgroundColor: card.accent }]} />
          <View style={[styles.accent2, { backgroundColor: card.accent }]} />
          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              {card.key === "favorites" && (
                <HeartIcon width={12} height={12} color={card.iconColor} filled />
              )}
              <Text style={[styles.title, { color: card.text }, card.key === "favorites" && styles.titleWithIcon]}>
                {card.title}
              </Text>
            </View>
            <Text style={[styles.value, { color: card.text }]}>
              {values[card.key]}
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
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 13,
  },
  titleWithIcon: {
    marginLeft: 4,
  },
  value: {
    marginTop: 18,
    fontSize: 35,
    fontWeight: "medium",
  },
});
