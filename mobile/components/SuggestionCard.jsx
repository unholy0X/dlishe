import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SuggestionCard({ title, subtitle, Icon }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>{Icon ? <Icon /> : null}</View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.subtitle, {color: subtitle.color}]}>{subtitle.txt}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconWrap: {
    marginRight: 10,
  },
  textBlock: {
    flexShrink: 1,
    marginRight: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#111111",
    letterSpacing: -0.05,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "normal",
    // color: "#6b6b6b",
    letterSpacing: -0.05,
  },
});
