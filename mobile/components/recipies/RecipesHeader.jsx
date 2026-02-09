import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function RecipesHeader({
  title = "My Recipes",
  subtitle = "10 recipes saved",
  onPressAdd,
}) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Pressable style={styles.addButton} onPress={onPressAdd}>
        <Text style={styles.addText}>Add</Text>
        <Text style={styles.plus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "normal",
    color: "#000",
    letterSpacing: -0.05
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#B4B4B4",
    letterSpacing: -0.05
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    letterSpacing: -0.05
  },
  addText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#385225",
  },
  plus: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "600",
    color: "#385225",
  },
});
