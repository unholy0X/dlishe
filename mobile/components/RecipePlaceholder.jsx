import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

// Simplified D'lishe fork+leaf brand mark
function DlisheForkIcon({ size = 44, color = "#ffffff", opacity = 0.12 }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      opacity={opacity}
    >
      {/* Fork tines */}
      <Path
        d="M22 8v18c0 3.3 2.7 6 6 6h0v24a2 2 0 004 0V32h0c3.3 0 6-2.7 6-6V8"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M28 8v14M32 8v14M36 8v14"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Leaf accent */}
      <Path
        d="M40 14c4-4 10-5 14-3-1 5-5 9-10 10-2 .5-4-.5-4-.5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.3}
      />
      <Path
        d="M44 21c3-3 6.5-4.5 10-3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const GRADIENTS = [
  ["#E8845C", "#F2A65A"], // terracotta to amber
  ["#D4775D", "#E8A87C"], // clay to peach
  ["#C17A4E", "#D4A373"], // caramel to tan
  ["#8B6B4A", "#BF9B6F"], // espresso to latte
  ["#A8856A", "#CCAB8E"], // mocha to cream
  ["#B57A5F", "#D9A68E"], // copper to blush
  ["#7A8A5A", "#A3B580"], // sage to olive
  ["#6B7F6A", "#98B097"], // forest to fern
];

const ICON_SIZES = {
  small: 32,
  medium: 44,
  large: 64,
  hero: 100,
};

function hashTitle(title) {
  let hash = 0;
  const str = (title || "").toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return ((hash % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length;
}

export default function RecipePlaceholder({
  title,
  variant = "medium",
  style,
}) {
  const index = hashTitle(title);
  const colors = GRADIENTS[index];
  const iconSize = ICON_SIZES[variant] || ICON_SIZES.medium;

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <DlisheForkIcon size={iconSize} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
