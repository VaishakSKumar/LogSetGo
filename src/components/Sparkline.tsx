import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { colors } from '../theme';

/** Tiny trend line. The last point turns green when you're at or above the previous one. */
export function Sparkline({ values, height = 44, dotColor }: { values: number[]; height?: number; dotColor?: string }) {
  const [width, setWidth] = useState(0);
  if (values.length < 2) return null;

  const pad = 5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * Math.max(width - pad * 2, 1),
    y: pad + (1 - (v - min) / span) * (height - pad * 2),
  }));
  const last = pts[pts.length - 1];
  const up = values[values.length - 1] >= values[values.length - 2];

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.muted} strokeOpacity={0.6} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={last.x} cy={last.y} r={4} fill={dotColor ?? (up ? colors.accent : colors.label)} />
        </Svg>
      ) : null}
    </View>
  );
}
