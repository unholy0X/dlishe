import { BlurView } from "expo-blur";
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import ChevronRightIcon from "../icons/ChevronRightIcon";

export default function RecentRecipesHeader({ onPressSeeAll }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>Recent Recipes</Text>
      <Pressable onPress={onPressSeeAll}>
        <BlurView intensity={105} tint="extraLight" style={styles.blur}>
          <Text style={styles.buttonText}>See all</Text>
          <View style={styles.arrow}>
            <ChevronRightIcon width={9} height={8} color="#555555" />
          </View>
        </BlurView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  blur: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111111",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "medium",
    color: "#555555",
  },
  arrow: {
    marginLeft: 8,
  },
});
