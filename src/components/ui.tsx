import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { roundedFont } from '../theme';

/* ── Surfaces ── */

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View className={`rounded-3xl border border-line bg-surface p-3 ${className}`} style={style}>
      {children}
    </View>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View className="mb-2 flex-row items-center justify-between px-1">
      <Text className="text-h2 text-label">{title}</Text>
      {right}
    </View>
  );
}

/* ── Text ── */

/** Weights, reps and other figures: SF Rounded, medium, tabular. */
export function Num({
  children,
  className = '',
  size = 'text-num',
}: {
  children: ReactNode;
  className?: string;
  size?: string;
}) {
  return (
    <Text className={`${size} tabular-nums text-label ${className}`} style={{ fontFamily: roundedFont }}>
      {children}
    </Text>
  );
}

export const Caption = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <Text className={`text-caption text-muted/60 ${className}`}>{children}</Text>
);

/* ── Buttons ── */

type Variant = 'primary' | 'white' | 'secondary' | 'danger';

const VARIANT: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: 'bg-accent', text: 'text-black' },
  white: { bg: 'bg-label', text: 'text-black' },
  secondary: { bg: 'bg-fill', text: 'text-label' },
  danger: { bg: 'bg-danger', text: 'text-white' },
};

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: ReactNode;
  /** sub-label shown after the title, e.g. "80 kg × 8" */
  detail?: string;
  className?: string;
  compact?: boolean;
}

/** 48pt tall, fully rounded. `compact` is 44pt for inline secondary actions. */
export function PillButton({ label, onPress, variant = 'secondary', disabled, icon, detail, className = '', compact }: PillButtonProps) {
  const v = VARIANT[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      className={`flex-row items-center justify-center gap-2 rounded-full active:opacity-70 ${
        compact ? 'h-11 px-4' : 'h-12 px-5'
      } ${disabled ? 'bg-fill' : v.bg} ${className}`}
    >
      {icon}
      <Text className={`text-h2 ${disabled ? 'text-muted/60' : v.text}`}>{label}</Text>
      {detail ? (
        <Text className={`text-body tabular-nums ${disabled ? 'text-muted/40' : variant === 'secondary' ? 'text-muted' : 'text-black/60'}`}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** 44×44 round icon button (stepper ±, close). */
export function RoundButton({
  children,
  onPress,
  label,
  className = '',
}: {
  children: ReactNode;
  onPress: () => void;
  label: string;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full bg-fill active:opacity-60 ${className}`}
    >
      {children}
    </Pressable>
  );
}

/**
 * −/+ button that steps once on press and keeps stepping while held.
 * `onStep` should use functional state updates, since it is called repeatedly from one render.
 */
export function HoldButton({
  children,
  onStep,
  label,
}: {
  children: ReactNode;
  onStep: () => void;
  label: string;
}) {
  const latest = useRef(onStep);
  latest.current = onStep;
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (delay.current) clearTimeout(delay.current);
    if (repeat.current) clearInterval(repeat.current);
    delay.current = repeat.current = null;
  };
  useEffect(() => stop, []);

  const begin = () => {
    stop();
    latest.current();
    delay.current = setTimeout(() => {
      repeat.current = setInterval(() => latest.current(), 110);
    }, 380);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => latest.current()}
      onPressIn={begin}
      onPressOut={stop}
      className="h-11 w-11 items-center justify-center rounded-full bg-fill active:opacity-60"
    >
      {children}
    </Pressable>
  );
}
