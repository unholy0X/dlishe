import React, { useRef } from "react";
import { View, Text, StyleSheet, Image, Pressable, Animated } from "react-native";
import HeartIcon from "../icons/HeartIcon";

export default function RecipeCard({
  title,
  description,
  meta,
  image,
  thumbnailUrl,
  isFavorite,
  onPress,
  onToggleFavorite,
}) {
  const imageSource = thumbnailUrl ? { uri: thumbnailUrl } : image;
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleFavorite = () => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        useNativeDriver: true,
        friction: 3,
        tension: 300,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 200,
      }),
    ]).start();
    onToggleFavorite?.();
  };

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
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {onToggleFavorite && (
            <Pressable
              onPress={handleFavorite}
              hitSlop={12}
              style={styles.heartBtn}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <HeartIcon
                  width={20}
                  height={20}
                  color={isFavorite ? "#E84057" : "#C8C8C8"}
                  filled={isFavorite}
                />
              </Animated.View>
            </Pressable>
          )}
        </View>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "500",
    color: "#000",
    letterSpacing: -0.05,
  },
  heartBtn: {
    paddingLeft: 8,
    paddingTop: 2,
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
