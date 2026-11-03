import { memo, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { formatDuration, parseDurationInput } from '../lib/duration';
import { haptic } from '../lib/haptics';
import { fmtSet } from '../lib/progress';
import { fmtDelta, fromDisplay, roundDisplay, toDisplay } from '../lib/units';
import { colors, fonts, motion } from '../theme';
import type { LoadKind, SetMode, SetPerf, SetRow as SetRowData, Unit } from '../types';
import { CheckIcon } from './Icons';

/* ─────────────── Column widths shared with the table header ─────────────── */

export const COL = {
  set: 'w-[26px]',
  previous: 'w-[62px]',
  check: 'w-11',
} as const;

/* ─────────────── Numeric cell ─────────────── */

/** How a NumberCell reads and writes its stored number. */
type CellKind = 'weight' | 'count' | 'duration';

const CELL: Record<
  CellKind,
  {
    format: (n: number) => string;
    parse: (text: string) => number | null;
    keyboard: 'decimal-pad' | 'number-pad';
  }
> = {
  weight: {
    format: (n) => String(n),
    parse: (t) => {
      const n = parseFloat(t.replace(',', '.'));
      return Number.isFinite(n) && n >= 0 ? roundDisplay(n) : null;
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

type Field = 'weight' | 'reps';

interface NumberCellProps {
  value: number | null;
  kind: CellKind;
  label: string;
  locked: boolean;
  /** This cell has the keyboard; `draft` is what is typed so far. */
  editing: boolean;
  draft: string;
  /** "next" moves on to reps after kg; "done" closes the keyboard. */
  returnKey: 'next' | 'done';
  inputRef: React.RefObject<TextInput | null>;
  onBegin: () => void;
  onDraft: (text: string) => void;
  onSubmit: () => void;
  onBlur: () => void;
}

/**
 * Centred numeric field (weight, rep count, or MM:SS duration — `kind` picks how it formats and
 * parses; the stored value is always a plain number, seconds for a duration). A logged set is
 * read-only. Starts empty: nothing is copied in from earlier sets.
 *
 * Tapping a filled field clears it and shows the old value in grey, so what you type is the new
 * value; leave it empty and the old value stays. (Selecting the old text instead is unreliable on
 * Android: the first digit typed can stay selected and the second one replaces it.)
 *
 * Always a real text field, never swapped in and out: moving between kg and reps then hands focus
 * from one field to the other, and Android keeps the keyboard up instead of closing it.
 */
function NumberCell({ value, kind, label, locked, editing, draft, returnKey, inputRef, onBegin, onDraft, onSubmit, onBlur }: NumberCellProps) {
  const { format, keyboard } = CELL[kind];
  const noWeight = kind === 'weight' && value === 0;
  const shown = value == null || noWeight ? '' : kind === 'duration' ? format(value) : String(value);
  // What sits over the empty field: the saved value, or in grey while typing until the first key.
  const cover = !editing ? shown || '–' : draft ? '' : shown || (kind === 'duration' ? '0:00' : '0');
  const coverColor = editing ? colors.ghost : shown ? colors.label : colors.outline;

  return (
    <View>
      <TextInput
        ref={inputRef}
        editable={!locked}
        // The saved value is drawn on top, never put in the field, so the field is empty when it is tapped
        // and the first key typed always starts a new number, however fast it comes. Not a placeholder:
        // Android does not always redraw a placeholder that changes (switching kg / lbs left it blank).
        value={editing ? draft : ''}
        onFocus={onBegin}
        onChangeText={onDraft}
        onBlur={onBlur}
        onSubmitEditing={onSubmit}
        submitBehavior={returnKey === 'next' ? 'submit' : 'blurAndSubmit'}
        keyboardType={kind === 'duration' ? 'numbers-and-punctuation' : keyboard}
        returnKeyType={returnKey}
        maxLength={kind === 'duration' ? 5 : 6}
        accessibilityLabel={editing ? label : `${label}: ${value == null ? 'empty' : kind === 'duration' ? format(value) : value}`}
        className={`rounded-[10px] border text-center ${editing ? 'border-white/25 bg-fill' : 'border-transparent'}`}
        // Sized like the BMI goal field: no line height or vertical alignment, which on Android push the digits up and clip them.
        style={
          {
            height: 40,
            padding: 0,
            paddingHorizontal: 4,
            color: colors.label,
            fontFamily: fonts.bold,
            fontSize: 19,
            fontVariant: ['tabular-nums'],
            outlineStyle: 'none',
          } as never
        }
      />
      {cover ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: coverColor,
              fontFamily: fonts.bold,
              fontSize: 19,
              fontVariant: ['tabular-nums'],
            }}
          >
            {cover}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ─────────────── Check button ─────────────── */

function CheckButton({ done, active, label, onPress }: { done: boolean; active: boolean; label: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (done) scale.value = withSequence(withTiming(0.72, { duration: 80 }), withSpring(1.18, { damping: 6, stiffness: 320 }), withSpring(1, { damping: 10 }));
  }, [done, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const ring = done || active ? colors.accent : '#5A5D5A';

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className={`${COL.check} h-11 items-center justify-center`}>
      <Animated.View
        style={[
          {
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: done ? 0 : 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: ring,
            backgroundColor: done ? colors.accent : 'transparent',
          },
          style,
        ]}
      >
        {done ? <CheckIcon size={16} color="#000" stroke={3.2} /> : null}
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────── Row ─────────────── */

interface SetRowProps {
  index: number;
  row: SetRowData;
  prev?: SetPerf;
  unit: Unit;
  active: boolean;
  load?: LoadKind;
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
  if (mode === 'time')
    return {
      text: `${dr > 0 ? '+' : '−'}${formatDuration(Math.abs(dr))}`,
      positive: dr > 0,
    };
  return {
    text: `${dr > 0 ? '+' : '−'}${Math.abs(dr)} rep${Math.abs(dr) > 1 ? 's' : ''}`,
    positive: dr > 0,
  };
}

function SetRowView({ index, row, prev, unit, active, load = 'kg', onChange, onLog, onDetails }: SetRowProps) {
  const mode = row.mode ?? 'reps';
  const repsKind: CellKind = mode === 'time' ? 'duration' : 'count';
  const glow = useSharedValue(0);
  const pop = useSharedValue(1);
  const shake = useSharedValue(0);
  const first = useRef(true);

  // Which cell is being typed in, and what is typed. Kept in refs too, so the tick and a blur from
  // a cell that is going away always read the latest text, never a stale render.
  const [editing, setEditingState] = useState<Field | null>(null);
  const [draft, setDraftState] = useState('');
  const editingRef = useRef<Field | null>(null);
  const draftRef = useRef('');
  const setEditing = (f: Field | null) => {
    editingRef.current = f;
    setEditingState(f);
  };
  const setDraft = (t: string) => {
    draftRef.current = t;
    setDraftState(t);
  };

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

  const wrap = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { translateX: shake.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.28,
    transform: [{ scale: 1 + glow.value * 0.025 }],
  }));

  const done = row.done;
  const delta = done ? deltaOf(row, prev, unit, mode) : null;
  const weightDisplay = row.weight == null ? null : roundDisplay(toDisplay(row.weight, unit));

  // The set as last saved. Updated on commit too, so a commit and a tick in the same moment agree.
  const latest = useRef({ weight: row.weight, reps: row.reps });
  latest.current = { weight: row.weight, reps: row.reps };
  const weightRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);

  /** Saves what is typed in the open cell, and returns the set as it now stands (weight in kg). */
  const commit = () => {
    let { weight, reps } = latest.current;
    const field = editingRef.current;
    // Nothing typed keeps what was there.
    if (!draftRef.current.trim()) return { weight, reps };
    if (field === 'weight') {
      const v = CELL.weight.parse(draftRef.current);
      const next = v == null ? null : fromDisplay(v, unit);
      if (next !== weight) onChange(row.id, 'weight', next);
      weight = next;
    } else if (field === 'reps') {
      const next = CELL[repsKind].parse(draftRef.current);
      if (next !== reps) onChange(row.id, 'reps', next);
      reps = next;
    }
    latest.current = { weight, reps };
    return { weight, reps };
  };

  // The cell that just handed over the keyboard, and the text it had then.
  const handedOff = useRef<{ field: Field; text: string } | null>(null);

  // After "Next", Android can repeat kg's text, and keys pressed quickly can still land in kg before the
  // keyboard reaches reps. Repeats are ignored; anything new belongs to the open cell.
  const typeInto = (field: Field) => (t: string) => {
    if (editingRef.current === field) return setDraft(t);
    const from = handedOff.current;
    if (!editingRef.current || from?.field !== field || !t.startsWith(from.text)) return;
    const extra = t.slice(from.text.length);
    from.text = t;
    if (extra) setDraft(draftRef.current + extra);
  };

  /** A cell got focus (a tap, or "next" from kg): save the other cell, start typing in this one. */
  const begin = (field: Field) => {
    if (done || editingRef.current === field) return;
    handedOff.current = editingRef.current ? { field: editingRef.current, text: draftRef.current } : null;
    commit();
    setDraft(''); // starts empty; the old value shows as the placeholder
    setEditing(field);
  };

  const close = () => {
    commit();
    setEditing(null);
  };

  // Kg's "next" key hands the keyboard straight to reps; reps' "done" closes it.
  const submit = () => {
    if (editingRef.current === 'weight') {
      begin('reps');
      repsRef.current?.focus();
    } else close();
  };
  // A cell only closes itself when it still has the keyboard; switching cells is handled by begin().
  const blurFrom = (field: Field) => () => {
    if (editingRef.current === field) close();
  };

  const press = () => {
    if (done) {
      haptic.tap();
      onLog(row.id, row.weight ?? 0, row.reps ?? 0); // toggles back to editable
      return;
    }
    const now = commit();
    setEditing(null);
    Keyboard.dismiss();
    if (now.reps == null || now.reps < 1) {
      haptic.warn();
      shake.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 80 }),
        withTiming(-4, { duration: 70 }),
        withTiming(0, { duration: 50 }),
      );
      return;
    }
    onLog(row.id, now.weight ?? 0, now.reps);
  };

  return (
    <Animated.View entering={FadeIn.duration(motion.duration)} layout={LinearTransition.duration(motion.duration)} style={wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: 12,
            backgroundColor: colors.accent,
          },
          glowStyle,
        ]}
      />
      <View
        className="flex-row items-center"
        style={{
          height: 48,
          paddingHorizontal: 6,
          borderRadius: 12,
          borderWidth: 1,
          backgroundColor: active && !done ? colors.raised : 'transparent',
          borderColor: active && !done ? colors.accent : 'transparent',
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
          <Text
            className="text-body tabular-nums"
            style={{
              color: row.warmup ? colors.warn : colors.secondary,
              fontFamily: fonts.semibold,
            }}
          >
            {row.warmup ? 'W' : index + 1}
          </Text>
          {row.rpe || row.note ? (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 2,
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.muted,
              }}
            />
          ) : null}
        </Pressable>

        <View className={`${COL.previous} justify-center`}>
          <Text className="text-meta tabular-nums text-muted" numberOfLines={1}>
            {prev ? (mode === 'time' ? formatDuration(prev.reps) : fmtSet(prev, unit)) : '—'}
          </Text>
          {delta ? (
            <Text className="text-caption font-semibold tabular-nums" style={{ color: delta.positive ? colors.accent : colors.muted }}>
              {delta.text}
            </Text>
          ) : null}
        </View>

        {load === 'none' ? null : (
          <View className="flex-1">
            <NumberCell
              label={`Set ${index + 1} weight in ${unit}`}
              value={weightDisplay}
              kind="weight"
              locked={done}
              editing={editing === 'weight'}
              draft={draft}
              returnKey="next"
              inputRef={weightRef}
              onBegin={() => begin('weight')}
              onDraft={typeInto('weight')}
              onSubmit={submit}
              onBlur={blurFrom('weight')}
            />
          </View>
        )}

        <View className="flex-1">
          <NumberCell
            label={`Set ${index + 1} ${mode === 'time' ? 'duration' : 'reps'}`}
            value={row.reps}
            kind={repsKind}
            locked={done}
            editing={editing === 'reps'}
            draft={draft}
            returnKey="done"
            inputRef={repsRef}
            onBegin={() => begin('reps')}
            onDraft={typeInto('reps')}
            onSubmit={submit}
            onBlur={blurFrom('reps')}
          />
        </View>

        <CheckButton done={done} active={active} label={done ? `Undo set ${index + 1}` : `Log set ${index + 1}`} onPress={press} />
      </View>
    </Animated.View>
  );
}

export const SetRowItem = memo(SetRowView);
