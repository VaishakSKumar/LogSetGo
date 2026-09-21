import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { shortDate } from '../../lib/dates';
import { e1rmSeries, muscleSplit, recordsList, weeklyBuckets } from '../../lib/stats';
import { fmtVolume, fmtWeight, toDisplay } from '../../lib/units';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import { BarChart, DataTable, ShareBars, TrendChart } from '../charts';
import { Sheet, SheetBody } from '../Sheet';
import { Caption, Num } from '../ui';

const RANGES = [4, 12, 26] as const;

/** 12345 -> "12,345" (values here are already in the display unit). */
const thousands = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    className={`h-11 items-center justify-center rounded-full px-4 active:opacity-70 ${selected ? 'bg-label' : 'bg-fill'}`}
  >
    <Text className={`text-body font-medium ${selected ? 'text-black' : 'text-label'}`} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mt-5">
    <Text className="mb-2 text-h2 text-label">{title}</Text>
    {children}
  </View>
);

/** Volume over time, muscle balance, strength trend per lift, and every personal record. */
export function StatsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, history, byId, realToday, active } = useGym();
  const unit = data.unit;
  const [weeks, setWeeks] = useState<(typeof RANGES)[number]>(12);
  const [pick, setPick] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const buckets = useMemo(() => weeklyBuckets(data.sessions, realToday, weeks), [data.sessions, realToday, weeks]);
  const split = useMemo(() => muscleSplit(data.sessions, byId, realToday, 30), [data.sessions, byId, realToday]);
  const records = useMemo(() => recordsList(history), [history]);

  const total = buckets.reduce((s, b) => s + b.volume, 0);
  const trained = buckets.filter((b) => b.workouts > 0).length;
  const sets = buckets.reduce((s, b) => s + b.sets, 0);
  const workouts = buckets.reduce((s, b) => s + b.workouts, 0);
  const best = buckets.reduce((m, b) => (b.volume > m.volume ? b : m), buckets[0]);

  const barData = buckets.map((b, i) => ({
    label: `Week of ${shortDate(b.weekStart)}`,
    value: toDisplay(b.volume, unit),
    tick: i === 0 || i === buckets.length - 1 || i === Math.floor(buckets.length / 2) ? shortDate(b.weekStart).slice(5) : undefined,
    current: i === buckets.length - 1,
  }));

  // Strength trend: pick a lift (defaults to the one you're on, else your most recent record).
  const liftIds = records.map((r) => r.exerciseId);
  const liftId = pick && liftIds.includes(pick) ? pick : active && liftIds.includes(active.id) ? active.id : liftIds[0];
  const series = e1rmSeries(liftId ? history[liftId] : undefined);
  const trend = series.map((p) => ({ label: shortDate(p.date), value: toDisplay(p.e1rm, unit) }));

  const shownRecords = showAll ? records : records.slice(0, 6);

  return (
    <Sheet visible={visible} onClose={onClose} title="Stats & records">
      <SheetBody>
        {!records.length ? (
          <Text className="py-6 text-body text-muted">Log a few workouts and your charts, muscle balance and personal records will appear here.</Text>
        ) : (
          <>
            <View className="flex-row gap-2">
              {RANGES.map((r) => (
                <Chip key={r} label={`${r} wk`} selected={r === weeks} onPress={() => setWeeks(r)} />
              ))}
            </View>

            <Section title="Weekly volume">
              <View className="mb-3 flex-row">
                <View className="flex-1">
                  <Caption>Total</Caption>
                  <Num size="text-h2">{fmtVolume(total, unit)}</Num>
                  <Caption>{unit}</Caption>
                </View>
                <View className="flex-1">
                  <Caption>Avg / trained week</Caption>
                  <Num size="text-h2">{fmtVolume(trained ? total / trained : 0, unit)}</Num>
                  <Caption>{unit}</Caption>
                </View>
                <View className="flex-1">
                  <Caption>Sets · workouts</Caption>
                  <Num size="text-h2">
                    {sets} · {workouts}
                  </Num>
                </View>
              </View>
              <BarChart
                data={barData}
                format={(v) => `${thousands(v)} ${unit}`}
                summary={`Weekly volume over the last ${weeks} weeks. Best week: ${best ? `week of ${shortDate(best.weekStart)}, ${fmtVolume(best.volume, unit)} ${unit}` : 'none'}. Total ${fmtVolume(total, unit)} ${unit}.`}
              />
              <DataTable head={['Week of', unit]} rows={buckets.map((b) => [shortDate(b.weekStart), fmtVolume(b.volume, unit)])} />
            </Section>

            <Section title="Muscle balance · last 30 days">
              {split.length ? (
                <ShareBars data={split.map((g) => ({ label: g.group, value: g.sets, share: g.share }))} format={(d) => `${d.value} sets · ${Math.round(d.share * 100)}%`} />
              ) : (
                <Caption>No working sets in the last 30 days.</Caption>
              )}
            </Section>

            <Section title="Strength trend">
              <Caption className="mb-2">Estimated 1-rep max per session</Caption>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} className="-mx-4 px-4">
                {records.slice(0, 12).map((r) => (
                  <Chip key={r.exerciseId} label={byId.get(r.exerciseId)?.name ?? r.exerciseId} selected={r.exerciseId === liftId} onPress={() => setPick(r.exerciseId)} />
                ))}
              </ScrollView>
              {trend.length >= 2 ? (
                <>
                  <TrendChart
                    data={trend}
                    format={(v) => `${Math.round(v * 10) / 10} ${unit}`}
                    summary={`${byId.get(liftId ?? '')?.name ?? 'Exercise'} estimated one-rep max, ${trend.length} sessions, from ${trend[0].value.toFixed(1)} to ${trend[trend.length - 1].value.toFixed(1)} ${unit}.`}
                  />
                  <DataTable head={['Session', `e1RM (${unit})`]} rows={series.map((p) => [shortDate(p.date), fmtWeight(p.e1rm, unit)])} />
                </>
              ) : (
                <Caption>Two sessions of this lift are needed for a trend.</Caption>
              )}
            </Section>

            <Section title="Personal records">
              {shownRecords.map((r, i) => (
                <View key={r.exerciseId} className="min-h-[60px] flex-row items-center py-2" style={i ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
                  <View className="flex-1 pr-3">
                    <Text className="text-body text-label" numberOfLines={1}>
                      {byId.get(r.exerciseId)?.name ?? r.exerciseId}
                    </Text>
                    <Caption>Set {shortDate(r.bestE1rmDate)}</Caption>
                  </View>
                  <View className="items-end">
                    <Num size="text-h2">
                      {fmtWeight(r.heaviest.weight, unit)} × {r.heaviest.reps}
                    </Num>
                    <Caption>
                      est. 1RM {fmtWeight(r.bestE1rm, unit)} {unit}
                    </Caption>
                  </View>
                </View>
              ))}
              {records.length > 6 ? (
                <Pressable accessibilityRole="button" onPress={() => setShowAll((s) => !s)} className="h-11 justify-center active:opacity-60">
                  <Text className="text-body text-label">{showAll ? 'Show fewer' : `Show all ${records.length}`}</Text>
                </Pressable>
              ) : null}
            </Section>
          </>
        )}
      </SheetBody>
    </Sheet>
  );
}
