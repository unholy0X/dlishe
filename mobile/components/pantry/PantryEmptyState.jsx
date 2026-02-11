import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import PlusIcon from "../icons/PlusIcon";

export default function PantryEmptyState({
  title = "A Peaceful Pantry",
  subtitle = "Add ingredients you have at home to\ndiscover what you can create",
  onPressAdd,
}) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/pantryshelf.png")}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <Pressable style={styles.button} onPress={onPressAdd}>
        <Text style={styles.buttonText}>Add Ingredients</Text>
        <PlusIcon width={18} height={18} color="#2a5a2a" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  image: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "normal",
    color: "#000",
    letterSpacing: -0.05
  },
  subtitle: {
    marginVertical: 12,
    fontSize: 14,
    color: "#B4B4B4",
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.05
  },
  button: {
    // marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#385225",
    marginRight: 8,
    letterSpacing: -0.05
  },
});
