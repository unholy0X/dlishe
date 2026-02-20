import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// EN
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enHome from './locales/en/home.json';
import enRecipe from './locales/en/recipe.json';
import enPantry from './locales/en/pantry.json';
import enShopping from './locales/en/shopping.json';
import enMealPlan from './locales/en/mealPlan.json';
import enPaywall from './locales/en/paywall.json';
import enErrors from './locales/en/errors.json';

// FR
import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import frHome from './locales/fr/home.json';
import frRecipe from './locales/fr/recipe.json';
import frPantry from './locales/fr/pantry.json';
import frShopping from './locales/fr/shopping.json';
import frMealPlan from './locales/fr/mealPlan.json';
import frPaywall from './locales/fr/paywall.json';
import frErrors from './locales/fr/errors.json';

// AR
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arHome from './locales/ar/home.json';
import arRecipe from './locales/ar/recipe.json';
import arPantry from './locales/ar/pantry.json';
import arShopping from './locales/ar/shopping.json';
import arMealPlan from './locales/ar/mealPlan.json';
import arPaywall from './locales/ar/paywall.json';
import arErrors from './locales/ar/errors.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    home: enHome,
    recipe: enRecipe,
    pantry: enPantry,
    shopping: enShopping,
    mealPlan: enMealPlan,
    paywall: enPaywall,
    errors: enErrors,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    home: frHome,
    recipe: frRecipe,
    pantry: frPantry,
    shopping: frShopping,
    mealPlan: frMealPlan,
    paywall: frPaywall,
    errors: frErrors,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    home: arHome,
    recipe: arRecipe,
    pantry: arPantry,
    shopping: arShopping,
    mealPlan: arMealPlan,
    paywall: arPaywall,
    errors: arErrors,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'home', 'recipe', 'pantry', 'shopping', 'mealPlan', 'paywall', 'errors'],
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
  react: {
    useSuspense: false,
  },
});

export default i18n;
