import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDuration } from '../lib/duration';
import { haptic } from '../lib/haptics';
import { resolveSet } from '../lib/progress';
import { fmtWeight, fromDisplay, roundDisplay, toDisplay } from '../lib/units';
import { colors, fonts } from '../theme';
import type { Ghost, LoadKind, SetMode, SetRow, Unit } from '../types';
import { PlusIcon } from './Icons';
import { PillButton } from './ui';

/** One tap of the duration stepper. */
const DURATION_STEP_SECONDS = 5;

interface LogDockProps {
  activeRow: SetRow | undefined;
  activeIndex: number;
  ghost: Ghost | undefined;
  unit: Unit;
  /** size of one weight +/- tap, in the display unit */
  step: number;
  mode: SetMode;
  load?: LoadKind;
  onChange: (rowId: string, field: 'weight' | 'reps', value: number | null) => void;
  onLog: (rowId: string, weight: number, reps: number) => void;
  onAdd: () => void;
  /** Just the ± steppers for the active set: no Log button and no bottom safe-area padding (the drawer footer supplies both). */
  compact?: boolean;
}

function Stepper({ label, text, onMinus, onPlus }: { label: string; text: string; onMinus: () => void; onPlus: () => void }) {
  const sign = (char: string, name: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name} ${label}`} onPress={onPress} className="items-center justify-center active:opacity-60" style={{ width: 48, height: 52 }}>
      <Text style={{ color: '#fff', fontFamily: fonts.medium, fontSize: 26 }}>{char}</Text>
    </Pressable>
  );
  return (
    <View className="flex-1 flex-row items-center justify-between" style={{ height: 52, borderRadius: 12, backgroundColor: colors.fill }}>
      {sign('−', 'Decrease', onMinus)}
      <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 13 }}>{text}</Text>
      {sign('+', 'Increase', onPlus)}
    </View>
  );
}

/** Thumb-zone dock: ± steppers for the active set, and the one big "Log set" button. */
export function LogDock({ activeRow, activeIndex, ghost, unit, step, mode, load = 'kg', onChange, onLog, onAdd, compact = false }: LogDockProps) {
  const insets = useSafeAreaInsets();
  const resolved = activeRow && ghost ? resolveSet(activeRow, ghost) : null;

  const weightKg = activeRow ? (activeRow.weight ?? ghost?.weight ?? null) : null;
  const reps = activeRow ? (activeRow.reps ?? ghost?.reps ?? null) : null;

  const stepWeight = (dir: 1 | -1) => {
    if (!activeRow) return;
    haptic.tap();
    const current = weightKg == null ? 0 : toDisplay(weightKg, unit);
    const next = Math.max(0, roundDisplay(current + dir * step));
    onChange(activeRow.id, 'weight', fromDisplay(next, unit));
    // Stepping weight also commits the ghost reps so the set is loggable in one more tap.
    if (activeRow.reps == null && ghost?.reps != null) onChange(activeRow.id, 'reps', ghost.reps);
  };

  const stepReps = (dir: 1 | -1) => {
    if (!activeRow) return;
    haptic.tap();
    const by = mode === 'time' ? DURATION_STEP_SECONDS : 1;
    const next = Math.max(0, (reps ?? 0) + dir * by);
    onChange(activeRow.id, 'reps', next === 0 ? null : next);
    if (activeRow.weight == null && ghost?.weight != null) onChange(activeRow.id, 'weight', ghost.weight);
  };

  if (compact && !activeRow) return null;

  return (
    <View className={compact ? 'px-4 pt-2' : 'px-4 pt-3'} style={{ paddingBottom: compact ? 0 : Math.max(insets.bottom, 12) + 4 }}>
      {activeRow ? (
        <>
          <View className={compact ? 'flex-row' : 'mb-3 flex-row'} style={{ gap: 8 }}>
            {load === 'none' ? null : (
              <Stepper label={load === 'extra' ? `extra ${unit}` : unit} text={`${step} ${unit}`} onMinus={() => stepWeight(-1)} onPlus={() => stepWeight(1)} />
            )}
            <Stepper
              label={mode === 'time' ? 'time' : 'reps'}
              text={mode === 'time' ? `${DURATION_STEP_SECONDS} sec` : '1 rep'}
              onMinus={() => stepReps(-1)}
              onPlus={() => stepReps(1)}
            />
          </View>
          {compact ? null : (
            <PillButton
              variant="primary"
              label={`Log set ${activeIndex + 1}`}
              detail={resolved ? (mode === 'time' ? formatDuration(resolved.reps) : resolved.weight > 0 ? `${fmtWeight(resolved.weight, unit)} ${unit} × ${resolved.reps}` : `${resolved.reps} reps`) : undefined}
              disabled={!resolved}
              onPress={() => resolved && activeRow && onLog(activeRow.id, resolved.weight, resolved.reps)}
            />
          )}
        </>
      ) : (
        <PillButton variant="white" label="Add another set" icon={<PlusIcon size={18} color="#000" />} onPress={onAdd} />
      )}
    </View>
  );
}
