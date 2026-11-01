import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { haptic } from '../../lib/haptics';
import { fmt, isWarning, progressOf, remainingMs } from '../../lib/timer';
import { useNow, useTimer } from '../../store/timer';
import { colors, roundedFont } from '../../theme';
import { PillButton } from '../ui';

const SIZE = 220;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The full-screen rest countdown shown the moment a set is checked off. */
export function RestOverlay() {
  const { timer, controls } = useTimer();
  const running = timer.status === 'running';
  const now = useNow(running, 100);
  if (timer.status === 'idle') return null;

  const done = timer.status === 'done';
  const seconds = done ? 0 : Math.ceil(remainingMs(timer, now) / 1000);
  const ring = isWarning(timer, now) ? colors.warn : colors.accent;

  return (
    <View
      accessibilityLabel="Rest countdown"
      className="items-center justify-center gap-6 px-6"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.92)' }}
    >
      <Text className="text-h2 text-label">{done ? 'Rest over' : 'Rest'}</Text>
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.fill} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={ring}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progressOf(timer, now))}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <Text
          accessibilityRole="timer"
          accessibilityLabel={done ? 'Rest over' : `${fmt(seconds)} remaining`}
          style={{ color: colors.label, fontFamily: roundedFont, fontSize: 64, fontWeight: '700', fontVariant: ['tabular-nums'] }}
        >
          {fmt(seconds)}
        </Text>
      </View>
      <View className="flex-row gap-3">
        {done ? (
          <PillButton compact variant="white" label="Done" onPress={controls.skip} />
        ) : (
          <>
            <PillButton
              compact
              label="+15s"
              onPress={() => {
                haptic.tap();
                controls.addTime(15);
              }}
            />
            <PillButton compact variant="white" label="Skip" onPress={controls.skip} />
          </>
        )}
      </View>
    </View>
  );
}
