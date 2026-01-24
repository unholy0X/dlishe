/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Warm Stone - Primary Neutrals
        stone: {
          50: '#F7F3EE',
          100: '#EDE7DF',
          200: '#E3DDD3',
          300: '#D4CEC1',
          400: '#C4BBAB',
        },
        // Candlelight & Honey - Warm Accents
        honey: {
          50: '#FFF9F0',
          100: '#F5E6D3',
          200: '#E8D4B8',
          300: '#D4B896',
          400: '#C19A6B',
        },
        // Muted Sage & Olive - Natural Botanicals
        sage: {
          50: '#B8B5A8',
          100: '#9D9A88',
          200: '#7D7A68',
          300: '#5C5A4D',
        },
        // Text Hierarchy
        text: {
          primary: '#2B2822',
          secondary: '#4A4539',
          tertiary: '#6B6456',
          muted: '#8B8173',
          disabled: '#ADA396',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        accent: ['Crimson Text', 'Georgia', 'serif'],
      },
      fontSize: {
        'hero': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em' }],
        'h1': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        'h2': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        'h3': ['20px', { lineHeight: '28px' }],
        'body-lg': ['17px', { lineHeight: '26px' }],
        'body': ['15px', { lineHeight: '24px' }],
        'body-sm': ['13px', { lineHeight: '20px' }],
        'caption': ['11px', { lineHeight: '16px' }],
      },
      borderRadius: {
        'sm': '12px',
        'md': '16px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '28px',
        '3xl': '32px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(43, 40, 34, 0.04), 0 1px 2px rgba(43, 40, 34, 0.06)',
        'warm': '0 4px 12px rgba(43, 40, 34, 0.08), 0 2px 4px rgba(43, 40, 34, 0.06)',
        'glow': '0 8px 24px rgba(43, 40, 34, 0.10), 0 4px 8px rgba(43, 40, 34, 0.06)',
        'honey': '0 4px 16px rgba(193, 154, 107, 0.25), 0 2px 4px rgba(193, 154, 107, 0.15)',
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
    },
  },
  plugins: [],
};
