import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import HeartIcon from "../icons/HeartIcon";

function FlameIcon({ width = 12, height = 12, color = "#4A2D73" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 23c-4.97 0-8-3.03-8-7.5 0-3.82 2.77-7.3 5.06-9.74A.75.75 0 0 1 10.35 6c-.02 2.1.82 3.93 2.15 5.15.28-.72.5-1.56.5-2.4 0-.42-.04-.83-.13-1.23a.75.75 0 0 1 1.15-.76C16.21 8.47 20 12.07 20 15.5c0 4.47-3.03 7.5-8 7.5Z" />
    </Svg>
  );
}

function TimerIcon({ width = 12, height = 12, color = "#7A4A21" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 2h4" />
      <Path d="M12 14V10" />
      <Path d="M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
    </Svg>
  );
}

const CARDS = [
  {
    key: "favorites",
    statKey: "favorites",
    bg: "#FDEEEE",
    accent: "#F9BABA",
    accent2: "#F9DEDE",
    text: "#943040",
    iconColor: "#E84057",
  },
  {
    key: "high-protein",
    statKey: "highProtein",
    bg: "#CCB7F9",
    accent: "#A896F0",
    accent2: "#BFAEFF",
    text: "#4A2D73",
  },
  {
    key: "quick-meals",
    statKey: "quickMeals",
    bg: "#FDC597",
    accent: "#F0A45E",
    accent2: "#F7BC85",
    text: "#7A4A21",
  },
];

export default function StatsCardsRow({
  favoriteCount = 0,
  onPressFavorites,
  onPressHighProtein,
  onPressQuickMeals,
}) {
  const { t } = useTranslation("home");
  const handlers = {
    favorites: onPressFavorites,
    "high-protein": onPressHighProtein,
    "quick-meals": onPressQuickMeals,
  };

  return (
    <View style={styles.row}>
      {CARDS.map((card) => (
        <Pressable
          key={card.key}
          style={[styles.card, { backgroundColor: card.bg }]}
          onPress={handlers[card.key]}
        >
          <View style={[styles.accent, { backgroundColor: card.accent }]} />
          <View style={[styles.accent2, { backgroundColor: card.accent }]} />
          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              {card.key === "favorites" && (
                <HeartIcon width={12} height={12} color={card.iconColor} filled />
              )}
              {card.key === "high-protein" && (
                <FlameIcon width={12} height={12} color={card.text} />
              )}
              {card.key === "quick-meals" && (
                <TimerIcon width={12} height={12} color={card.text} />
              )}
              <Text style={[styles.title, { color: card.text }, styles.titleWithIcon]}>
                {t(`stats.${card.statKey}`)}
              </Text>
            </View>
            {card.key === "favorites" ? (
              <Text style={[styles.value, { color: card.text }]}>
                {String(favoriteCount)}
              </Text>
            ) : (
              <Text style={[styles.explore, { color: card.text }]}>
                {t("stats.explore")}
              </Text>
            )}
          </View>
        </Pressable>
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
  explore: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: "600",
  },
});
