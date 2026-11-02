import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { haptic } from '../../lib/haptics';
import { fmt, isWarning, progressOf, remainingMs } from '../../lib/timer';
import { useNow, useTimer } from '../../store/timer';
import { colors, fonts } from '../../theme';

const BOX = 280;
const STROKE = 12;
const RADIUS = 128;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The full-screen rest countdown shown the moment a set is checked off. */
export function RestOverlay({ nextUp }: { nextUp?: string }) {
  const { timer, controls } = useTimer();
  const { width } = useWindowDimensions();
  const running = timer.status === 'running';
  const now = useNow(running, 100);
  if (timer.status === 'idle') return null;

  const done = timer.status === 'done';
  const seconds = done ? 0 : Math.ceil(remainingMs(timer, now) / 1000);
  const tint = isWarning(timer, now) ? colors.warn : colors.accent;
  const size = Math.min(BOX, width - 48);

  return (
    <View
      accessibilityLabel="Rest countdown"
      className="items-center justify-center"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, padding: 24, backgroundColor: 'rgba(0,0,0,0.94)' }}
    >
      <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 44, lineHeight: 48, textTransform: 'uppercase' }}>{done ? 'Rest over' : 'Rest Timer'}</Text>
      <View className="items-center justify-center" style={{ width: size, height: size, marginTop: 24 }}>
        <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`} style={{ position: 'absolute' }}>
          <Circle cx={BOX / 2} cy={BOX / 2} r={RADIUS} stroke={colors.border} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={BOX / 2}
            cy={BOX / 2}
            r={RADIUS}
            stroke={tint}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progressOf(timer, now))}
            transform={`rotate(-90 ${BOX / 2} ${BOX / 2})`}
          />
        </Svg>
        <Text
          accessibilityRole="timer"
          accessibilityLabel={done ? 'Rest over' : `${fmt(seconds)} remaining`}
          style={{ color: tint, fontFamily: fonts.display, fontSize: seconds > 99 ? 104 : 136, fontVariant: ['tabular-nums'] }}
        >
          {seconds}
        </Text>
      </View>
      {nextUp ? <Text style={{ marginTop: 24, color: '#fff', fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, textAlign: 'center' }}>{nextUp}</Text> : null}
      <View className="flex-row self-stretch" style={{ marginTop: 28, gap: 8 }}>
        {done ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="+15s"
            onPress={() => {
              haptic.tap();
              controls.addTime(15);
            }}
            className="items-center justify-center active:opacity-70"
            style={{ width: 96, height: 60, borderRadius: 14, backgroundColor: colors.control }}
          >
            <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 19 }}>+15s</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={done ? 'Done' : 'Skip'}
          onPress={controls.skip}
          className="flex-1 items-center justify-center active:opacity-80"
          style={{ height: 60, borderRadius: 14, backgroundColor: '#fff' }}
        >
          <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 19 }}>{done ? 'Done' : 'Skip rest'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
