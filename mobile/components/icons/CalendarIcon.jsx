import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

export default function CalendarIcon({ width = 22, height = 22, color = "#385225" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" />
      <Path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </Svg>
  );
}
