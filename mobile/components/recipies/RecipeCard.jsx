import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";

export default function RecipeCard({
  title,
  description,
  meta,
  image,
  thumbnailUrl,
  onPress,
}) {
  const imageSource = thumbnailUrl ? { uri: thumbnailUrl } : image;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {imageSource ? (
        <Image source={imageSource} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>
            {title ? title.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 18,
  },
  placeholder: {
    backgroundColor: "#DFF7C4",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: "600",
    color: "#385225",
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "500",
    color: "#000",
    letterSpacing: -0.05,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    color: "#385225",
    letterSpacing: -0.05,
  },
  meta: {
    marginTop: 8,
    fontSize: 12,
    color: "#B4B4B4",
    letterSpacing: -0.05,
  },
});
