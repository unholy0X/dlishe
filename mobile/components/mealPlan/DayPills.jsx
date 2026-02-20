import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function DayPills({ weekStart, selectedDay, onSelectDay, mealsPerDay = [] }) {
  const { t } = useTranslation("mealPlan");
  const monday = weekStart ? new Date(weekStart) : new Date();

  return (
    <View style={styles.container}>
      {DAY_KEYS.map((key, i) => {
        const short = t(`daysShort.${key}`, { defaultValue: "" });
        const label = short ? short : t(`days.${key}`).substring(0, 3);
        const isActive = selectedDay === i;
        const hasMeals = (mealsPerDay[i] || 0) > 0;
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dayNum = date.getDate();

        return (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.pill,
              isActive && styles.pillActive,
              pressed && !isActive && { backgroundColor: "#F0F0F0" },
            ]}
            onPress={() => onSelectDay(i)}
          >
            <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
              {label}
            </Text>
            <Text style={[styles.dayNum, isActive && styles.dayNumActive]}>
              {dayNum}
            </Text>
            {hasMeals && !isActive && <View style={styles.dot} />}
            {hasMeals && isActive && <View style={styles.dotActive} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  pillActive: {
    backgroundColor: "#385225",
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#B4B4B4",
    letterSpacing: -0.05,
  },
  dayLabelActive: {
    color: "rgba(255,255,255,0.7)",
  },
  dayNum: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginTop: 1,
    letterSpacing: -0.3,
  },
  dayNumActive: {
    color: "#ffffff",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#385225",
    marginTop: 4,
  },
  dotActive: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#7FEF80",
    marginTop: 4,
  },
});
