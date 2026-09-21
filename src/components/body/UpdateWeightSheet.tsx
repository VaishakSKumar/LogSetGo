import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { DEFAULT_KG, MAX_KG, MIN_KG, bmiOf, categoryMeta, categoryOf, deltaTone, isValidKg } from '../../lib/body';
import { shortDate } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { fmtDelta, fmtWeight, fromDisplay, toDisplay } from '../../lib/units';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { colors, roundedFont } from '../../theme';
import type { Unit } from '../../types';
import { Sheet } from '../Sheet';
import { Caption, HoldButton, PillButton } from '../ui';
import { toneColor } from './HeroCard';

const clampKg = (kg: number) => Math.min(MAX_KG, Math.max(MIN_KG, kg));

/** ± button that shows its step ("−1", "+0.1") instead of an icon. */
function StepButton({ label, delta, onStep }: { label: string; delta: number; onStep: (delta: number) => void }) {
  return (
    <HoldButton label={`${delta > 0 ? 'Increase' : 'Decrease'} by ${Math.abs(delta)}`} onStep={() => onStep(delta)}>
      <Text className="text-body font-semibold tabular-nums text-label">{label}</Text>
    </HoldButton>
  );
}

/**
 * Log a new weight: type it on the keypad or nudge with steppers. Shows the change vs your last entry
 * and the resulting BMI before you save. The timestamp is recorded on save.
 */
export function UpdateWeightSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { latest, data, actions } = useBody();
  const { data: gym, actions: gymActions } = useGym();
  const unit = gym.unit;

  const [kg, setKg] = useState(DEFAULT_KG);
  /** what's in the text box while typing; null shows the formatted value */
  const [draft, setDraft] = useState<string | null>(null);

  // Start from your latest weight every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setKg(latest?.kg ?? DEFAULT_KG);
      setDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const shown = draft ?? fmtWeight(kg, unit);
  const valid = isValidKg(kg);
  const delta = latest ? kg - latest.kg : null;
  const unchanged = latest ? Math.abs(toDisplay(kg, unit) - toDisplay(latest.kg, unit)) < 0.05 : false;
  const bmi = data.heightCm ? bmiOf(kg, data.heightCm) : null;
  const meta = bmi == null ? null : categoryMeta(categoryOf(bmi));

  // Functional updates: hold-to-repeat calls this many times from one render.
  const step = (deltaDisplay: number) => {
    haptic.tap();
    setDraft(null);
    setKg((k) => {
      // Step in the display unit and round to 0.1 so the number on screen never drifts (e.g. 72.30000001).
      const next = Math.round((toDisplay(k, unit) + deltaDisplay) * 10) / 10;
      return clampKg(fromDisplay(next, unit));
    });
  };

  const onType = (t: string) => {
    const cleaned = t.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6);
    setDraft(cleaned);
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) setKg(fromDisplay(n, unit));
  };

  const switchUnit = (u: Unit) => {
    haptic.tap();
    setDraft(null);
    gymActions.setUnit(u);
  };

  const save = () => {
    if (!actions.addWeight(kg)) return haptic.warn();
    haptic.pulse();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Update weight">
      <View className="px-4 pb-2">
        {/* unit */}
        <View className="mb-2 flex-row self-end rounded-full bg-fill p-1">
          {(['kg', 'lb'] as Unit[]).map((u) => (
            <Pressable
              key={u}
              accessibilityRole="button"
              accessibilityState={{ selected: unit === u }}
              onPress={() => switchUnit(u)}
              className="h-9 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: unit === u ? colors.outline : 'transparent' }}
            >
              <Text className={`text-body font-semibold ${unit === u ? 'text-label' : 'text-muted'}`}>{u}</Text>
            </Pressable>
          ))}
        </View>

        {/* value: tap to type */}
        <View className="items-center py-2">
          <View className="flex-row items-baseline justify-center">
            <TextInput
              value={shown}
              onChangeText={onType}
              onFocus={() => setDraft(shown)}
              onBlur={() => setDraft(null)}
              keyboardType="decimal-pad"
              selectTextOnFocus
              maxLength={6}
              returnKeyType="done"
              selectionColor={colors.accent}
              accessibilityLabel={`Weight in ${unit}`}
              className="text-center text-label"
              style={[
                { width: 124, fontFamily: roundedFont, fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.5, padding: 0, outlineStyle: 'none' } as never,
              ]}
            />
            <Text className="ml-1 text-h2 text-muted">{unit}</Text>
          </View>
          <Caption>Tap the number to type, or use the steppers</Caption>
        </View>

        {/* steppers */}
        <View className="mt-2 flex-row items-center justify-between px-2">
          <View className="flex-row gap-2">
            <StepButton label="−1" delta={-1} onStep={step} />
            <StepButton label="−0.1" delta={-0.1} onStep={step} />
          </View>
          <View className="flex-row gap-2">
            <StepButton label="+0.1" delta={0.1} onStep={step} />
            <StepButton label="+1" delta={1} onStep={step} />
          </View>
        </View>

        {/* live preview */}
        <View className="mt-4 rounded-2xl bg-fill/50 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-body text-muted">{latest ? `Change since ${shortDate(latest.date)}` : 'First entry'}</Text>
            <Text
              className="text-body font-semibold tabular-nums"
              style={{ color: delta == null || unchanged ? colors.muted : toneColor(deltaTone(latest!.kg, kg, data.heightCm)) }}
            >
              {delta == null ? '—' : unchanged ? 'No change' : `${fmtDelta(delta, unit)} ${unit}`}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-body text-muted">BMI</Text>
            <Text className="text-body font-semibold tabular-nums" style={{ color: meta ? meta.color : colors.muted }}>
              {bmi == null ? 'Set your height to see it' : `${bmi.toFixed(1)} · ${meta!.label}`}
            </Text>
          </View>
        </View>

        <View className="mt-4">
          <PillButton
            variant="primary"
            label={!valid ? `Enter ${fmtWeight(MIN_KG, unit)}–${fmtWeight(MAX_KG, unit)} ${unit}` : unchanged ? 'No change to save' : 'Save weight'}
            disabled={!valid || unchanged}
            onPress={save}
          />
        </View>
      </View>
    </Sheet>
  );
}
