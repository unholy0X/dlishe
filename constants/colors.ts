// DishFlow Luxury Bohème Color Palette
// "Warmth, softness, and craftsmanship inspired by slow living"

export const colors = {
  // Primary Neutrals - Warm Stone & Linen
  stone: {
    50: '#F7F3EE',   // Lightest stone (main background)
    100: '#EDE7DF',  // Light stone (elevated surfaces)
    200: '#E3DDD3',  // Mid stone (borders, dividers)
    300: '#D4CEC1',  // Darker stone (subtle elements)
    400: '#C4BBAB',  // Stone shadow (muted text)
  },

  // Warm Accents - Candlelight & Honey
  honey: {
    50: '#FFF9F0',   // Soft glow highlight
    100: '#F5E6D3',  // Warm cream
    200: '#E8D4B8',  // Honey light
    300: '#D4B896',  // Amber
    400: '#C19A6B',  // Deep honey/bronze (primary CTA)
  },

  // Natural Botanicals - Muted Sage & Olive
  sage: {
    50: '#B8B5A8',   // Pale sage
    100: '#9D9A88',  // Muted olive
    200: '#7D7A68',  // Deep sage
    300: '#5C5A4D',  // Charcoal sage
  },

  // Text Hierarchy - Warm Browns
  text: {
    primary: '#2B2822',     // Warm near-black
    secondary: '#4A4539',   // Medium brown
    tertiary: '#6B6456',    // Light brown
    muted: '#8B8173',       // Muted brown
    disabled: '#ADA396',    // Very light brown
  },

  // Legacy compatibility (mapped to new palette)
  primary: '#C19A6B',        // honey-400
  primaryLight: '#FFF9F0',   // honey-50
  primaryMuted: '#D4B896',   // honey-300
  primaryDark: '#A8845A',    // darker honey

  secondary: '#7D7A68',      // sage-200
  secondaryLight: '#B8B5A8', // sage-50
  secondaryMuted: '#9D9A88', // sage-100

  accent: '#C19A6B',         // honey-400
  accentLight: '#FFF9F0',    // honey-50
  accentMuted: '#E8D4B8',    // honey-200

  warm: '#C19A6B',           // honey-400
  warmLight: '#F5E6D3',      // honey-100
  warmMuted: '#D4B896',      // honey-300

  // Backgrounds
  background: '#F7F3EE',     // stone-50
  surface: '#EDE7DF',        // stone-100
  surfaceElevated: '#E3DDD3', // stone-200

  // Text (legacy)
  textPrimary: '#2B2822',    // text.primary
  textSecondary: '#4A4539',  // text.secondary
  textTertiary: '#6B6456',   // text.tertiary
  textMuted: '#8B8173',      // text.muted
  textDisabled: '#ADA396',   // text.disabled

  // Borders
  border: '#E3DDD3',         // stone-200
  borderLight: '#EDE7DF',    // stone-100
  borderFocus: '#C19A6B',    // honey-400

  // Semantic
  success: '#7D7A68',        // sage-200
  successLight: '#B8B5A8',   // sage-50
  warning: '#D4B896',        // honey-300
  warningLight: '#FFF9F0',   // honey-50
  error: '#A8845A',          // muted error
  errorLight: '#F5E6D3',     // honey-100
  info: '#9D9A88',           // sage-100
  infoLight: '#B8B5A8',      // sage-50

  // Category colors (updated to bohème palette)
  categories: {
    produce: '#7D7A68',      // Sage
    meat_seafood: '#A8845A', // Deep honey
    dairy: '#EDE7DF',        // Light stone
    bakery: '#D4B896',       // Amber
    frozen: '#9D9A88',       // Muted olive
    pantry: '#C19A6B',       // Deep honey
    spices: '#C19A6B',       // Deep honey
    beverages: '#8B8173',    // Muted brown
    other: '#C4BBAB',        // Stone shadow
  },

  // Gradients
  gradients: {
    warmGlow: ['#FFF9F0', '#F5E6D3'],
    stone: ['#F7F3EE', '#EDE7DF'],
    warmOverlay: ['rgba(247, 243, 238, 0)', '#F7F3EE'],
  },
} as const;

export type CategoryKey = keyof typeof colors.categories;
