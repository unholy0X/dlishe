import React from "react";
import Svg, { Path } from "react-native-svg";

export default function SpeakerIcon({ width = 20, height = 20, color = "#111111", muted = false }) {
  if (muted) {
    return (
      <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        {/* Speaker body */}
        <Path
          d="M11 5L6 9H2v6h4l5 4V5z"
          fill={color}
        />
        {/* X mark */}
        <Path
          d="M23 9l-6 6M17 9l6 6"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      {/* Speaker body */}
      <Path
        d="M11 5L6 9H2v6h4l5 4V5z"
        fill={color}
      />
      {/* Sound waves */}
      <Path
        d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
