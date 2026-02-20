import React from "react";
import { I18nManager } from "react-native";
import Svg, { Path } from "react-native-svg";

export default function ArrowLeftIcon({ width = 10, height = 10, color = "#555555" }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 9 8" fill="none" style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}>
      <Path
        d="M4.50796 0.158563C4.30965 -0.0397462 3.99603 -0.0519878 3.78326 0.121535L3.74204 0.158563L0.49204 3.40855L0.45499 3.44982C0.2815 3.66259 0.29374 3.97621 0.49204 4.17452L3.74204 7.42452C3.95356 7.63604 4.29644 7.63604 4.50796 7.42452C4.71948 7.213 4.71948 6.87012 4.50796 6.65855L2.18264 4.33323H8.45833C8.75749 4.33323 9 4.09067 9 3.79156C9 3.4924 8.75749 3.24989 8.45833 3.24989H2.18264L4.50796 0.924518L4.54501 0.883259C4.7185 0.670503 4.70626 0.356878 4.50796 0.158563Z"
        fill={color}
      />
    </Svg>
  );
}
