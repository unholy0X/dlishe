import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from "react-native";

export default function RecentRecipesCarousel({ items = [], onPressItem }) {
  // Pair items into columns of 2 for the 2-row grid
  const columns = [];
  for (let i = 0; i < items.length; i += 2) {
    columns.push(items.slice(i, i + 2));
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {columns.map((pair, colIndex) => (
        <View key={colIndex} style={[styles.column, colIndex > 0 && styles.columnSpacing]}>
          {pair.map((item) => {
            const imageSource = item.thumbnailUrl
              ? { uri: item.thumbnailUrl }
              : null;

            return (
              <Pressable
                key={item.id || item.title}
                style={styles.card}
                onPress={() => onPressItem?.(item)}
              >
                {imageSource ? (
                  <Image source={imageSource} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.placeholder]}>
                    <Text style={styles.placeholderText}>
                      {item.title ? item.title.charAt(0).toUpperCase() : "?"}
                    </Text>
                  </View>
                )}
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                {item.meta ? (
                  <Text style={styles.meta} numberOfLines={1}>{item.meta}</Text>
                ) : null}
              </Pressable>
            );
          })}
          {pair.length === 1 && <View style={styles.cardSpacer} />}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  column: {
    gap: 12,
  },
  columnSpacing: {
    marginLeft: 12,
  },
  card: {
    width: 168,
    overflow: "hidden",
  },
  cardSpacer: {
    width: 168,
    height: 160,
  },
  image: {
    width: "100%",
    height: 130,
    borderRadius: 20,
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
  title: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
  },
  meta: {
    marginTop: 3,
    fontSize: 12,
    color: "#B4B4B4",
    letterSpacing: -0.05,
  },
});
