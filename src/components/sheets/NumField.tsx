import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { roundDisplay } from '../../lib/units';
import { colors, roundedFont } from '../../theme';
import { MinusIcon, PlusIcon } from '../Icons';
import { Caption, HoldButton } from '../ui';

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** size of one −/+ tap */
  step: number;
  min?: number;
  max?: number;
  /** unit shown after the number */
  suffix?: string;
  integer?: boolean;
}

/** Label, −/+ (hold to repeat) and a typeable value. The commit rounds like the rest of the app, so quarter plates survive. */
export function NumField({ label, value, onChange, step, min = 0, max = 9999, suffix, integer }: NumFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, integer ? Math.round(v) : roundDisplay(v)));

  const type = (t: string) => {
    const cleaned = t.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6);
    setDraft(cleaned);
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) onChange(clamp(n));
  };

  return (
    <View className="flex-1 items-center">
      <Caption className="mb-1 uppercase tracking-wider">{label}</Caption>
      <View className="flex-row items-center gap-2">
        <HoldButton label={`Decrease ${label}`} onStep={() => onChange(clamp(value - step))}>
          <MinusIcon size={16} color={colors.label} />
        </HoldButton>
        <View className="flex-row items-baseline">
          <TextInput
            value={draft ?? String(value)}
            onChangeText={type}
            onFocus={() => setDraft(String(value))}
            onBlur={() => setDraft(null)}
            keyboardType={integer ? 'number-pad' : 'decimal-pad'}
            selectTextOnFocus
            maxLength={6}
            selectionColor={colors.accent}
            accessibilityLabel={label}
            className="text-center text-label"
            style={{ width: 72, fontFamily: roundedFont, fontSize: 24, lineHeight: 30, fontWeight: '700', padding: 0, outlineStyle: 'none' } as never}
          />
          {suffix ? <Text className="text-caption text-muted">{suffix}</Text> : null}
        </View>
        <HoldButton label={`Increase ${label}`} onStep={() => onChange(clamp(value + step))}>
          <PlusIcon size={16} color={colors.label} />
        </HoldButton>
      </View>
    </View>
  );
}
