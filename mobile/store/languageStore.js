import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { getLocales } from "expo-localization";
import i18n from "../i18n";

const STORAGE_KEY = "dlishe_language";
const SUPPORTED = ["en", "fr", "ar"];

function detectDeviceLanguage() {
  try {
    const locale = getLocales()[0]?.languageCode ?? "en";
    return SUPPORTED.includes(locale) ? locale : "en";
  } catch {
    return "en";
  }
}

export const useLanguageStore = create((set, get) => ({
  language: "en",
  isRTL: false,

  // Call once on app start to restore language preference.
  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      const lang = stored && SUPPORTED.includes(stored) ? stored : detectDeviceLanguage();
      await i18n.changeLanguage(lang);
      set({ language: lang, isRTL: lang === "ar" });
    } catch {
      // Fall back to English
      await i18n.changeLanguage("en");
      set({ language: "en", isRTL: false });
    }
  },

  // Change language and persist the preference.
  setLanguage: async (lang) => {
    if (!SUPPORTED.includes(lang)) return;
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, lang);
    } catch {
      // Non-fatal
    }
    await i18n.changeLanguage(lang);

    const nextIsRTL = lang === "ar";
    const currentIsRTL = get().isRTL;
    set({ language: lang, isRTL: nextIsRTL });

    // RTL changes require a full app reload to re-render the layout tree.
    if (currentIsRTL !== nextIsRTL) {
      try {
        const Updates = require("expo-updates");
        await Updates.reloadAsync();
      } catch {
        const { DevSettings, I18nManager, Alert } = require("react-native");
        I18nManager.allowRTL(nextIsRTL);
        I18nManager.forceRTL(nextIsRTL);
        if (DevSettings?.reload) {
          // Development only (Expo Go / metro dev client)
          DevSettings.reload();
        } else {
          // Production build where expo-updates is unavailable or reloadAsync threw.
          // I18nManager.forceRTL has been set — the user just needs to restart once.
          Alert.alert(
            i18n.t("common:restartRequired", "Restart required"),
            i18n.t(
              "common:restartMessage",
              "Please close and reopen the app to apply the language change."
            )
          );
        }
      }
    }
  },

  getSupportedLanguages: () => SUPPORTED,
}));
