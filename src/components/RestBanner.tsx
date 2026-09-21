import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '../lib/haptics';
import { fmt, isWarning, progressOf, remainingMs } from '../lib/timer';
import { useNow, useTimer } from '../store/timer';
import { colors, motion, roundedFont } from '../theme';
import { PauseIcon, PlayIcon } from './Icons';
import { PillButton, RoundButton } from './ui';

const BAR_HEIGHT = 6;

/**
 * Docked countdown card. Green while running, amber for the last 10 seconds,
 * grey while paused, and a pulse + haptic at 0:00.
 */
export function RestBanner() {
  const { timer } = useTimer();
  if (timer.status === 'idle') return null;
  return <Banner />;
}

function Banner() {
  const { timer, controls } = useTimer();
  const running = timer.status === 'running';
  const paused = timer.status === 'paused';
  const done = timer.status === 'done';

  const now = useNow(running);
  const left = remainingMs(timer, now);
  const seconds = done ? 0 : Math.ceil(left / 1000);
  const warning = isWarning(timer, now);

  /* animated values */
  const warn = useSharedValue(0);
  const fill = useSharedValue(1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    warn.value = withTiming(warning ? 1 : 0, { duration: motion.duration });
  }, [warning, warn]);

  useEffect(() => {
    // Linear, and slightly longer than the tick, so the bar glides instead of stepping.
    fill.value = withTiming(progressOf(timer, now), { duration: 260, easing: Easing.linear });
  }, [timer, now, fill]);

  useEffect(() => {
    if (!done) return;
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 420 })), 3, false);
  }, [done, pulse]);

  const timeColor = useAnimatedStyle(() => ({ color: interpolateColor(warn.value, [0, 1], [colors.accent, colors.warn]) }));
  const barColor = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
    backgroundColor: interpolateColor(warn.value, [0, 1], [colors.accent, colors.warn]),
  }));
  const card = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.025 }] }));
  const glow = useAnimatedStyle(() => ({ opacity: pulse.value * 0.32 }));

  const caption = done ? 'Rest over' : paused ? `Paused${timer.label ? ` · ${timer.label}` : ''}` : (timer.label ?? 'Rest');

  return (
    <Animated.View entering={FadeInDown.duration(motion.duration)} exiting={FadeOutDown.duration(motion.duration)} style={card}>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 24, backgroundColor: colors.accent }, glow]}
      />
      <View
        style={{
          borderRadius: 24,
          borderWidth: 1,
          borderColor: done ? colors.accentBorder : colors.line,
          backgroundColor: colors.surface,
          padding: 12,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-caption uppercase tracking-wider text-muted/70" numberOfLines={1}>
              {caption}
            </Text>
            <Animated.Text
              accessibilityRole="timer"
              accessibilityLabel={done ? 'Rest over' : `${fmt(seconds)} remaining`}
              style={[
                {
                  fontFamily: roundedFont,
                  fontSize: 32,
                  lineHeight: 38,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                },
                paused ? { color: colors.muted } : timeColor,
              ]}
            >
              {fmt(seconds)}
            </Animated.Text>
          </View>

          <View className="flex-row items-center gap-2">
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
                <RoundButton
                  label={paused ? 'Resume timer' : 'Pause timer'}
                  onPress={() => {
                    haptic.tap();
                    paused ? controls.resume() : controls.pause();
                  }}
                >
                  {paused ? <PlayIcon color={colors.label} /> : <PauseIcon color={colors.label} />}
                </RoundButton>
                <PillButton compact label="Skip" onPress={controls.skip} />
              </>
            )}
          </View>
        </View>

        <View style={{ height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, backgroundColor: colors.fill, marginTop: 12, overflow: 'hidden' }}>
          <Animated.View
            style={[{ height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2 }, paused ? { backgroundColor: colors.muted, width: `${progressOf(timer, now) * 100}%` } : barColor]}
          />
        </View>
      </View>
    </Animated.View>
  );
}
