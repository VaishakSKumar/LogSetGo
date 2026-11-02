import { Easing } from 'react-native-reanimated';

/** Mirrors tailwind.config.js — needed where a class can't reach (animated styles, SVG). */
export const colors = {
  base: '#000000',
  surface: '#111311',
  /** sheets and floating panels */
  panel: '#141614',
  raised: '#1C1F1C',
  line: '#262926',
  fill: '#232623',
  /** buttons on a sheet */
  control: '#2A2D2A',
  /** the check-in pill */
  chip: '#1E211E',
  border: '#2C2F2C',
  navLine: '#1F221F',
  label: '#FFFFFF',
  secondary: '#C7C7CC',
  muted: '#A1A1A6',
  faint: '#8E8E93',
  accent: '#3DFF6E',
  /** accent mixed 52% into black: the raised lip under the big buttons */
  accentLip: '#208539',
  /** accent mixed 8% into surface */
  accentPanel: '#152618',
  /** banana yellow: a new PR on the week-by-week graph */
  pr: '#FFE135',
  /** timer warning (final 10 seconds) */
  warn: '#FFD60A',
  /** attendance: Absent / Holiday (Present uses accent) */
  danger: '#FF5A4F',
  dangerPanel: '#291A17',
  dangerText: '#FF8A7F',
  holiday: '#FFD60A',
  holidayPanel: '#292710',
  /** grey "tap to accept" text */
  ghost: 'rgba(161,161,166,0.65)',
  outline: '#3A3D3A',
  handle: '#4A4D4A',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.08)',
  accentBorder: 'rgba(61,255,110,0.45)',
} as const;

/** Colour for a weight change: green toward a healthy BMI, red away from it. */
export const toneColor = (t: 'toward' | 'away' | 'neutral') => (t === 'toward' ? colors.accent : t === 'away' ? colors.danger : colors.muted);

/** Each weight is its own family. Loaded in App.tsx. */
export const fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  condensed: 'BarlowCondensed_600SemiBold',
  display: 'BarlowCondensed_800ExtraBold',
} as const;

/** Weights, reps and other figures. */
export const roundedFont = fonts.bold;

/** Sheets and state changes: 250ms ease-out. */
export const motion = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
} as const;
