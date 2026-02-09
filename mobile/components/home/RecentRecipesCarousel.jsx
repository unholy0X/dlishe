import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RecipePlaceholder from "../RecipePlaceholder";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.62;
const CARD_HEIGHT = CARD_WIDTH * 1.28;
const CARD_GAP = 14;

export default function RecentRecipesCarousel({ items = [], onPressItem }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + CARD_GAP}
      snapToAlignment="start"
    >
      {items.map((item, index) => {
        const imageSource = item.thumbnailUrl
          ? { uri: item.thumbnailUrl }
          : null;

        return (
          <Pressable
            key={item.id || item.title}
            style={[styles.card, index > 0 && { marginLeft: CARD_GAP }]}
            onPress={() => onPressItem?.(item)}
          >
            {imageSource ? (
              <Image source={imageSource} style={styles.image} />
            ) : (
              <RecipePlaceholder title={item.title} variant="large" style={styles.image} />
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.55)"]}
              style={styles.gradient}
            />
            <View style={styles.overlay}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
