import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeIcon from "./icons/HomeIcon";
import RecipiesIcon from "./icons/RecipiesIcon";
import PantryIcon from "./icons/PantryIcon";
import ShoppingIcon from "./icons/ShoppingIcon";

const NAV_ITEMS = [
  { key: "home", label: "Home", Icon: HomeIcon },
  { key: "recipies", label: "Recipies", Icon: RecipiesIcon },
  { key: "pantry", label: "Pantry", Icon: PantryIcon },
  { key: "shopping", label: "Shopping", Icon: ShoppingIcon },
];

export default function FloatingNav({ onPressItem, onPressPlus, activeKey }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.navContainer}>
        <BlurView intensity={105} tint="extraLight" style={styles.blur}>
          <View style={styles.container}>
            <View style={styles.row}>
              <View style={styles.group}>
                {NAV_ITEMS.slice(0, 2).map((item, index) => {
                  const isActive = item.key === activeKey;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => onPressItem?.(item.key)}
                      style={[
                        styles.item,
                        index === 0 && styles.itemSpacing,
                        isActive && styles.itemActive,
                      ]}
                    >
                      <item.Icon
                        width={22}
                        height={22}
                        color={isActive ? "#141B34" : "#141B34"}
                      />
                      <Text
                        style={[styles.label, isActive && styles.labelActive]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* <View style={styles.centerSpacer} /> */}

              <View style={styles.group}>
                {NAV_ITEMS.slice(2).map((item, index) => {
                  const isActive = item.key === activeKey;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => onPressItem?.(item.key)}
                      style={[
                        styles.item,
                        index === 0 && styles.itemSpacing,
                        isActive && styles.itemActive,
                      ]}
                    >
                      <item.Icon
                        width={22}
                        height={22}
                        color={isActive ? "#141B34" : "#141B34"}
                      />
                      <Text
                        style={[styles.label, isActive && styles.labelActive]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </BlurView>

        <Pressable onPress={onPressPlus} style={styles.plusButton}>
          <LinearGradient
            colors={["#9EFF00", "#039274"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.plusGradient}
          />
          <Text style={styles.plusText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 15,
    right: 15,
    bottom: 0,
  },
  blur: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  navContainer: {
    position: "relative",
  },
  container: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    width: 75,
    // minWidth: 60,
    backgroundColor: "transparent",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 15,
  },
  itemActive: {
    backgroundColor: "#ffffff",
  },
  itemSpacing: {
    marginRight: 6,
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    color: "#141B34",
    letterSpacing: -0.05,
  },
  labelActive: {
    color: "#141B34",
  },
  plusButton: {
    position: "absolute",
    top: -18,
    left: "50%",
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  plusText: {
    fontSize: 28,
    color: "#ffffff",
    marginTop: -2,
  },
  plusGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
});
