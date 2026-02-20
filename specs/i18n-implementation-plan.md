# i18n Implementation Plan — French (FR) + Arabic (AR)
# Branch: feature/i18n-multilingual-support

**Author:** Staff Engineer
**Date:** 2026-02-19
**Effort:** 8–10 days
**Priority:** P1
**Scope:** Mobile (Expo RN) + Backend (Go)

---

## 0. Guiding Principles

1. **Never translate the database.** Recipes stay in their source language. Translation applies only to UI strings and new AI outputs.
2. **English is the source of truth.** `en.json` is the master file. FR and AR are derived.
3. **RTL is a layout concern, not just a language concern.** Arabic forces a full `I18nManager.forceRTL()` pass that requires an app restart — plan UX for that.
4. **No string literals in JSX after this branch.** Every user-visible string goes through `t()`. Zero exceptions.
5. **Keep namespaces small and domain-scoped.** Easier for translators and reviewers.

---

## 1. Architecture Decisions

### 1.1 Library Stack

| Concern | Package | Reason |
|---------|---------|--------|
| Translation framework | `i18next` + `react-i18next` | Industry standard, namespace support, pluralization, interpolation |
| Pluralization polyfill | `intl-pluralrules` | Required for Arabic (6 plural forms) and French (2 forms) on older JS engines |
| Locale detection | `expo-localization` | Already available in the project, reads device locale |
| Arabic font | `@expo-google-fonts/noto-sans-arabic` | Full Arabic Unicode coverage, 3 weights match Inter weights |

### 1.2 Language Selection Strategy

```
Priority order for language resolution:
  1. User explicit preference (stored in Zustand + SecureStore + backend DB)
  2. Device locale (via expo-localization)
  3. Fallback: English
```

Supported locales: `en`, `fr`, `ar`
Unsupported device locales → fallback to `en`.

### 1.3 RTL Strategy

- Arabic requires `I18nManager.forceRTL(true)` + **app restart**
- LTR ↔ RTL switching: show a modal "Restart required to apply Arabic layout" with Restart / Cancel
- `I18nManager.allowRTL(true)` set unconditionally at app entry point
- Replace all directional style values with `start`/`end` equivalents across the codebase

### 1.4 Font Strategy

```
Language     Font Family                  Weights
──────────   ─────────────────────────    ────────
en, fr       Inter (existing)             400, 500, 600
ar           Noto Sans Arabic (new)       400, 500, 600
```

A `useFont()` hook returns the correct `fontFamily` string based on the active locale. All `StyleSheet` definitions that use `fontFamily` will import from a shared `fonts.js` token file rather than hardcoding font strings.

---

## 2. Directory Structure

```
mobile/
├── i18n/
│   ├── index.js                  ← i18next config + init
│   ├── locales/
│   │   ├── en/
│   │   │   ├── common.json       ← shared: buttons, labels, units, time
│   │   │   ├── auth.json         ← login, signup, forgot password
│   │   │   ├── home.json         ← home screen
│   │   │   ├── recipe.json       ← recipe detail + add recipe + cooking
│   │   │   ├── pantry.json       ← pantry screen + categories
│   │   │   ├── shopping.json     ← shopping lists + list detail
│   │   │   ├── mealPlan.json     ← meal planner + day names + meal types
│   │   │   ├── paywall.json      ← subscription screen (Apple-required accuracy)
│   │   │   └── errors.json       ← all error/alert messages
│   │   ├── fr/                   ← same structure as en/
│   │   └── ar/                   ← same structure as en/
│   └── pluralRules.js            ← custom plural rule helpers
│
├── utils/
│   ├── fonts.js                  ← font token map by locale + weight (NEW)
│   └── rtl.js                    ← RTL helpers: isRTL, start/end style utils (NEW)
│
├── store/
│   └── languageStore.js          ← NEW: language preference Zustand store
│
├── hooks/
│   └── useLanguage.js            ← NEW: language switch + restart prompt hook
│
└── components/
    └── settings/
        └── LanguagePicker.jsx    ← NEW: language selector UI
```

---

## 3. Namespace Breakdown (~380 keys total)

### `common.json` (~60 keys)
Shared across all screens:
```json
{
  "buttons": {
    "cancel": "Cancel", "save": "Save", "delete": "Delete",
    "retry": "Try Again", "done": "Done", "back": "Back",
    "confirm": "Confirm", "notNow": "Not now", "ok": "OK"
  },
  "units": {
    "min": "min", "hour": "h", "minutes_short": "m", "seconds_short": "s",
    "servings_one": "{{count}} serving", "servings_other": "{{count}} servings"
  },
  "time": {
    "minOnly": "{{m}} min", "hourMin": "{{h}}h {{m}}m", "hourOnly": "{{h}}h"
  },
  "loading": "Loading...", "error": "Something went wrong",
  "connection": "Please check your connection and try again.",
  "noResults": "No results found"
}
```

### `auth.json` (~70 keys)
Login, signup, forgot password, verification.

### `home.json` (~55 keys)
Home screen, suggestion rows, stats cards, empty states, sheet titles.

### `recipe.json` (~80 keys)
Recipe detail, add recipe sheet, cooking mode, extraction flow.

### `pantry.json` (~50 keys)
Pantry screen, category names (12 categories), scan UI, empty state.

### `shopping.json` (~45 keys)
Shopping lists, list detail, merge, complete flow.

### `mealPlan.json` (~30 keys)
Meal planner, day names (7), meal types (4), week navigation.

### `paywall.json` (~30 keys)
All subscription copy — must be reviewed by a certified translator (Apple requirement).

### `errors.json` (~40 keys)
All `Alert.alert` titles/messages and toast messages from stores and screens.

---

## 4. New Files to Create

### `mobile/i18n/index.js`
```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import 'intl-pluralrules';

// Import all locale bundles (static require, no lazy loading — small app)
import en_common from './locales/en/common.json';
// ... all namespaces × 3 languages

const SUPPORTED = ['en', 'fr', 'ar'];

function detectLocale() {
  const device = Localization.locale?.split('-')[0]; // "fr-FR" → "fr"
  return SUPPORTED.includes(device) ? device : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    lng: detectLocale(),             // overridden by languageStore on mount
    fallbackLng: 'en',
    ns: ['common','auth','home','recipe','pantry','shopping','mealPlan','paywall','errors'],
    defaultNS: 'common',
    resources: { en: {...}, fr: {...}, ar: {...} },
    interpolation: { escapeValue: false },
  });

export default i18n;
```

### `mobile/store/languageStore.js`
```javascript
// Zustand store persisted to SecureStore
// State: { language: 'en' | 'fr' | 'ar' }
// Actions: setLanguage(lang) — persists + updates i18n.changeLanguage()
//          hydrate() — reads SecureStore on app start
// RTL: setLanguage('ar') sets needsRestart=true (RTL toggle)
//      setLanguage('en'/'fr') from 'ar' sets needsRestart=true (RTL untoggle)
```

### `mobile/utils/rtl.js`
```javascript
import { I18nManager } from 'react-native';

export const isRTL = () => I18nManager.isRTL;

// Converts directional style props to start/end equivalents
// usage: <View style={[styles.row, rtlRow()]} />
export const rtlRow = () => isRTL() ? { flexDirection: 'row-reverse' } : {};

// Convert marginLeft/Right to start/end
export const marginStart = (value) =>
  isRTL() ? { marginRight: value } : { marginLeft: value };
export const marginEnd = (value) =>
  isRTL() ? { marginLeft: value } : { marginRight: value };
```

### `mobile/utils/fonts.js`
```javascript
// Returns fontFamily string for active locale + weight
// Replaces all hardcoded "Inter_400Regular" references
export const FONTS = {
  en: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold' },
  fr: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold' },
  ar: { regular: 'NotoSansArabic_400Regular', medium: 'NotoSansArabic_500Medium', semibold: 'NotoSansArabic_600SemiBold' },
};

export function getFont(weight, locale) {
  return (FONTS[locale] ?? FONTS.en)[weight];
}
```

### `mobile/hooks/useLanguage.js`
```javascript
// Wraps language switching with RTL restart prompt
// Returns: { language, changeLanguage }
// changeLanguage('ar') from 'en':
//   → calls I18nManager.forceRTL(true)
//   → shows Alert: "Arabic requires a restart to apply the correct layout. Restart now?"
//   → on confirm: Updates.reloadAsync() (expo-updates) or RCTReloadCommand
```

### `mobile/components/settings/LanguagePicker.jsx`
Three-option selector: English / Français / العربية
Added to the Profile/Settings screen.

---

## 5. Files to Modify — Full List

### Phase 1: Infrastructure (no UI changes yet)

| File | Change |
|------|--------|
| `package.json` | Add `i18next`, `react-i18next`, `intl-pluralrules`, `@expo-google-fonts/noto-sans-arabic` |
| `app/_layout.jsx` | Init i18n, hydrate languageStore, load Arabic fonts, `I18nManager.allowRTL(true)` |

### Phase 2: String Extraction — Screens (one screen at a time, testable)

| File | Namespace(s) | Approx keys |
|------|-------------|-------------|
| `app/index.jsx` | `auth`, `errors` | 50 |
| `app/sign-up.jsx` | `auth`, `errors` | 48 |
| `app/home.jsx` | `home`, `errors` | 65 |
| `app/recipe/[id].jsx` | `recipe`, `errors` | 70 |
| `app/recipies.jsx` | `recipe`, `errors` | 45 |
| `app/pantry.jsx` | `pantry`, `errors` | 48 |
| `app/shopping.jsx` | `shopping`, `errors` | 48 |
| `app/shoppingList.jsx` | `shopping`, `errors` | 40 |
| `app/mealPlan.jsx` | `mealPlan`, `errors` | 35 |

### Phase 2: String Extraction — Components

| File | Namespace | Approx keys |
|------|-----------|-------------|
| `components/FloatingNav.jsx` | `common` | 4 |
| `components/home/StatsCardsRow.jsx` | `home` | 5 |
| `components/home/ProfileName.jsx` | `home` | 2 |
| `components/home/MealCategoryGrid.jsx` | `home` | 8 |
| `components/home/RecentRecipesHeader.jsx` | `home` | 3 |
| `components/home/SuggestionRow.jsx` | `home` | 6 |
| `components/home/MealPlanCard.jsx` | `mealPlan` | 4 |
| `components/mealPlan/DayPills.jsx` | `mealPlan` | 7 |
| `components/mealPlan/MealSlot.jsx` | `mealPlan` | 5 |
| `components/mealPlan/AddRecipeSheet.jsx` | `mealPlan` | 8 |
| `components/recipies/AddRecipeSheetContent.jsx` | `recipe` | 30 |
| `components/recipies/PrepChecklistSheet.jsx` | `recipe` | 12 |
| `components/recipies/StepTimerSheet.jsx` | `recipe` | 10 |
| `components/recipies/DoneSheet.jsx` | `recipe` | 6 |
| `components/DinnerInspirationSheet.jsx` | `home` | 8 |
| `components/SearchOverlay.jsx` | `common` | 10 |
| `components/paywall/PaywallSheet.jsx` | `paywall`, `errors` | 35 |
| `components/UserSync.jsx` | — | set demo name via t() |
| `components/ErrorBoundary.jsx` | `errors` | 8 |
| `store/extractStore.js` | `errors` | 10 |
| `store/recipeStore.js` | `errors` | 8 |
| `store/pantryStore.js` | `errors` | 8 |
| `store/shoppingStore.js` | `errors` | 10 |
| `store/subscriptionStore.js` | `errors` | 15 |
| `store/mealPlanStore.js` | `errors` | 8 |

> **Note on stores:** Stores are non-React. Use `i18n.t()` (the instance, not the hook) for error strings set inside store action functions.

### Phase 3: RTL Layout Fixes

Every component with directional styles needs an audit pass:

| File | RTL Change Required |
|------|-------------------|
| `components/FloatingNav.jsx` | `flexDirection: row` → auto-flips ✓; icon order check |
| `components/SearchBar.jsx` | `marginLeft: 8` → `marginStart: 8` |
| `components/home/ProfileName.jsx` | avatar + text row: `marginLeft` → `marginStart` |
| `components/home/StatsCardsRow.jsx` | row layout, text alignment |
| `app/home.jsx` | badge rows, action rows |
| `app/recipe/[id].jsx` | ingredient rows, step badge + text, all `marginLeft`/`Right` |
| `app/mealPlan.jsx` | week nav arrows (← → must flip), day pills |
| `components/mealPlan/DayPills.jsx` | horizontal scroll stays L→R (calendar convention, no flip) |
| `components/mealPlan/MealSlot.jsx` | recipe row layout |
| `app/recipies.jsx` | select mode toolbar |
| `app/pantry.jsx` | category rows, item rows |
| `app/shoppingList.jsx` | item rows, checked state |
| `app/shopping.jsx` | list cards |
| `components/paywall/PaywallSheet.jsx` | plan selector row, feature rows |
| `components/DinnerInspirationSheet.jsx` | badge row, action buttons row |
| `app/index.jsx` | form, OAuth buttons |
| `app/sign-up.jsx` | form layout |

**RTL rule:** Replace every `marginLeft`/`marginRight`/`paddingLeft`/`paddingRight` with `marginStart`/`marginEnd`/`paddingStart`/`paddingEnd` or a conditional via `rtl.js` utilities. Back/forward chevron icons need a `transform: [{ scaleX: isRTL ? -1 : 1 }]`.

### Phase 4: Backend Changes

| File | Change |
|------|--------|
| `migrations/000020_add_preferred_language.up.sql` | `ALTER TABLE users ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'en'` |
| `internal/model/user.go` | Add `PreferredLanguage string` field |
| `internal/handler/user.go` | Accept + persist `preferredLanguage` in PATCH /me |
| `internal/handler/recipes.go` (extraction) | Read user locale from context, pass to Gemini prompt |
| `internal/handler/shopping.go` (generate list) | Pass locale to Gemini prompt |
| `internal/handler/pantry.go` (scan) | Pass locale to Gemini prompt |
| `internal/ai/prompts.go` | Accept `locale string` param in all prompt builders |
| `services/user.js` (mobile) | Add `preferredLanguage` to PATCH /me call |

**Gemini prompt change (all affected prompts):**
```go
// Before
"Extract the recipe..."

// After
fmt.Sprintf("Extract the recipe... Respond in %s.", localeToLanguageName(userLocale))
// en → "English", fr → "French", ar → "Arabic"
```

---

## 6. Pluralization Reference

French: 2 forms (singular for 0 and 1, plural for 2+)
Arabic: 6 forms (zero, one, two, few [3–10], many [11–99], other [100+])

```json
// en/common.json
"recipes_one": "{{count}} recipe",
"recipes_other": "{{count}} recipes",

// fr/common.json
"recipes_one": "{{count}} recette",
"recipes_other": "{{count}} recettes",

// ar/common.json
"recipes_zero": "لا توجد وصفات",
"recipes_one": "وصفة واحدة",
"recipes_two": "وصفتان",
"recipes_few": "{{count}} وصفات",
"recipes_many": "{{count}} وصفة",
"recipes_other": "{{count}} وصفة"
```

i18next handles all plural resolution automatically when `intl-pluralrules` is loaded.

---

## 7. Day-by-Day Execution Plan

### Day 1 — Infrastructure Setup
- [ ] Install packages: `i18next`, `react-i18next`, `intl-pluralrules`, `@expo-google-fonts/noto-sans-arabic`
- [ ] Create `i18n/index.js` with init config
- [ ] Create `store/languageStore.js` with hydration + SecureStore persistence
- [ ] Create `utils/fonts.js` token map
- [ ] Create `utils/rtl.js` helpers
- [ ] Update `app/_layout.jsx`: load Arabic fonts, call `I18nManager.allowRTL(true)`, hydrate languageStore, wrap app with i18next provider
- [ ] Create `en/` locale stubs (empty JSON files, one per namespace)
- [ ] Verify: app boots, i18n initializes, no runtime errors

### Day 2 — Auth Screens + Common Namespace
- [ ] Fill `en/common.json` (buttons, units, time, loading states)
- [ ] Fill `en/auth.json` (login, signup, forgot password, verification)
- [ ] Fill `en/errors.json` skeleton
- [ ] Migrate `app/index.jsx` → all strings via `t('auth.*')`
- [ ] Migrate `app/sign-up.jsx` → all strings via `t('auth.*')`
- [ ] Verify screens render identically in EN

### Day 3 — Home Screen + Components
- [ ] Fill `en/home.json`
- [ ] Migrate `app/home.jsx`
- [ ] Migrate `components/home/*` (StatsCardsRow, ProfileName, MealCategoryGrid, RecentRecipesHeader, SuggestionRow, MealPlanCard)
- [ ] Migrate `components/DinnerInspirationSheet.jsx`
- [ ] Migrate `components/SearchOverlay.jsx`
- [ ] Verify home screen renders identically in EN

### Day 4 — Recipe Screens + Store Errors
- [ ] Fill `en/recipe.json`
- [ ] Migrate `app/recipe/[id].jsx`
- [ ] Migrate `app/recipies.jsx`
- [ ] Migrate `components/recipies/*` (AddRecipeSheetContent, PrepChecklist, StepTimer, Done)
- [ ] Migrate store error strings in `extractStore.js`, `recipeStore.js`
- [ ] Verify recipe flows in EN

### Day 5 — Pantry + Shopping + Meal Plan
- [ ] Fill `en/pantry.json`, `en/shopping.json`, `en/mealPlan.json`
- [ ] Migrate `app/pantry.jsx`, `app/shopping.jsx`, `app/shoppingList.jsx`, `app/mealPlan.jsx`
- [ ] Migrate `components/mealPlan/*`, `components/paywall/PaywallSheet.jsx`
- [ ] Migrate remaining store files
- [ ] Fill `en/paywall.json`
- [ ] Verify all screens in EN — this is the regression gate

### Day 6 — French Translation
- [ ] Translate all 9 `en/*.json` files → `fr/*.json`
  - Use professional translation or GPT-4 with human review
  - Paywall copy must be reviewed by a bilingual human (Apple requirement)
- [ ] Wire FR language in languageStore
- [ ] Test every screen in FR
- [ ] Fix pluralization issues (FR has 2 forms — simpler than AR)
- [ ] Create `components/settings/LanguagePicker.jsx` and add to profile screen
- [ ] Test language switching EN ↔ FR (no restart needed)

### Day 7 — Arabic Translation
- [ ] Translate all 9 `en/*.json` files → `ar/*.json`
  - Arabic requires a native speaker for review — especially paywall
  - All 6 plural forms for count strings
- [ ] Wire AR language + `NotoSansArabic` font activation
- [ ] Implement `useLanguage.js` restart prompt for RTL toggle
- [ ] Test Arabic text rendering on device (iOS Arabic locale)

### Day 8 — RTL Layout Pass
- [ ] Audit and fix all 17 files listed in Phase 3 RTL table
- [ ] Replace all `marginLeft`/`Right`/`paddingLeft`/`Right` with start/end equivalents
- [ ] Flip arrow icons (back chevron, next chevron) with `scaleX: -1`
- [ ] Verify `DayPills` stays LTR (calendar convention)
- [ ] Test floating nav in RTL
- [ ] Test modals/sheets in RTL

### Day 9 — Backend Locale Support + Integration
- [ ] Write migration `000020_add_preferred_language.up.sql`
- [ ] Update Go model + handler to accept `preferredLanguage`
- [ ] Update all Gemini prompt builders to accept + use locale
- [ ] Update mobile `services/user.js` to sync language preference
- [ ] Test: extract recipe in FR → AI returns French recipe title/steps
- [ ] Test: extract recipe in AR → AI returns Arabic recipe content

### Day 10 — QA + Edge Cases
- [ ] Full regression: every screen in EN, FR, AR
- [ ] RTL stress test: long Arabic text truncation, overflow
- [ ] Language switch mid-session: EN ↔ FR (no restart), EN → AR (restart prompt), AR → EN (restart prompt)
- [ ] Mixed content: English recipe, FR UI → no issues
- [ ] Paywall in all 3 languages — verify pricing accuracy
- [ ] Demo account: language persists across demo sessions
- [ ] Subscription terms accuracy review (FR + AR native speaker sign-off)
- [ ] Submit updated App Store metadata for FR + AR (separate task)

---

## 8. Key Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Arabic translation quality for paywall copy | High | Native speaker review mandatory — Apple rejects inaccurate subscription terms |
| RTL restart UX friction | Medium | Clear modal: "Arabic requires a one-time restart to flip the layout" with illustration |
| Arabic font increases bundle size | Low | Noto Sans Arabic ~500KB — acceptable. Fonts lazy-load after first render |
| i18next adds startup latency | Low | All locale files are static JSON bundled with app — no network load |
| Store error strings called outside React | Medium | Use `i18n.t()` instance (not hook) in store files — fully supported |
| `DayPills` calendar direction confusion in Arabic | Medium | Calendar ordering (Mon–Sun) stays LTR by convention — add explicit `direction: ltr` wrapper |
| AI outputs mixing languages | Medium | Pass locale explicitly in every AI prompt — don't rely on recipe language detection |

---

## 9. Definition of Done

- [ ] All ~380 string keys extracted from JSX into locale JSON files
- [ ] `en.json` is complete and matches current app behaviour exactly
- [ ] `fr.json` is complete and reviewed by a French speaker
- [ ] `ar.json` is complete and reviewed by an Arabic speaker
- [ ] Paywall copy in all 3 languages reviewed by a bilingual human
- [ ] RTL layout correct on every screen in Arabic (tested on device)
- [ ] Language switcher accessible from Profile screen
- [ ] Language preference persists across app restarts
- [ ] Language preference syncs to backend (affects AI outputs)
- [ ] Backend `preferred_language` migration deployed
- [ ] All Gemini prompts respond in user's language for new extractions
- [ ] No hardcoded string literals remain in JSX (grep check: `<Text>"`)
- [ ] Demo account respects language preference
- [ ] App Store metadata updated in FR + AR (App Store Connect)

---

## 10. What This Branch Does NOT Cover

- Translating existing recipes in the database (v2 feature — "AI translation button")
- Right-to-left number entry in Arabic (Arabic-Indic numerals vs Western Arabic)
- App Store listing copy localization (done in App Store Connect, not in code)
- Push notification localization (future)
- Language-specific onboarding flows

---

## Appendix: grep commands to verify zero leakage after migration

```bash
# Find any remaining hardcoded text in JSX (Text components)
grep -rn ">\s*[A-Z][a-z]" mobile/app/ --include="*.jsx"

# Find Alert.alert with hardcoded strings
grep -rn 'Alert\.alert\("' mobile/app/ --include="*.jsx"
grep -rn 'Alert\.alert\("' mobile/store/ --include="*.js"

# Find any remaining fontFamily hardcodes
grep -rn "Inter_" mobile/app/ --include="*.jsx"
grep -rn "Inter_" mobile/components/ --include="*.jsx"
```
