import { Text, View } from 'react-native';

import type { DaySummary } from '../../lib/session';
import { fmtVolume, toDisplay } from '../../lib/units';
import { colors, fonts } from '../../theme';
import type { Unit } from '../../types';
import { AnimatedNumber } from './AnimatedNumber';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const Stat = ({ value, label, a11y }: { value: number; label: string; a11y: string }) => (
  <View className="flex-row items-baseline justify-end" style={{ gap: 6 }} accessible accessibilityLabel={a11y}>
    <AnimatedNumber value={value} style={{ color: '#000', fontFamily: fonts.display, fontSize: 18, lineHeight: 20 }} />
    <Text style={{ color: '#000', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>{label}</Text>
  </View>
);

/**
 * Today's Workout: total volume, exercises and sets. Every figure counts to its new value, so
 * deleting an exercise visibly takes its volume off the total.
 */
export function SummaryCard({ summary, unit }: { summary: DaySummary; unit: Unit }) {
  return (
    <View className="flex-row items-end justify-between" style={{ marginTop: 6, paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderRadius: 20, backgroundColor: colors.accent }}>
      <View className="shrink" accessible accessibilityLabel={`Total volume ${fmtVolume(summary.volume, unit)} ${unit}`}>
        <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 }}>Today’s workout</Text>
        <View className="flex-row items-baseline" style={{ gap: 5 }}>
          <AnimatedNumber value={Math.round(toDisplay(summary.volume, unit))} style={{ color: '#000', fontFamily: fonts.display, fontSize: 62, lineHeight: 62 }} />
          <Text style={{ color: '#000', fontFamily: fonts.display, fontSize: 26 }}>{unit}</Text>
        </View>
      </View>
      <View style={{ marginBottom: 6 }}>
        <Stat value={summary.exercises} label={summary.exercises === 1 ? 'Exercise' : 'Exercises'} a11y={plural(summary.exercises, 'exercise')} />
        <Stat value={summary.sets} label={summary.sets === 1 ? 'Set' : 'Sets'} a11y={plural(summary.sets, 'set')} />
      </View>
    </View>
  );
}
