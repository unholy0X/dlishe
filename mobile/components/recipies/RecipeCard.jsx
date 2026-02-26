import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Image } from "expo-image";
import HeartIcon from "../icons/HeartIcon";
import RecipePlaceholder from "../RecipePlaceholder";
import { sc } from "../../utils/deviceScale";

export default function RecipeCard({
  title,
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
        <Image source={imageSource} style={styles.image} transition={200} />
      ) : (
        <RecipePlaceholder title={title} variant="medium" style={styles.image} />
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
                  width={sc(20)}
                  height={sc(20)}
                  color={isFavorite ? "#E84057" : "#C8C8C8"}
                  filled={isFavorite}
                />
              </Animated.View>
            </Pressable>
          )}
        </View>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  image: {
    width: sc(110),
    height: sc(110),
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    fontSize: sc(17),
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
    lineHeight: sc(22),
  },
  heartBtn: {
    paddingLeft: 10,
    paddingTop: 1,
  },
  meta: {
    marginTop: 6,
    fontSize: sc(13),
    color: "#B4B4B4",
    letterSpacing: -0.05,
  },
});
