import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { formatDuration, parseDurationInput } from '../lib/duration';
import { haptic } from '../lib/haptics';
import { resolveSet } from '../lib/progress';
import { fmtDelta, fmtWeight, fromDisplay, roundDisplay, toDisplay } from '../lib/units';
import { colors, motion, roundedFont } from '../theme';
import type { Ghost, SetMode, SetPerf, SetRow as SetRowData, Unit } from '../types';
import { CheckIcon } from './Icons';

/* ─────────────── Column widths shared with the table header ─────────────── */

export const COL = {
  set: 'w-7',
  previous: 'w-20',
  reps: 'w-[68px]',
  check: 'w-11',
} as const;


/* ─────────────── Numeric cell ─────────────── */

/** How a NumberCell reads and writes its stored number. */
type CellKind = 'weight' | 'count' | 'duration';

const CELL: Record<CellKind, { format: (n: number) => string; parse: (text: string) => number | null; keyboard: 'decimal-pad' | 'number-pad' }> = {
  weight: {
    format: (n) => String(n),
    parse: (t) => {
      const n = parseFloat(t.replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? roundDisplay(n) : null;
    },
    keyboard: 'decimal-pad',
  },
  count: {
    format: (n) => String(n),
    parse: (t) => {
      const n = parseFloat(t.replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    },
    keyboard: 'number-pad',
  },
  duration: {
    format: formatDuration,
    // Typing raw seconds ("70") or MM:SS ("1:10") both work — parseDurationInput handles either.
    parse: parseDurationInput,
    keyboard: 'number-pad',
  },
};

interface NumberCellProps {
  value: number | null;
  ghost: number | null;
  locked: boolean;
  kind: CellKind;
  label: string;
  onCommit: (value: number | null) => void;
}

/**
 * Right-aligned numeric field (weight, rep count, or MM:SS duration — `kind` picks how it formats
 * and parses; the stored value is always a plain number, seconds for a duration).
 *  · empty + grey ghost  → one tap accepts the ghost
 *  · filled              → tap to type
 *  · locked (set logged) → read-only
 */
function NumberCell({ value, ghost, locked, kind, label, onCommit }: NumberCellProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const { format, parse, keyboard } = CELL[kind];

  const isGhost = value == null && ghost != null;
  const shown = value ?? ghost;

  const begin = () => {
    if (locked) return;
    if (isGhost) {
      haptic.tap();
      onCommit(ghost);
      return;
    }
    setText(value == null ? '' : kind === 'duration' ? format(value) : String(value));
    setEditing(true);
  };

  const finish = () => {
    setEditing(false);
    onCommit(parse(text));
  };

  if (editing) {
    return (
      <TextInput
        autoFocus
        selectTextOnFocus
        value={text}
        onChangeText={setText}
        onBlur={finish}
        onSubmitEditing={finish}
        keyboardType={kind === 'duration' ? 'numbers-and-punctuation' : keyboard}
        returnKeyType="done"
        maxLength={kind === 'duration' ? 5 : 6}
        accessibilityLabel={label}
        placeholderTextColor={colors.ghost}
        placeholder={shown != null ? (kind === 'duration' ? format(shown) : String(shown)) : kind === 'duration' ? '0:00' : '0'}
        className="h-11 rounded-xl border border-white/25 bg-fill px-2 text-right text-num tabular-nums text-label"
        style={{ fontFamily: roundedFont, outlineStyle: 'none' } as never}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${shown == null ? 'empty' : kind === 'duration' ? format(shown) : shown}${isGhost ? ', suggested, tap to accept' : ''}`}
      disabled={locked}
      onPress={begin}
      className={`h-11 justify-center rounded-xl px-2 active:opacity-70 ${locked ? '' : 'bg-fill/70'}`}
    >
      <Text
        className="text-right text-num tabular-nums"
        style={{ fontFamily: roundedFont, color: isGhost ? colors.ghost : shown == null ? colors.outline : colors.label }}
      >
        {shown == null ? '–' : kind === 'duration' ? format(shown) : shown}
      </Text>
    </Pressable>
  );
}

/* ─────────────── Check button ─────────────── */

function CheckButton({ done, ready, active, label, onPress }: { done: boolean; ready: boolean; active: boolean; label: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (done) scale.value = withSequence(withTiming(0.72, { duration: 80 }), withSpring(1.18, { damping: 6, stiffness: 320 }), withSpring(1, { damping: 10 }));
  }, [done, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ring = done ? colors.accent : ready ? (active ? colors.accent : colors.muted) : colors.outline;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className={`${COL.check} h-11 items-center justify-center`}>
      <Animated.View
        style={[
          {
            width: 32,
            height: 32,
            borderRadius: 16,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: ring,
            backgroundColor: done ? colors.accent : 'transparent',
          },
          style,
        ]}
      >
        <CheckIcon size={16} color={done ? '#000' : ready ? ring : colors.outline} stroke={done ? 3.2 : 2.6} />
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────── Row ─────────────── */

interface SetRowProps {
  index: number;
  row: SetRowData;
  prev?: SetPerf;
  ghost: Ghost;
  unit: Unit;
  active: boolean;
  onChange: (rowId: string, field: 'weight' | 'reps', value: number | null) => void;
  onLog: (rowId: string, weight: number, reps: number) => void;
  onDetails: (rowId: string) => void;
}

/** What changed vs the same set last session — shown under "Previous" once a set is logged. */
function deltaOf(row: SetRowData, prev: SetPerf | undefined, unit: Unit, mode: SetMode): { text: string; positive: boolean } | null {
  if (row.pr) return { text: 'PR', positive: true };
  if (!prev || row.weight == null || row.reps == null) return null;
  const dw = row.weight - prev.weight;
  if (Math.abs(toDisplay(dw, unit)) >= 0.05) return { text: `${fmtDelta(dw, unit)} ${unit}`, positive: dw > 0 };
  const dr = row.reps - prev.reps;
  if (dr === 0) return null;
  if (mode === 'time') return { text: `${dr > 0 ? '+' : '−'}${formatDuration(Math.abs(dr))}`, positive: dr > 0 };
  return { text: `${dr > 0 ? '+' : '−'}${Math.abs(dr)} rep${Math.abs(dr) > 1 ? 's' : ''}`, positive: dr > 0 };
}

function SetRowView({ index, row, prev, ghost, unit, active, onChange, onLog, onDetails }: SetRowProps) {
  const mode = row.mode ?? 'reps';
  const glow = useSharedValue(0);
  const pop = useSharedValue(1);
  const shake = useSharedValue(0);
  const first = useRef(true);

  // Micro-bounce + green glow the moment a set is logged (from any entry point).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (row.done) {
      haptic.log();
      if (row.pr) setTimeout(haptic.success, 140);
      glow.value = withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 600, easing: motion.easing }));
      pop.value = withSequence(withTiming(0.975, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 240 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.done]);

  const wrap = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }, { translateX: shake.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.28, transform: [{ scale: 1 + glow.value * 0.025 }] }));

  const resolved = resolveSet(row, ghost);
  const done = row.done;
  const delta = done ? deltaOf(row, prev, unit, mode) : null;

  const press = () => {
    if (done) {
      haptic.tap();
      onLog(row.id, row.weight ?? 0, row.reps ?? 0); // toggles back to editable
      return;
    }
    if (!resolved) {
      haptic.warn();
      shake.value = withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 80 }), withTiming(-4, { duration: 70 }), withTiming(0, { duration: 50 }));
      return;
    }
    onLog(row.id, resolved.weight, resolved.reps);
  };

  const weightDisplay = row.weight == null ? null : roundDisplay(toDisplay(row.weight, unit));
  const weightGhost = ghost.weight == null ? null : roundDisplay(toDisplay(ghost.weight, unit));

  return (
    <Animated.View entering={FadeIn.duration(motion.duration)} layout={LinearTransition.duration(motion.duration)} style={wrap}>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 18, backgroundColor: colors.accent }, glowStyle]}
      />
      <View
        className="h-14 flex-row items-center rounded-2xl border px-2"
        style={{
          backgroundColor: done ? 'rgba(58,58,60,0.55)' : colors.glass,
          borderColor: active && !done ? colors.accentBorder : colors.glassBorder,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Set ${index + 1} details: ${row.warmup ? 'warm-up' : 'working set'}${row.rpe ? `, RPE ${row.rpe}` : ''}${row.note ? ', has a note' : ''}`}
          onPress={() => {
            haptic.tap();
            onDetails(row.id);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          className={`${COL.set} h-11 justify-center active:opacity-60`}
        >
          <Text className="text-body tabular-nums" style={{ color: row.warmup ? colors.warn : active && !done ? colors.accent : colors.muted, fontWeight: active && !done ? '700' : '500' }}>
            {row.warmup ? 'W' : index + 1}
          </Text>
          {row.rpe || row.note ? <View style={{ position: 'absolute', top: 6, right: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.muted }} /> : null}
        </Pressable>

        <View className={`${COL.previous} justify-center`}>
          <Text className="text-body tabular-nums text-muted/70" numberOfLines={1}>
            {prev ? (mode === 'time' ? formatDuration(prev.reps) : `${fmtWeight(prev.weight, unit)} × ${prev.reps}`) : '—'}
          </Text>
          {delta ? (
            <Text className="text-caption font-semibold tabular-nums" style={{ color: delta.positive ? colors.accent : colors.muted }}>
              {delta.text}
            </Text>
          ) : null}
        </View>

        <View className="flex-1">
          <NumberCell
            label={`Set ${index + 1} weight in ${unit}`}
            value={weightDisplay}
            ghost={weightGhost}
            locked={done}
            kind="weight"
            onCommit={(v) => onChange(row.id, 'weight', v == null ? null : fromDisplay(v, unit))}
          />
        </View>

        <View className={`${COL.reps} ml-2`}>
          <NumberCell
            label={`Set ${index + 1} ${mode === 'time' ? 'duration' : 'reps'}`}
            value={row.reps}
            ghost={ghost.reps}
            locked={done}
            kind={mode === 'time' ? 'duration' : 'count'}
            onCommit={(v) => onChange(row.id, 'reps', v)}
          />
        </View>

        <CheckButton
          done={done}
          ready={!!resolved}
          active={active}
          label={done ? `Undo set ${index + 1}` : `Log set ${index + 1}`}
          onPress={press}
        />
      </View>
    </Animated.View>
  );
}

export const SetRowItem = memo(SetRowView);
