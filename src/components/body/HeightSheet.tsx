import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  DEFAULT_HEIGHT_CM,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
  clampHeightCm,
  cmToFtIn,
  fmtHeight,
  normalRangeKg,
  type HeightUnit,
} from '../../lib/body';
import { haptic } from '../../lib/haptics';
import { fmtWeight } from '../../lib/units';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { colors, roundedFont } from '../../theme';
import { MinusIcon, PlusIcon } from '../Icons';
import { Sheet } from '../Sheet';
import { Caption, HoldButton, PillButton } from '../ui';
import { StepperField } from './StepperField';

const INCH = 2.54;

/**
 * One-time (and any-time-after) height setup, in cm or ft/in. BMI recalculates the moment you save.
 * Height is held in cm internally; feet and inches step in whole inches.
 */
export function HeightSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, actions } = useBody();
  const { data: gym } = useGym();

  const [cm, setCm] = useState(DEFAULT_HEIGHT_CM);
  const [unit, setUnit] = useState<HeightUnit>('cm');
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCm(data.heightCm ?? DEFAULT_HEIGHT_CM);
      setUnit(data.heightUnit);
      setDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const { ft, inch } = cmToFtIn(cm);
  const range = normalRangeKg(cm);
  const valid = cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM;

  const stepCm = (dir: 1 | -1) => {
    haptic.tap();
    setDraft(null);
    setCm((c) => clampHeightCm(Math.round(c) + dir));
  };
  /** whole-inch steps, so 5′ 11″ + 1″ is 6′ 0″ */
  const stepInches = (n: number) => {
    haptic.tap();
    setCm((c) => clampHeightCm(Math.round(c / INCH + n) * INCH));
  };

  const onType = (t: string) => {
    const digits = t.replace(/[^0-9]/g, '').slice(0, 3);
    setDraft(digits);
    if (digits) setCm(Number(digits));
  };

  const save = () => {
    actions.setHeight(cm, unit);
    haptic.pulse();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Height">
      <View className="px-4 pb-2">
        <View className="mb-3 flex-row self-end rounded-full bg-fill p-1">
          {(['cm', 'ftin'] as HeightUnit[]).map((u) => (
            <Pressable
              key={u}
              accessibilityRole="button"
              accessibilityState={{ selected: unit === u }}
              onPress={() => {
                haptic.tap();
                setDraft(null);
                setUnit(u);
              }}
              className="h-9 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: unit === u ? colors.outline : 'transparent' }}
            >
              <Text className={`text-body font-semibold ${unit === u ? 'text-label' : 'text-muted'}`}>{u === 'cm' ? 'cm' : 'ft / in'}</Text>
            </Pressable>
          ))}
        </View>

        {unit === 'cm' ? (
          <View className="flex-row items-center justify-center gap-3 py-1">
            <HoldButton label="Decrease cm" onStep={() => stepCm(-1)}>
              <MinusIcon color={colors.label} />
            </HoldButton>
            <View className="flex-row items-baseline">
              <TextInput
                value={draft ?? String(Math.round(cm))}
                onChangeText={onType}
                onFocus={() => setDraft(String(Math.round(cm)))}
                onBlur={() => setDraft(null)}
                keyboardType="number-pad"
                selectTextOnFocus
                maxLength={3}
                selectionColor={colors.accent}
                accessibilityLabel="Height in centimetres"
                className="text-center text-label"
                style={{ width: 96, fontFamily: roundedFont, fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.5, padding: 0, outlineStyle: 'none' } as never}
              />
              <Text className="text-h2 text-muted">cm</Text>
            </View>
            <HoldButton label="Increase cm" onStep={() => stepCm(1)}>
              <PlusIcon color={colors.label} />
            </HoldButton>
          </View>
        ) : (
          <View className="flex-row py-1">
            <StepperField label="ft" value={String(ft)} onStep={(d) => stepInches(d * 12)} />
            <StepperField label="in" value={String(inch)} onStep={(d) => stepInches(d)} />
          </View>
        )}

        <View className="mt-4 rounded-2xl bg-fill/50 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-body text-muted">Height</Text>
            <Text className="text-body font-semibold tabular-nums text-label">{fmtHeight(cm, unit)}</Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-body text-muted">Normal BMI range</Text>
            <Text className="text-body font-semibold tabular-nums" style={{ color: colors.accent }}>
              {fmtWeight(range.min, gym.unit)}–{fmtWeight(range.max, gym.unit)} {gym.unit}
            </Text>
          </View>
        </View>
        <Caption className="mt-2">Valid range {MIN_HEIGHT_CM}–{MAX_HEIGHT_CM} cm.</Caption>

        <View className="mt-3">
          <PillButton variant="primary" label="Save height" disabled={!valid} onPress={save} />
        </View>
      </View>
    </Sheet>
  );
}
