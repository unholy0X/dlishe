import React from "react";
import Svg, { Path } from "react-native-svg";

export default function CheckIcon({ width = 12, height = 12, color = "#2a5a2a" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.293 5.293a1 1 0 0 1 1.414 1.414l-12 12a1 1 0 0 1-1.414 0l-6-6a1 1 0 0 1 1.414-1.414L9 16.586 20.293 5.293Z"
        fill={color}
      />
    </Svg>
  );
}
