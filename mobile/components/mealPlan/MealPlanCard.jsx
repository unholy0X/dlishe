import React from "react";
import { View, Text, StyleSheet, Pressable, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import CalendarIcon from "../icons/CalendarIcon";
import Svg, { Path } from "react-native-svg";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function ChevronRightSmall() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#385225" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}>
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

export default function MealPlanCard({ mealsPerDay = [], totalMeals = 0, onPress }) {
  const { t } = useTranslation("mealPlan");
  const dayLabels = DAY_KEYS.map((k) => {
    const short = t(`daysShort.${k}`, { defaultValue: "" });
    return short ? short : t(`days.${k}`).charAt(0).toUpperCase();
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
    >
      {/* Accent bubbles matching StatsCardsRow */}
      <View style={styles.accent1} />
      <View style={styles.accent2} />

      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <CalendarIcon width={16} height={16} color="#385225" />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t("card.title")}</Text>
          <Text style={styles.subtitle}>
            {t("card.subtitle", { count: totalMeals })}
          </Text>
        </View>
        <ChevronRightSmall />
      </View>

      {/* Mini week bar */}
      <View style={styles.weekBar}>
        {dayLabels.map((label, i) => {
          const count = mealsPerDay[i] || 0;
          const filled = count > 0;
          return (
            <View key={i} style={styles.dayCol}>
              <Text style={styles.dayLabel}>{label}</Text>
              <View style={[styles.dayBar, filled && styles.dayBarFilled]}>
                {filled && (
                  <View
                    style={[
                      styles.dayBarInner,
                      { height: `${Math.min(count * 33, 100)}%` },
                    ]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EAF4E0",
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    marginBottom: 6,
    overflow: "hidden",
  },
  accent1: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    top: -25,
    right: -20,
    backgroundColor: "#A3D977",
    opacity: 0.35,
  },
  accent2: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    top: -15,
    right: -10,
    backgroundColor: "#A3D977",
    opacity: 0.25,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(56, 82, 37, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#385225",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#5A7A3A",
    marginTop: 1,
  },
  weekBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 4,
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#5A7A3A",
  },
  dayBar: {
    width: "100%",
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  dayBarFilled: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  dayBarInner: {
    width: "100%",
    backgroundColor: "#385225",
    borderRadius: 6,
  },
});
