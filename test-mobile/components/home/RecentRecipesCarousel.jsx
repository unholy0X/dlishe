import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";

export default function RecentRecipesCarousel({ items = [] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {items.map((item, index) => (
        <View key={item.title} style={[styles.card, index > 0 && styles.spacing]}>
          <Image source={item.image} style={styles.image} />
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.meta}>{item.meta}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -20,
  },
  row: {
    paddingHorizontal: 20,
    paddingRight: 12,
    marginTop: 10,
  },
  spacing: {
    marginLeft: 12,
  },
  card: {
    width: 220,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    borderRadius: 28,
    height: 180,
  },
  title: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    letterSpacing: -0.05,
  },
  meta: {
    paddingBottom: 12,
    marginTop: 6,
    fontSize: 14,
    color: "#A1A0A6",
    letterSpacing: -0.05,
  },
});
