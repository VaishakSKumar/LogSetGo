const plugin = require('tailwindcss/plugin');

/** Barlow ships one family per weight: a native Text can't pick a weight from a single family. */
const REGULAR = 'Barlow_400Regular';
const MEDIUM = 'Barlow_500Medium';
const SEMIBOLD = 'Barlow_600SemiBold';
const BOLD = 'Barlow_700Bold';
const DISPLAY = 'BarlowCondensed_800ExtraBold';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  corePlugins: { fontWeight: false },
  theme: {
    extend: {
      colors: {
        base: '#000000',
        surface: '#111311',
        panel: '#141614',
        raised: '#1C1F1C',
        line: '#262926',
        fill: '#232623',
        label: '#FFFFFF',
        secondary: '#C7C7CC',
        muted: '#A1A1A6',
        accent: '#3DFF6E',
        warn: '#FFD60A',
        danger: '#FF5A4F',
        holiday: '#FFD60A',
      },
      spacing: { 18: '72px' },
    },
  },
  plugins: [
    // The type scale, here rather than in theme.fontSize so each step can also carry its font family.
    plugin(({ addUtilities }) => {
      addUtilities({
        '.text-display': { fontFamily: DISPLAY, fontSize: '36px', lineHeight: '42px' },
        '.text-h1': { fontFamily: DISPLAY, fontSize: '30px', lineHeight: '36px' },
        '.text-h2': { fontFamily: SEMIBOLD, fontSize: '17px', lineHeight: '22px' },
        '.text-dayname': { fontFamily: BOLD, fontSize: '15px', lineHeight: '20px' },
        '.text-num': { fontFamily: BOLD, fontSize: '19px', lineHeight: '24px' },
        '.text-body': { fontFamily: REGULAR, fontSize: '15px', lineHeight: '20px' },
        '.text-metric': { fontFamily: DISPLAY, fontSize: '30px', lineHeight: '34px' },
        '.text-meta': { fontFamily: REGULAR, fontSize: '13px', lineHeight: '18px' },
        '.text-caption': { fontFamily: REGULAR, fontSize: '12px', lineHeight: '16px' },
        // After the scale, so `text-h2 font-normal` takes this family.
        '.font-normal': { fontFamily: REGULAR },
        '.font-medium': { fontFamily: MEDIUM },
        '.font-semibold': { fontFamily: SEMIBOLD },
        '.font-bold': { fontFamily: BOLD },
      });
    }),
  ],
};
