import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useTranslation } from "react-i18next";

const ITEMS = [
  { key: "breakfast", image: require("../../assets/Breakfast.png") },
  { key: "lunch", image: require("../../assets/Lunch.png") },
  { key: "dinner", image: require("../../assets/Dinner.png") },
  {
    key: "more",
    image: require("../../assets/More.png"),
    bgColor: "#7FEE7F",
    textColor: "#385225",
  },
];

export default function MealCategoryGrid({ onPress }) {
  const { t } = useTranslation("mealPlan");

  return (
    <View style={styles.grid}>
      {ITEMS.map((item) => (
        <Pressable
          key={item.key}
          style={({ pressed }) => [
            styles.card,
            item.bgColor && { backgroundColor: item.bgColor },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onPress?.(item.key)}
        >
          <View style={styles.imageShadow}>
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
          <Text
            style={[styles.label, item.textColor && { color: item.textColor }]}
          >
            {t(`mealTypes.${item.key}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    width: "23%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  image: {
    width: 50,
    height: 50,
  },
  label: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "medium",
    color: "#141B34",
    letterSpacing: -0.05
  },
});
