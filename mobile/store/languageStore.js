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
    set({ language: lang, isRTL: lang === "ar" });
  },

  getSupportedLanguages: () => SUPPORTED,
}));
