import React from "react";
import Svg, { Circle } from "react-native-svg";

export default function DotsVerticalIcon({ width = 6, height = 20, color = "#b0b0b0" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 6 20" fill="none">
      <Circle cx="2" cy="2" r="2" fill={color} />
      <Circle cx="2" cy="9" r="2" fill={color} />
      <Circle cx="2" cy="16" r="2" fill={color} />
    </Svg>
  );
}
