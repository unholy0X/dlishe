import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { sc } from "../utils/deviceScale";

export default function SuggestionCard({ title, subtitle, Icon, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
      onPress={onPress}
    >
      <View style={styles.iconWrap}>{Icon ? <Icon /> : null}</View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.subtitle, {color: subtitle.color}]}>{subtitle.txt}</Text>
      </View>
    </Pressable>
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
    marginRight: 12,
  },
  title: {
    fontSize: sc(16),
    fontWeight: "normal",
    color: "#111111",
    letterSpacing: -0.05,
  },
  subtitle: {
    marginTop: 2,
    fontSize: sc(12),
    fontWeight: "normal",
    letterSpacing: -0.05,
  },
});
