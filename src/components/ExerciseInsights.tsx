import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { relativeDay, shortDate } from '../lib/dates';
import { haptic } from '../lib/haptics';
import { bestsOf, previousEntry, suggestNext, topSet } from '../lib/progress';
import { fmtDelta, fmtWeight, fmtWeightUnit } from '../lib/units';
import { colors } from '../theme';
import type { Exercise, HistoryEntry, SetRow, Unit } from '../types';
import { Sheet } from './Sheet';
import { Sparkline } from './Sparkline';
import { Caption, Num, PillButton } from './ui';

interface Props {
  exercise: Exercise;
  entries: HistoryEntry[] | undefined;
  rows: SetRow[];
  today: string;
  unit: Unit;
  onApply: (sets: { weight: number; reps: number }[]) => void;
}

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View className="flex-1">
    <Caption>{label}</Caption>
    <Num size="text-h2">{value}</Num>
    {sub ? <Caption>{sub}</Caption> : null}
  </View>
);

/** Everything you've ever logged for this lift, plus what to try today. */
export function ExerciseInsights({ exercise, entries, rows, today, unit, onApply }: Props) {
  const [showHistory, setShowHistory] = useState(false);

  const prev = previousEntry(entries, today);
  const bests = useMemo(() => bestsOf(entries), [entries]);
  const suggestion = useMemo(() => (prev ? suggestNext(prev.sets, unit) : null), [prev, unit]);
  const allDone = rows.length > 0 && rows.every((r) => r.done);

  const chronological = useMemo(() => [...(entries ?? [])].reverse(), [entries]);
  const trend = useMemo(() => chronological.slice(-10).map((e) => topSet(e).weight), [chronological]);
  const first = chronological[0];
  const gain = first && bests ? bests.heaviest.weight - topSet(first).weight : 0;

  return (
    <View className="rounded-3xl border border-line bg-surface p-3" style={{ borderColor: colors.line }}>
      <View className="mb-3 flex-row items-center justify-between px-1">
        <View className="flex-1 pr-2">
          <Text className="text-h2 text-label">Progress</Text>
          {gain > 0.04 && first ? (
            <Text className="text-caption font-semibold" style={{ color: colors.accent }}>
              {fmtDelta(gain, unit)} {unit} since {shortDate(first.date)}
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
          <Stat label="Best" value={`${fmtWeight(bests.heaviest.weight, unit)} × ${bests.heaviest.reps}`} sub={unit} />
          <Stat label="Est. 1RM" value={fmtWeight(bests.e1rm, unit)} sub={unit} />
          <Stat label="Last" value={`${fmtWeight(topSet(prev).weight, unit)} × ${topSet(prev).reps}`} sub={relativeDay(prev.date, today)} />
        </View>
      ) : null}

      {trend.length >= 2 ? (
        <View className="mb-3 px-1">
          <Sparkline values={trend} />
        </View>
      ) : null}

      {suggestion && !allDone ? (
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

      <HistorySheet visible={showHistory} onClose={() => setShowHistory(false)} name={exercise.name} entries={entries ?? []} today={today} unit={unit} />
    </View>
  );
}

function HistorySheet({ visible, onClose, name, entries, today, unit }: { visible: boolean; onClose: () => void; name: string; entries: HistoryEntry[]; today: string; unit: Unit }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={name}>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        {entries.map((entry, i) => {
          const top = topSet(entry);
          const before = entries[i + 1];
          const diff = before ? top.weight - topSet(before).weight : 0;
          return (
            <View key={entry.date} className={`flex-row items-center py-3 ${i ? 'border-t border-line' : ''}`} style={i ? { borderTopColor: colors.line } : undefined}>
              <View className="flex-1 pr-3">
                <Text className="text-body font-medium text-label">{entry.date === today ? 'Today' : shortDate(entry.date)}</Text>
                <Text className="text-caption tabular-nums text-muted">
                  {entry.sets.map((s) => `${fmtWeight(s.weight, unit)}×${s.reps}`).join('  ·  ')}
                </Text>
              </View>
              <View className="items-end">
                <Num size="text-h2">{fmtWeightUnit(top.weight, unit)}</Num>
                {Math.abs(diff) > 0.04 ? (
                  <Text className="text-caption font-semibold tabular-nums" style={{ color: diff > 0 ? colors.accent : colors.muted }}>
                    {fmtDelta(diff, unit)} {unit}
                  </Text>
                ) : (
                  <Caption>{before ? 'same' : 'first log'}</Caption>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}
