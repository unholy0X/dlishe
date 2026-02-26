import React from "react";
import Svg, { Path } from "react-native-svg";
import { useLanguageStore } from "../../store/languageStore";

export default function ChevronRightIcon({ width = 9, height = 8, color = "#555555" }) {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return (
    <Svg width={width} height={height} viewBox="0 0 9 8" fill="none" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
      <Path
        d="M4.49204 0.158563C4.69035 -0.0397462 5.00397 -0.0519878 5.21674 0.121535L5.25796 0.158563L8.50796 3.40855L8.54501 3.44982C8.7185 3.66259 8.70626 3.97621 8.50796 4.17452L5.25796 7.42452C5.04644 7.63604 4.70356 7.63604 4.49204 7.42452C4.28052 7.213 4.28052 6.87012 4.49204 6.65855L6.81736 4.33323H0.541667C0.242515 4.33323 0 4.09067 0 3.79156C0 3.4924 0.242515 3.24989 0.541667 3.24989H6.81736L4.49204 0.924518L4.45499 0.883259C4.2815 0.670503 4.29374 0.356878 4.49204 0.158563Z"
        fill={color}
      />
    </Svg>
  );
}
