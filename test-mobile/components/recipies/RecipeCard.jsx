import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function RecipeCard({
  title,
  description,
  meta,
  image,
}) {
  return (
    <View style={styles.card}>
      <Image source={image} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 18,
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "medium",
    color: "#000",
    letterSpacing: -0.05
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    color: "#385225",
    letterSpacing: -0.05
  },
  meta: {
    marginTop: 8,
    fontSize: 12,
    color: "#B4B4B4",
    letterSpacing: -0.05
  },
});
