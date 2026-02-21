import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

/** true when running on an iPad / Android tablet (≥768 pt wide) */
export const isTablet = width >= 768;

/**
 * Scale a pixel value by 30% on tablets, leave it unchanged on phones.
 * Works at module-level (inside StyleSheet.create) because isTablet is also
 * a module-level constant resolved at startup.
 */
export const sc = (n) => (isTablet ? Math.round(n * 1.7) : n);
