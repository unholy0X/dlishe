import { useFonts as useNotoSansArabic } from "@expo-google-fonts/noto-sans-arabic";

/**
 * Loads Arabic font families needed for RTL support.
 * Call once in _layout.jsx and check `arabicFontsLoaded` before rendering.
 */
export function useArabicFonts() {
  const [loaded, error] = useNotoSansArabic({
    NotoSansArabic_400Regular: require("@expo-google-fonts/noto-sans-arabic/400Regular/NotoSansArabic_400Regular.ttf"),
    NotoSansArabic_500Medium: require("@expo-google-fonts/noto-sans-arabic/500Medium/NotoSansArabic_500Medium.ttf"),
    NotoSansArabic_600SemiBold: require("@expo-google-fonts/noto-sans-arabic/600SemiBold/NotoSansArabic_600SemiBold.ttf"),
    NotoSansArabic_700Bold: require("@expo-google-fonts/noto-sans-arabic/700Bold/NotoSansArabic_700Bold.ttf"),
  });
  return { arabicFontsLoaded: loaded, arabicFontsError: error };
}

/**
 * Returns the correct font family for a given weight based on active language.
 * Falls back to Inter for non-Arabic languages.
 */
export function getFontFamily(language, weight = "regular") {
  if (language === "ar") {
    const map = {
      regular: "NotoSansArabic_400Regular",
      medium: "NotoSansArabic_500Medium",
      semibold: "NotoSansArabic_600SemiBold",
      bold: "NotoSansArabic_700Bold",
    };
    return map[weight] ?? "NotoSansArabic_400Regular";
  }
  // Inter is loaded globally for EN/FR
  const map = {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  };
  return map[weight] ?? "Inter_400Regular";
}
