import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { formatDuration } from '../../lib/duration';
import { weekBests, weeksAgoLabel, type WeekBest, type WeekMetric } from '../../lib/insights';
import { fmtWeight } from '../../lib/units';
import { colors, fonts } from '../../theme';
import type { HistoryEntry, SetMode, Unit } from '../../types';
import { PointChart } from '../PointChart';

function setText(week: WeekBest, metric: WeekMetric, unit: Unit) {
  if (metric === 'time') return week.weight > 0 ? `${fmtWeight(week.weight, unit)} ${unit} × ${formatDuration(week.reps)}` : formatDuration(week.reps);
  return metric === 'reps' ? `${week.reps} reps` : `${fmtWeight(week.weight, unit)} ${unit} × ${week.reps}`;
}

const axisValue = (value: number, metric: WeekMetric, unit: Unit) =>
  metric === 'time' ? formatDuration(value) : metric === 'reps' ? `${value} reps` : `${fmtWeight(value, unit)} ${unit}`;

/** Best set of each week below the set table. A week that beats every earlier one gets a banana-yellow PR dot. */
export function WeekProgressCard({ entries, today, unit, mode }: { entries: HistoryEntry[] | undefined; today: string; unit: Unit; mode: SetMode }) {
  const { metric, weeks } = useMemo(() => weekBests(entries, today, mode), [entries, today, mode]);
  const [picked, setPicked] = useState<number | null>(null);

  // A newly logged set moves the readout back to the latest point. The chart keeps six weeks, so its length can stay the same.
  useEffect(() => setPicked(null), [weeks]);

  const index = picked ?? weeks.length - 1;
  const week = weeks[index];

  return (
    <View accessibilityLabel="Week by week progress" style={{ marginTop: 8, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
      <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
        <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 }}>Week by week</Text>
        {week ? (
          <Text accessibilityLiveRegion="polite" className="shrink" style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 22, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
            {setText(week, metric, unit)}
            {week.pr ? ', new PR' : ''}
          </Text>
        ) : null}
      </View>

      {week ? (
        <>
          <View style={{ marginTop: 6 }}>
            <PointChart
              points={weeks.map((w) => ({
                value: w.value,
                pr: w.pr,
                aria: `${weeksAgoLabel(w.weeksAgo)}, ${setText(w, metric, unit)}${w.pr ? ', new PR' : ''}`,
              }))}
              picked={index}
              onPick={setPicked}
              label={`Best set each week, from ${axisValue(weeks[0].value, metric, unit)} to ${axisValue(weeks[weeks.length - 1].value, metric, unit)}`}
              height={148}
              inset={64}
              dotSize={12}
              pickedDotSize={12}
              topLabel={(v) => axisValue(v, metric, unit)}
              bottomLabel={(v) => axisValue(v, metric, unit)}
            />
          </View>
          <View className="flex-row justify-between" style={{ marginTop: 2 }}>
            <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{weeksAgoLabel(weeks[0].weeksAgo)}</Text>
            {weeks.length > 1 ? <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{weeksAgoLabel(weeks[weeks.length - 1].weeksAgo)}</Text> : null}
          </View>
        </>
      ) : (
        <Text style={{ marginTop: 4, color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>Tick a set to start your graph.</Text>
      )}
    </View>
  );
}
