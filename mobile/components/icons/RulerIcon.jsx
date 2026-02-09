import React from "react";
import Svg, { Path } from "react-native-svg";

export default function RulerIcon({ width = 24, height = 24, color = "#141B34" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 21.5L21.5 3.5L20.5 2.5L18 5L16.5 3.5L14 6L12.5 4.5L10 7L8.5 5.5L6 8L4.5 6.5L2.5 8.5L3.5 21.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M2.5 20.5L20.5 2.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M5 15L8 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9 11L12 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M13 7L16 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
