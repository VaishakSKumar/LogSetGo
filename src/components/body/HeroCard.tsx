import { Text, View } from 'react-native';

import { deltaTone, type Tone } from '../../lib/body';
import { shortDate } from '../../lib/dates';
import { fmtDelta, fmtWeight, toDisplay } from '../../lib/units';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { colors, roundedFont } from '../../theme';
import { PlusIcon } from '../Icons';
import { Caption, Card, PillButton } from '../ui';
import { BmiGauge, CategoryChip } from './BmiGauge';

export const toneColor = (t: Tone) => (t === 'toward' ? colors.accent : t === 'away' ? colors.danger : colors.muted);

/** Current weight, change since the last log, and the BMI gauge. */
export function HeroCard({ onUpdate, onEditHeight }: { onUpdate: () => void; onEditHeight: () => void }) {
  const { latest, entries, bmi, data } = useBody();
  const { data: gym } = useGym();
  const unit = gym.unit;

  const previous = entries[1];
  const flat = latest?.delta != null && Math.abs(toDisplay(latest.delta, unit)) < 0.05;

  return (
    <Card className="p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-caption uppercase tracking-wider text-muted/70">Current weight</Text>
        {latest ? <Caption>Updated {shortDate(latest.date)}</Caption> : null}
      </View>

      {latest ? (
        <>
          <View className="mt-1 flex-row flex-wrap items-baseline">
            <Text className="text-display tabular-nums text-label" style={{ fontFamily: roundedFont }} accessibilityLabel={`${fmtWeight(latest.kg, unit)} ${unit}`}>
              {fmtWeight(latest.kg, unit)}
            </Text>
            <Text className="ml-1 text-h2 text-muted">{unit}</Text>
            {latest.delta != null ? (
              <Text
                className="ml-3 text-h2 tabular-nums"
                style={{ color: toneColor(deltaTone(latest.prevKg!, latest.kg, data.heightCm)) }}
                accessibilityLabel={flat ? 'No change' : `Change ${fmtDelta(latest.delta, unit)} ${unit}`}
              >
                {flat ? '(no change)' : `(${fmtDelta(latest.delta, unit)} ${unit})`}
              </Text>
            ) : null}
          </View>
          <Caption>{previous ? `since ${shortDate(previous.date)}` : 'First entry. Log again to see your change.'}</Caption>
        </>
      ) : (
        <View className="py-3">
          <Text className="text-display text-muted/40" style={{ fontFamily: roundedFont }}>—</Text>
          <Text className="mt-1 text-body text-muted">Log your weight once. It stays put until you update it, so there's no daily entry.</Text>
        </View>
      )}

      {/* BMI */}
      <View className="mt-4 border-t border-line pt-4" style={{ borderTopColor: colors.line }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-caption uppercase tracking-wider text-muted/70">BMI</Text>
            <Text className="text-display tabular-nums text-label" style={{ fontFamily: roundedFont }}>{bmi == null ? '—' : bmi.toFixed(1)}</Text>
          </View>
          {bmi != null ? <CategoryChip bmi={bmi} /> : null}
        </View>

        <View className="mt-3">
          <BmiGauge bmi={bmi} />
        </View>

        {bmi == null ? (
          <View className="mt-1 flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-body text-muted">
              {data.heightCm == null ? 'Add your height to calculate BMI.' : 'Log a weight to calculate BMI.'}
            </Text>
            {data.heightCm == null ? <PillButton compact label="Set height" onPress={onEditHeight} /> : null}
          </View>
        ) : null}
      </View>

      <View className="mt-4">
        <PillButton variant="white" label={latest ? 'Update weight' : 'Log weight'} icon={<PlusIcon size={18} color="#000" />} onPress={onUpdate} />
      </View>
    </Card>
  );
}
