import { Text, View } from 'react-native';

import { colors, roundedFont } from '../../theme';
import { MinusIcon, PlusIcon } from '../Icons';
import { Caption, HoldButton } from '../ui';

/** Labeled −/value/+ control. Holding either button keeps stepping. */
export function StepperField({ label, value, onStep }: { label: string; value: string; onStep: (dir: 1 | -1) => void }) {
  return (
    <View className="flex-1 items-center">
      <Caption className="mb-1 uppercase tracking-wider">{label}</Caption>
      <View className="flex-row items-center gap-2">
        <HoldButton label={`Decrease ${label}`} onStep={() => onStep(-1)}>
          <MinusIcon color={colors.label} />
        </HoldButton>
        <View className="min-w-[56px] items-center">
          <Text
            className="tabular-nums text-label"
            style={{ fontFamily: roundedFont, fontSize: 28, lineHeight: 34, fontWeight: '700' }}
            accessibilityLabel={`${value} ${label}`}
          >
            {value}
          </Text>
        </View>
        <HoldButton label={`Increase ${label}`} onStep={() => onStep(1)}>
          <PlusIcon color={colors.label} />
        </HoldButton>
      </View>
    </View>
  );
}
