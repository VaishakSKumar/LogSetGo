/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base: '#000000',
        surface: '#1C1C1E',
        line: '#2C2C2E',
        fill: '#2C2C2E',
        label: '#FFFFFF',
        muted: '#8E8E93',
        accent: '#30D158',
        warn: '#FFD60A',
        danger: '#FF453A',
        holiday: '#FFD60A',
      },
      // Strict type scale (SF Pro on iOS, system font elsewhere)
      fontSize: {
        display: ['34px', { lineHeight: '41px', letterSpacing: '-0.5px', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '34px', letterSpacing: '-0.5px', fontWeight: '700' }],
        h2: ['17px', { lineHeight: '22px', letterSpacing: '-0.2px', fontWeight: '600' }],
        num: ['20px', { lineHeight: '24px', fontWeight: '500' }],
        body: ['15px', { lineHeight: '20px', fontWeight: '400' }],
        /** session summary metrics (SF Pro Rounded, bold) */
        metric: ['22px', { lineHeight: '28px', fontWeight: '700' }],
        /** meta text and previous sets */
        meta: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      spacing: { 18: '72px' },
    },
  },
  plugins: [],
};
