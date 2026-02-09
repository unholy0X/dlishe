import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

const ITEMS = [
  {
    key: "breakfast",
    label: "Breakfast",
    image: require("../../assets/Breakfast.png"),
  },
  { key: "lunch", label: "Lunch", image: require("../../assets/Lunch.png") },
  { key: "dinner", label: "Dinner", image: require("../../assets/Dinner.png") },
  {
    key: "more",
    label: "More",
    image: require("../../assets/More.png"),
    bgColor: "#7FEE7F",
    textColor: "#385225",
  },
];

export default function MealCategoryGrid() {
  return (
    <View style={styles.grid}>
      {ITEMS.map((item) => (
        <View
          key={item.key}
          style={[
            styles.card,
            item.bgColor && { backgroundColor: item.bgColor },
          ]}
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
            {item.label}
          </Text>
        </View>
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
