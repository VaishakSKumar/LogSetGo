import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { relativeDay, shortDate } from '../lib/dates';
import { formatDuration } from '../lib/duration';
import { haptic } from '../lib/haptics';
import { bestsOf, previousEntry, suggestNext, topSet } from '../lib/progress';
import { fmtDelta, fmtWeight, fmtWeightUnit } from '../lib/units';
import { colors } from '../theme';
import type { Exercise, HistoryEntry, SetMode, SetRow, Unit } from '../types';
import { Sheet } from './Sheet';
import { Sparkline } from './Sparkline';
import { Caption, Num, PillButton } from './ui';

interface Props {
  exercise: Exercise;
  entries: HistoryEntry[] | undefined;
  rows: SetRow[];
  today: string;
  unit: Unit;
  mode: SetMode;
  /** size of one plate jump in the display unit (from Settings) — unused in Time mode */
  step: number;
  onApply: (sets: { weight: number; reps: number }[]) => void;
}

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View className="flex-1">
    <Caption>{label}</Caption>
    <Num size="text-h2">{value}</Num>
    {sub ? <Caption>{sub}</Caption> : null}
  </View>
);

/** Everything you've ever logged for this lift or hold, plus what to try today. */
export function ExerciseInsights({ exercise, entries, rows, today, unit, mode, step, onApply }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const isTime = mode === 'time';

  const prev = previousEntry(entries, today);
  const bests = useMemo(() => bestsOf(entries), [entries]);
  const suggestion = useMemo(() => (!isTime && prev ? suggestNext(prev.sets, unit, step) : null), [isTime, prev, unit, step]);
  const allDone = rows.length > 0 && rows.every((r) => r.done);

  const chronological = useMemo(() => [...(entries ?? [])].reverse(), [entries]);
  // For a hold, the "best set" of a session is its longest (topSet already prefers the bigger second
  // number once weight ties, which is exactly right for a bodyweight plank).
  const trend = useMemo(() => chronological.slice(-10).map((e) => (isTime ? topSet(e).reps : topSet(e).weight)), [chronological, isTime]);
  const first = chronological[0];
  const bestHold = bests?.heaviest.reps ?? 0;
  const gain = first ? (isTime ? bestHold - topSet(first).reps : bests ? bests.heaviest.weight - topSet(first).weight : 0) : 0;

  return (
    <View className="rounded-3xl border border-line bg-surface p-3" style={{ borderColor: colors.line }}>
      <View className="mb-3 flex-row items-center justify-between px-1">
        <View className="flex-1 pr-2">
          <Text className="text-h2 text-label">Progress</Text>
          {gain > (isTime ? 0.5 : 0.04) && first ? (
            <Text className="text-caption font-semibold" style={{ color: colors.accent }}>
              {isTime ? `+${formatDuration(gain)} since ${shortDate(first.date)}` : `${fmtDelta(gain, unit)} ${unit} since ${shortDate(first.date)}`}
            </Text>
          ) : (
            <Caption>{exercise.name}</Caption>
          )}
        </View>
        {entries?.length ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.tap();
              setShowHistory(true);
            }}
            className="h-11 justify-center px-2 active:opacity-60"
          >
            <Text className="text-body text-label">History</Text>
          </Pressable>
        ) : null}
      </View>

      {bests && prev ? (
        <View className="mb-3 flex-row px-1">
          {isTime ? (
            <>
              <Stat label="Best hold" value={formatDuration(bestHold)} />
              <Stat label="Last" value={formatDuration(topSet(prev).reps)} sub={relativeDay(prev.date, today)} />
            </>
          ) : (
            <>
              <Stat label="Best" value={`${fmtWeight(bests.heaviest.weight, unit)} × ${bests.heaviest.reps}`} sub={unit} />
              <Stat label="Est. 1RM" value={fmtWeight(bests.e1rm, unit)} sub={unit} />
              <Stat label="Last" value={`${fmtWeight(topSet(prev).weight, unit)} × ${topSet(prev).reps}`} sub={relativeDay(prev.date, today)} />
            </>
          )}
        </View>
      ) : null}

      {trend.length >= 2 ? (
        <View className="mb-3 px-1">
          <Sparkline values={trend} />
        </View>
      ) : null}

      {isTime ? (
        !prev ? (
          <Text className="px-1 text-body text-muted">First time logging {exercise.name}. Today’s hold becomes your baseline, and next session you’ll see it here.</Text>
        ) : !allDone && bestHold > 0 ? (
          <Text className="px-1 text-body text-muted">Hold longer than {formatDuration(bestHold)} to set a new record.</Text>
        ) : null
      ) : suggestion && !allDone ? (
        <View className="flex-row items-center gap-3 rounded-2xl bg-fill/60 p-3">
          <View className="flex-1">
            <Caption>TRY TODAY</Caption>
            <Num size="text-h2">{suggestion.headline}</Num>
            <Text className="mt-0.5 text-caption text-muted">{suggestion.reason}</Text>
          </View>
          <PillButton
            compact
            variant="white"
            label="Use"
            onPress={() => {
              haptic.tap();
              onApply(suggestion.sets);
            }}
          />
        </View>
      ) : !prev ? (
        <Text className="px-1 text-body text-muted">First time logging {exercise.name}. Today’s sets become your baseline, and next session you’ll get a target here.</Text>
      ) : null}

      <HistorySheet visible={showHistory} onClose={() => setShowHistory(false)} name={exercise.name} entries={entries ?? []} today={today} unit={unit} mode={mode} />
    </View>
  );
}

function HistorySheet({
  visible,
  onClose,
  name,
  entries,
  today,
  unit,
  mode,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  entries: HistoryEntry[];
  today: string;
  unit: Unit;
  mode: SetMode;
}) {
  const isTime = mode === 'time';
  return (
    <Sheet visible={visible} onClose={onClose} title={name}>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        {entries.map((entry, i) => {
          const top = topSet(entry);
          const before = entries[i + 1];
          const topBefore = before ? topSet(before) : null;
          const diff = topBefore ? (isTime ? top.reps - topBefore.reps : top.weight - topBefore.weight) : 0;
          return (
            <View key={entry.date} className={`flex-row items-center py-3 ${i ? 'border-t border-line' : ''}`} style={i ? { borderTopColor: colors.line } : undefined}>
              <View className="flex-1 pr-3">
                <Text className="text-body font-medium text-label">{entry.date === today ? 'Today' : shortDate(entry.date)}</Text>
                <Text className="text-caption tabular-nums text-muted">
                  {entry.sets.map((s) => (isTime ? formatDuration(s.reps) : `${fmtWeight(s.weight, unit)}×${s.reps}`)).join('  ·  ')}
                </Text>
              </View>
              <View className="items-end">
                <Num size="text-h2">{isTime ? formatDuration(top.reps) : fmtWeightUnit(top.weight, unit)}</Num>
                {isTime ? (
                  diff !== 0 ? (
                    <Text className="text-caption font-semibold tabular-nums" style={{ color: diff > 0 ? colors.accent : colors.muted }}>
                      {diff > 0 ? '+' : '−'}{formatDuration(Math.abs(diff))}
                    </Text>
                  ) : (
                    <Caption>{topBefore ? 'same' : 'first log'}</Caption>
                  )
                ) : Math.abs(diff) > 0.04 ? (
                  <Text className="text-caption font-semibold tabular-nums" style={{ color: diff > 0 ? colors.accent : colors.muted }}>
                    {fmtDelta(diff, unit)} {unit}
                  </Text>
                ) : (
                  <Caption>{topBefore ? 'same' : 'first log'}</Caption>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}
