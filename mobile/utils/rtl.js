import { I18nManager, StyleSheet } from "react-native";

/**
 * Apply RTL layout direction at the system level.
 * NOTE: This requires an app reload to take effect.
 * Call during app startup (before first render) when switching to/from Arabic.
 */
export function applyRTL(isRTL) {
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }
}

/**
 * Returns whether the current app is running in RTL mode.
 */
export function isRTLActive() {
  return I18nManager.isRTL;
}

/**
 * Flips start/end and left/right style properties for RTL.
 * Use this when a component has hardcoded directional styles.
 *
 * Example:
 *   const styles = rtlStyle({ marginLeft: 8 }, isRTL);
 *   // → { marginRight: 8 } in RTL
 */
export function rtlStyle(style, isRTL) {
  if (!isRTL) return style;
  const flipped = {};
  for (const [key, value] of Object.entries(style)) {
    if (key.includes("Left")) {
      flipped[key.replace("Left", "Right")] = value;
    } else if (key.includes("Right")) {
      flipped[key.replace("Right", "Left")] = value;
    } else if (key.includes("Start")) {
      flipped[key.replace("Start", "End")] = value;
    } else if (key.includes("End")) {
      flipped[key.replace("End", "Start")] = value;
    } else {
      flipped[key] = value;
    }
  }
  return flipped;
}

/**
 * Convenience: returns `flex-end` for LTR and `flex-start` for RTL (or vice-versa).
 */
export function rtlAlign(isRTL, defaultAlign = "flex-start") {
  if (!isRTL) return defaultAlign;
  return defaultAlign === "flex-start" ? "flex-end" : "flex-start";
}

/**
 * Returns `row` or `row-reverse` based on RTL state.
 */
export function rtlRow(isRTL) {
  return isRTL ? "row-reverse" : "row";
}
