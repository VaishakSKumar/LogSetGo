import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { UpdateWeightSheet } from '../../components/body/UpdateWeightSheet';
import { WeightHistory } from '../../components/body/WeightHistory';
import { PlusIcon } from '../../components/Icons';
import { PointChart } from '../../components/PointChart';
import { PillButton } from '../../components/ui';
import { dayOfMonth, monthName } from '../../lib/calendar';
import { weightsInRange, type WeightRange } from '../../lib/insights';
import { fmtWeight, toDisplay } from '../../lib/units';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { useTimer } from '../../store/timer';
import { colors, fonts } from '../../theme';
import { PageHeader } from './PageHeader';

const RANGES: { id: WeightRange; label: string }[] = [
  { id: 'm1', label: '1 month' },
  { id: 'm3', label: '3 months' },
  { id: 'all', label: 'All' },
];

const shortDay = (date: string) => `${dayOfMonth(date)} ${monthName(date).slice(0, 3)}`;

/** The weight chart with your goal on it, plus every entry you have logged. */
export function WeightProgressPage({ onBack }: { onBack: () => void }) {
  const { realToday, data: gym } = useGym();
  const { data } = useBody();
  const { timer } = useTimer();
  const unit = gym.unit;
  const [range, setRange] = useState<WeightRange>('m1');
  const [picked, setPicked] = useState<number | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const points = useMemo(() => weightsInRange(data.entries, realToday, range), [data.entries, realToday, range]);
  const last = points.length - 1;

  // A new or deleted weight moves the readout back to Now.
  useEffect(() => setPicked(null), [data.entries]);

  const index = picked != null && picked <= last ? picked : last;
  const point = points[index];

  const kgs = points.map((p) => p.kg);
  const delta = points.length ? kgs[last] - kgs[0] : 0;
  const flat = Math.abs(toDisplay(delta, unit)) < 0.05;
  const goal = data.goalKg;
  const axis = (kg: number) => `${fmtWeight(kg, unit)} ${unit}`;

  const tiles = [
    { label: 'Start', value: points.length ? fmtWeight(kgs[0], unit) : '—' },
    { label: 'Lowest', value: points.length ? fmtWeight(Math.min(...kgs), unit) : '—' },
    { label: 'Goal', value: goal != null ? fmtWeight(goal, unit) : '—' },
  ];

  return (
    <View className="flex-1 bg-base">
      <PageHeader title="Weight Progress" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: timer.status !== 'idle' ? 150 : 14, gap: 10 }}>
        <View className="flex-row" style={{ height: 44, padding: 3, gap: 3, borderRadius: 12, backgroundColor: colors.fill }}>
          {RANGES.map((r) => {
            const selected = r.id === range;
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setRange(r.id);
                  setPicked(null);
                }}
                className="flex-1 items-center justify-center"
                style={{ borderRadius: 9, backgroundColor: selected ? '#fff' : 'transparent' }}
              >
                <Text style={{ color: selected ? '#000' : colors.secondary, fontFamily: fonts.bold, fontSize: 14 }}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View accessibilityLabel="Weight chart" style={{ padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
          {point ? (
            <>
              <View className="flex-row items-end justify-between" style={{ gap: 12 }}>
                <View>
                  <Text accessibilityLiveRegion="polite" style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>
                    {index === last ? 'Now' : shortDay(point.date)}
                  </Text>
                  <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 52, lineHeight: 54, fontVariant: ['tabular-nums'] }}>
                    {fmtWeight(point.kg, unit)} <Text style={{ fontSize: 24 }}>{unit}</Text>
                  </Text>
                </View>
                <Text style={{ marginBottom: 6, color: '#fff', fontFamily: fonts.bold, fontSize: 15 }}>{flat ? 'No change' : `${delta > 0 ? 'Up' : 'Down'} ${axis(Math.abs(delta))}`}</Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <PointChart
                  points={points.map((p) => ({ value: p.kg, aria: `${shortDay(p.date)}, ${axis(p.kg)}` }))}
                  picked={index}
                  onPick={setPicked}
                  label={`Weight from ${axis(kgs[0])} on ${shortDay(points[0].date)} to ${axis(kgs[last])} on ${shortDay(points[last].date)}`}
                  height={200}
                  topLabel={axis}
                  bottomLabel={axis}
                  goal={goal != null ? { value: goal, label: `Goal ${axis(goal)}` } : null}
                />
              </View>
              <View className="flex-row justify-between" style={{ marginTop: 4 }}>
                <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{shortDay(points[0].date)}</Text>
                <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{shortDay(points[last].date)}</Text>
              </View>
            </>
          ) : (
            <Text style={{ paddingVertical: 24, color: colors.secondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
              {data.entries.length ? 'No weights in this range. Try All.' : 'Log your first weight to start your chart.'}
            </Text>
          )}
        </View>

        <View className="flex-row" style={{ gap: 8 }}>
          {tiles.map((t) => (
            <View key={t.label} className="flex-1" style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
              <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{t.label}</Text>
              <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }}>{t.value}</Text>
            </View>
          ))}
        </View>

        <PillButton variant="white" label="Log weight" icon={<PlusIcon size={18} color="#000" stroke={2.6} />} onPress={() => setLogOpen(true)} />

        <WeightHistory />
      </ScrollView>

      <UpdateWeightSheet visible={logOpen} onClose={() => setLogOpen(false)} />
    </View>
  );
}
