import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { deltaTone } from '../../lib/body';
import { shortDate } from '../../lib/dates';
import { fmtDelta, fmtWeight, toDisplay } from '../../lib/units';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import { Sparkline } from '../Sparkline';
import { Caption, Card, Num } from '../ui';
import { toneColor } from './HeroCard';

/** Weight trend line plus total change, lowest and highest. Needs at least two entries. */
export function ProgressCard() {
  const { data, entries } = useBody();
  const { data: gym } = useGym();
  const unit = gym.unit;

  const chrono = useMemo(() => [...entries].reverse(), [entries]);
  const values = useMemo(() => chrono.slice(-24).map((e) => toDisplay(e.kg, unit)), [chrono, unit]);

  if (chrono.length < 2) return null;

  const first = chrono[0];
  const last = chrono[chrono.length - 1];
  const total = last.kg - first.kg;
  const flat = Math.abs(toDisplay(total, unit)) < 0.05;
  const tone = deltaTone(first.kg, last.kg, data.heightCm);
  const low = Math.min(...chrono.map((e) => e.kg));
  const high = Math.max(...chrono.map((e) => e.kg));

  return (
    <Card className="p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-h2 text-label">Progress</Text>
        <Caption>{chrono.length} entries</Caption>
      </View>

      <Sparkline values={values} height={96} dotColor={toneColor(tone)} />

      <View className="mt-4 flex-row">
        <View className="flex-1">
          <Caption>Since {shortDate(first.date)}</Caption>
          <Text className="text-h2 tabular-nums" style={{ color: flat ? colors.muted : toneColor(tone) }}>
            {flat ? 'No change' : `${fmtDelta(total, unit)} ${unit}`}
          </Text>
        </View>
        <View className="flex-1">
          <Caption>Lowest</Caption>
          <Num size="text-h2">
            {fmtWeight(low, unit)} <Text className="text-body text-muted">{unit}</Text>
          </Num>
        </View>
        <View className="flex-1">
          <Caption>Highest</Caption>
          <Num size="text-h2">
            {fmtWeight(high, unit)} <Text className="text-body text-muted">{unit}</Text>
          </Num>
        </View>
      </View>
    </Card>
  );
}
