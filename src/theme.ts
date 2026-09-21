import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

/** Mirrors tailwind.config.js — needed where a class can't reach (animated styles, SVG). */
export const colors = {
  base: '#000000',
  surface: '#1C1C1E',
  line: '#2C2C2E',
  fill: '#2C2C2E',
  label: '#FFFFFF',
  muted: '#8E8E93',
  accent: '#30D158',
  /** final-10-seconds countdown */
  warn: '#FF9F0A',
  /** attendance: Absent / Holiday (Present uses accent) */
  danger: '#FF453A',
  holiday: '#FFD60A',
  /** grey "tap to accept" text */
  ghost: 'rgba(142,142,147,0.65)',
  outline: '#3A3A3C',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.08)',
  accentBorder: 'rgba(48,209,88,0.45)',
} as const;

/**
 * SF Pro Rounded for weights & reps. `ui-rounded` resolves to SF Rounded on iOS/Safari
 * and falls back to the system font anywhere it isn't available.
 */
export const roundedFont = Platform.select({
  ios: 'ui-rounded',
  web: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
  default: undefined,
});

/** Sheets and state changes: 250ms ease-out. */
export const motion = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
} as const;
