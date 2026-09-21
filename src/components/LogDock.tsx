import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../lib/haptics';
import { resolveSet } from '../lib/progress';
import { fmtWeight, fromDisplay, stepFor, toDisplay } from '../lib/units';
import { colors } from '../theme';
import type { Ghost, SetRow, Unit } from '../types';
import { MinusIcon, PlusIcon } from './Icons';
import { Num, PillButton, RoundButton } from './ui';

interface LogDockProps {
  activeRow: SetRow | undefined;
  activeIndex: number;
  ghost: Ghost | undefined;
  unit: Unit;
  onChange: (rowId: string, field: 'weight' | 'reps', value: number | null) => void;
  onLog: (rowId: string, weight: number, reps: number) => void;
  onAdd: () => void;
}

function Stepper({ label, text, ghosted, onMinus, onPlus }: { label: string; text: string; ghosted: boolean; onMinus: () => void; onPlus: () => void }) {
  return (
    <View className="flex-1 items-center">
      <Text className="mb-1 text-caption uppercase tracking-wider text-muted/60">{label}</Text>
      <View className="flex-row items-center gap-2">
        <RoundButton label={`Decrease ${label}`} onPress={onMinus}>
          <MinusIcon size={18} color={colors.label} />
        </RoundButton>
        <View className="min-w-[60px] items-center">
          <Num className={ghosted ? 'text-muted/60' : ''}>{text}</Num>
        </View>
        <RoundButton label={`Increase ${label}`} onPress={onPlus}>
          <PlusIcon size={18} color={colors.label} />
        </RoundButton>
      </View>
    </View>
  );
}

/** Thumb-zone dock: ± steppers for the active set, and the one big "Log set" button. */
export function LogDock({ activeRow, activeIndex, ghost, unit, onChange, onLog, onAdd }: LogDockProps) {
  const insets = useSafeAreaInsets();
  const resolved = activeRow && ghost ? resolveSet(activeRow, ghost) : null;

  const weightKg = activeRow ? (activeRow.weight ?? ghost?.weight ?? null) : null;
  const reps = activeRow ? (activeRow.reps ?? ghost?.reps ?? null) : null;

  const stepWeight = (dir: 1 | -1) => {
    if (!activeRow) return;
    haptic.tap();
    const current = weightKg == null ? 0 : toDisplay(weightKg, unit);
    const next = Math.max(0, Math.round((current + dir * stepFor(unit)) * 10) / 10);
    onChange(activeRow.id, 'weight', next === 0 ? null : fromDisplay(next, unit));
    // Stepping weight also commits the ghost reps so the set is loggable in one more tap.
    if (activeRow.reps == null && ghost?.reps != null) onChange(activeRow.id, 'reps', ghost.reps);
  };

  const stepReps = (dir: 1 | -1) => {
    if (!activeRow) return;
    haptic.tap();
    const next = Math.max(0, (reps ?? 0) + dir);
    onChange(activeRow.id, 'reps', next === 0 ? null : next);
    if (activeRow.weight == null && ghost?.weight != null) onChange(activeRow.id, 'weight', ghost.weight);
  };

  return (
    <View className="px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
      {activeRow ? (
        <>
          <View className="mb-3 flex-row">
            <Stepper
              label={unit}
              text={weightKg == null ? '–' : fmtWeight(weightKg, unit)}
              ghosted={activeRow.weight == null}
              onMinus={() => stepWeight(-1)}
              onPlus={() => stepWeight(1)}
            />
            <Stepper
              label="Reps"
              text={reps == null ? '–' : String(reps)}
              ghosted={activeRow.reps == null}
              onMinus={() => stepReps(-1)}
              onPlus={() => stepReps(1)}
            />
          </View>
          <PillButton
            variant="primary"
            label={`Log set ${activeIndex + 1}`}
            detail={resolved ? `${fmtWeight(resolved.weight, unit)} ${unit} × ${resolved.reps}` : undefined}
            disabled={!resolved}
            onPress={() => resolved && activeRow && onLog(activeRow.id, resolved.weight, resolved.reps)}
          />
        </>
      ) : (
        <PillButton variant="white" label="Add another set" icon={<PlusIcon size={18} color="#000" />} onPress={onAdd} />
      )}
    </View>
  );
}
