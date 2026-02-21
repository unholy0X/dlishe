import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { sc, isTablet } from "../utils/deviceScale";

import HomeIcon from "./icons/HomeIcon";
import RecipiesIcon from "./icons/RecipiesIcon";
import PantryIcon from "./icons/PantryIcon";
import ShoppingIcon from "./icons/ShoppingIcon";
import PlusIcon from "./icons/PlusIcon";

const NAV_ITEMS = [
  { key: "home", Icon: HomeIcon },
  { key: "recipies", Icon: RecipiesIcon },
  { key: "pantry", Icon: PantryIcon },
  { key: "shopping", Icon: ShoppingIcon },
];

export default function FloatingNav({ onPressItem, onPressPlus, activeKey }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("common");
  const plusScale = useRef(new Animated.Value(1)).current;

  const handlePlusPressIn = () => {
    Animated.spring(plusScale, {
      toValue: 0.88,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  };

  const handlePlusPressOut = () => {
    Animated.spring(plusScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 200,
    }).start();
  };

  const renderNavItem = (item) => {
    const isActive = item.key === activeKey;
    return (
      <Pressable
        key={item.key}
        onPress={() => onPressItem?.(item.key)}
        style={styles.item}
      >
        {isActive && (
          <View style={styles.activePill}>
            <LinearGradient
              colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.65)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Active pill specular */}
            <LinearGradient
              colors={["rgba(255,255,255,0.5)", "transparent"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
              style={styles.activePillSpecular}
              pointerEvents="none"
            />
          </View>
        )}
        <item.Icon
          width={sc(22)}
          height={sc(22)}
          color={isActive ? "#111111" : "rgba(20,27,52,0.4)"}
        />
        <Text
          style={[styles.label, isActive && styles.labelActive]}
          numberOfLines={1}
        >
          {t(`nav.${item.key}`)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.navContainer}>
        {/* Ambient shadow — soft wide glow behind bar */}
        <View style={styles.ambientShadow} />

        {/* Glass bar */}
        <View style={styles.glassOuter}>
          <BlurView intensity={80} tint="light" style={styles.blur}>
            {/* Glass base tint */}
            <View style={styles.glassTint} pointerEvents="none" />

            {/* Specular highlight — liquid glass crescent */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.6)",
                "rgba(255,255,255,0.2)",
                "rgba(255,255,255,0.02)",
                "transparent",
              ]}
              locations={[0, 0.25, 0.45, 0.65]}
              style={styles.specular}
              pointerEvents="none"
            />

            {/* Rim light — edge refraction glow */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.2)",
                "transparent",
                "transparent",
                "rgba(255,255,255,0.2)",
              ]}
              locations={[0, 0.15, 0.85, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Subtle bottom reflection */}
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.1)"]}
              start={{ x: 0.5, y: 0.7 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Nav content */}
            <View style={styles.container}>
              <View style={styles.row}>
                <View style={styles.group}>
                  {NAV_ITEMS.slice(0, 2).map(renderNavItem)}
                </View>
                <View style={styles.group}>
                  {NAV_ITEMS.slice(2).map(renderNavItem)}
                </View>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Floating Plus — liquid glass orb */}
        <Animated.View
          style={[
            styles.plusOuter,
            { transform: [{ scale: plusScale }] },
          ]}
        >
          <Pressable
            onPress={onPressPlus}
            onPressIn={handlePlusPressIn}
            onPressOut={handlePlusPressOut}
            style={styles.plusButton}
          >
            <LinearGradient
              colors={["#9EFF00", "#06B27A", "#039274"]}
              locations={[0, 0.6, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.plusGradient}
            />
            {/* Glass specular crescent */}
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.45)",
                "rgba(255,255,255,0.1)",
                "transparent",
              ]}
              locations={[0, 0.35, 0.6]}
              style={styles.plusSpecular}
              pointerEvents="none"
            />
            <PlusIcon width={sc(24)} height={sc(24)} color="#ffffff" />
          </Pressable>
        </Animated.View>
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
    alignItems: "center",
  },
  navContainer: {
    position: "relative",
    width: "100%",
    maxWidth: isTablet ? 580 : 420,
  },
  // Ambient shadow — soft, wide depth glow
  ambientShadow: {
    position: "absolute",
    top: 4,
    left: 8,
    right: 8,
    bottom: -4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.01)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  // Glass outer shell — contact shadow
  glassOuter: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  blur: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.65)",
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248, 250, 255, 0.3)",
  },
  specular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "60%",
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  // Nav content
  container: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    width: isTablet ? 115 : 75,
    borderRadius: 999,
    paddingVertical: sc(6),
    paddingHorizontal: isTablet ? 6 : 15,
    position: "relative",
  },
  // Active pill — glass within glass
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  activePillSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  label: {
    marginTop: 2,
    fontSize: sc(11),
    color: "rgba(20,27,52,0.4)",
    letterSpacing: -0.05,
  },
  labelActive: {
    color: "#111111",
    fontWeight: "600",
  },
  // Plus button — floating liquid glass orb
  plusOuter: {
    position: "absolute",
    top: -sc(20),
    left: "50%",
    marginLeft: -sc(28),
    width: sc(56),
    height: sc(56),
    // Colored glow shadow
    shadowColor: "#06B27A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 14,
  },
  plusButton: {
    width: sc(56),
    height: sc(56),
    borderRadius: sc(28),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  plusGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: sc(28),
  },
  plusSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    borderTopLeftRadius: sc(28),
    borderTopRightRadius: sc(28),
  },
});
