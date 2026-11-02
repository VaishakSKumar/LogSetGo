import { useState } from 'react';
import { Pressable, Text, View, type TextStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { colors, fonts } from '../theme';

export interface ChartPoint {
  value: number;
  /** what a screen reader says for this point */
  aria: string;
  pr?: boolean;
}

interface PointChartProps {
  points: ChartPoint[];
  picked: number;
  onPick: (index: number) => void;
  /** describes the whole chart */
  label: string;
  height: number;
  /** text under the top and over the bottom guide line */
  topLabel: (value: number) => string;
  bottomLabel: (value: number) => string;
  goal?: { value: number; label: string } | null;
  /** room kept clear for the axis labels */
  inset?: number;
  dotSize?: number;
  pickedDotSize?: number;
}

const TOP = 14;
const BOTTOM = 12;
const RIGHT = 16;
const MAX_DOTS = 16;

const axisText: TextStyle = { position: 'absolute', left: 0, color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] };

/** A line through tappable points. Used by the weight chart and the week-by-week graph. */
export function PointChart({ points, picked, onPick, label, height, topLabel, bottomLabel, goal, inset = 60, dotSize = 10, pickedDotSize = 16 }: PointChartProps) {
  const [width, setWidth] = useState(0);
  const values = points.map((p) => p.value);
  const hi = Math.max(...values, ...(goal ? [goal.value] : []));
  const lo = Math.min(...values, ...(goal ? [goal.value] : []));
  const span = hi - lo;
  const plotHeight = height - TOP - BOTTOM;

  const xAt = (i: number) => (points.length === 1 ? (inset + width - RIGHT) / 2 : inset + ((width - inset - RIGHT) * i) / (points.length - 1));
  const yAt = (v: number) => (span === 0 ? TOP + plotHeight / 2 : TOP + ((hi - v) / span) * plotHeight);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`).join(' ');
  const every = Math.ceil(points.length / MAX_DOTS);
  const goalY = goal ? yAt(goal.value) : 0;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height} accessibilityRole="image" accessibilityLabel={label}>
            <Line x1={0} x2={width} y1={TOP} y2={TOP} stroke={colors.border} strokeWidth={1} />
            <Line x1={0} x2={width} y1={height - BOTTOM} y2={height - BOTTOM} stroke={colors.border} strokeWidth={1} />
            {goal ? <Line x1={inset} x2={width} y1={goalY} y2={goalY} stroke={colors.secondary} strokeWidth={1} strokeDasharray="4 4" /> : null}
            {points.length > 1 ? <Path d={line} fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
          </Svg>

          {goal ? (
            <Text style={{ position: 'absolute', right: 0, top: goalY < 28 ? goalY + 2 : goalY - 20, color: colors.secondary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] }}>
              {goal.label}
            </Text>
          ) : null}
          <Text style={[axisText, { top: TOP + 2 }]}>{topLabel(hi)}</Text>
          <Text style={[axisText, { bottom: BOTTOM + 2 }]}>{bottomLabel(lo)}</Text>

          {points.map((p, i) => {
            if (i % every !== 0 && i !== picked && i !== points.length - 1 && !p.pr) return null;
            const size = p.pr ? 26 : i === picked ? pickedDotSize : dotSize;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={p.aria}
                accessibilityState={{ selected: i === picked }}
                onPress={() => onPick(i)}
                className="items-center justify-center"
                style={{ position: 'absolute', left: xAt(i) - 20, top: yAt(p.value) - 22, width: 40, height: 44 }}
              >
                <View
                  className="items-center justify-center"
                  style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.panel, backgroundColor: p.pr ? colors.pr : colors.accent }}
                >
                  {p.pr ? <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 11, lineHeight: 13 }}>PR</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </>
      ) : null}
    </View>
  );
}
