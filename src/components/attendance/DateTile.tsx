import { memo, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { STATUS_META, type Status } from '../../lib/attendance';
import { longDate } from '../../lib/calendar';
import { colors } from '../../theme';

export const TILE_HEIGHT = 52;

interface DateTileProps {
  date: string;
  day: number;
  status: Status | undefined;
  isToday: boolean;
  isFuture: boolean;
  onPress: (date: string) => void;
}

/**
 * One calendar cell. Marked dates fill with their status color and carry a bold
 * 10pt P / A / H badge under the number. Today gets a white ring.
 */
function DateTileView({ date, day, status, isToday, isFuture, onPress }: DateTileProps) {
  const pop = useSharedValue(1);
  const first = useRef(true);

  // Micro-bounce whenever a date's status changes.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pop.value = withSequence(withTiming(0.88, { duration: 80 }), withSpring(1, { damping: 8, stiffness: 260 }));
  }, [status, pop]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const meta = status ? STATUS_META[status] : null;

  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${longDate(date)}${isToday ? ', today' : ''}. ${meta ? meta.label : 'Not logged'}. Tap to set status.`}
        // Cells can be a hair under 44pt on narrow phones; the slop keeps every touch target ≥ 44.
        hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
        onPress={() => onPress(date)}
        className="items-center justify-center active:opacity-75"
        style={{
          height: TILE_HEIGHT,
          minWidth: 42,
          borderRadius: 12,
          backgroundColor: meta ? meta.color : colors.surface,
          borderWidth: isToday ? 2 : 1,
          borderColor: isToday ? colors.label : meta ? meta.color : colors.line,
        }}
      >
        <Text
          className="tabular-nums"
          style={{
            fontSize: 17,
            lineHeight: 20,
            fontWeight: '600',
            color: meta ? '#000' : isFuture ? colors.outline : colors.label,
          }}
        >
          {day}
        </Text>
        <Text style={{ fontSize: 10, lineHeight: 12, fontWeight: '700', color: 'rgba(0,0,0,0.72)' }}>
          {meta ? meta.letter : ' '}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export const DateTile = memo(DateTileView);

export const EmptyTile = () => <View style={{ flex: 1, height: TILE_HEIGHT }} />;
