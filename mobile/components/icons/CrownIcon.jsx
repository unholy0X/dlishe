import React from "react";
import Svg, { Path } from "react-native-svg";

export default function CrownIcon({ width = 24, height = 24, color = "#141B34" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 18L4.5 7L9 12L12 4L15 12L19.5 7L21 18H3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M3 18H21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
