import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import SuggestionCard from "../SuggestionCard";

export default function SuggestionRow({ items = [] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {items.map((item, index) => (
        <View key={item.title} style={index > 0 && styles.itemSpacing}>
          <SuggestionCard
            title={item.title}
            subtitle={item.subtitle}
            Icon={item.Icon}
          />
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
  },
  itemSpacing: {
    marginLeft: 12,
  },
});
