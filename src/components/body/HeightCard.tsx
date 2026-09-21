import { Text, View } from 'react-native';

import { fmtHeight, normalRangeKg } from '../../lib/body';
import { fmtWeight } from '../../lib/units';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import { Caption, Card, Num, PillButton } from '../ui';

/** Height setup: a one-time entry you can edit whenever you like. */
export function HeightCard({ onEdit }: { onEdit: () => void }) {
  const { data } = useBody();
  const { data: gym } = useGym();
  const range = data.heightCm ? normalRangeKg(data.heightCm) : null;

  return (
    <Card>
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-1 pr-3">
          <Text className="text-caption uppercase tracking-wider text-muted/70">Height</Text>
          {data.heightCm ? (
            <Num size="text-h2">{fmtHeight(data.heightCm, data.heightUnit)}</Num>
          ) : (
            <Text className="text-body text-muted">Not set yet</Text>
          )}
        </View>
        <PillButton compact label={data.heightCm ? 'Edit' : 'Set height'} onPress={onEdit} />
      </View>

      {range ? (
        <Caption className="mt-2 px-1">
          Normal BMI at this height:{' '}
          <Text style={{ color: colors.accent }}>
            {fmtWeight(range.min, gym.unit)}–{fmtWeight(range.max, gym.unit)} {gym.unit}
          </Text>
        </Caption>
      ) : null}
    </Card>
  );
}
