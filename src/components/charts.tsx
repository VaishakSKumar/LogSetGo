import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';

import { colors } from '../theme';

/**
 * Chart primitives. Rules they follow: thin marks, 4px rounded data-ends anchored to the baseline,
 * a 2px gap between bars, 2px lines, end markers of 8px+ with a 2px surface ring, recessive grid,
 * selective direct labels, and text in ink tokens (never the series colour). Tap a mark to read its value.
 */

const SURFACE = colors.surface;
const GRID = colors.line;
const INK = colors.muted;
const MARK = 'rgba(142,142,147,0.55)'; // context bars
const HERO = colors.accent; // the current period

export interface BarDatum {
  label: string;
  value: number;
  /** short x-axis label, shown only for a few bars */
  tick?: string;
  /** the period you're in now */
  current?: boolean;
}

/** Path for a bar with rounded top corners and a square base sitting on the baseline. */
function barPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  if (rr === 0) return `M${x},${y} h${w} v${h} h${-w} Z`;
  return `M${x},${y + rr} a${rr},${rr} 0 0 1 ${rr},${-rr} h${w - 2 * rr} a${rr},${rr} 0 0 1 ${rr},${rr} V${y + h} H${x} Z`;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  format: (v: number) => string;
  /** text for screen readers */
  summary: string;
}

export function BarChart({ data, height = 150, format, summary }: BarChartProps) {
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  // The svg is (height - 24) tall: a little headroom, the plot, then a strip for the x-axis labels.
  const svgH = height - 24;
  const padTop = 4;
  const labelStrip = 16;
  const plotH = svgH - padTop - labelStrip;
  const base = padTop + plotH; // y of the baseline
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const gap = 2;
  const slot = width > 0 ? (width - gap * (n - 1)) / n : 0;
  const barW = Math.min(slot, 26);
  const offset = (slot - barW) / 2;
  const active = picked ?? data.findIndex((d) => d.current);
  const shown = active >= 0 ? data[active] : null;

  return (
    <View accessible accessibilityLabel={summary}>
      <View className="mb-1 h-5 flex-row items-center justify-between">
        <Text className="text-caption text-muted/70" numberOfLines={1}>
          {shown ? shown.label : ''}
        </Text>
        <Text className="text-body font-semibold tabular-nums text-label">{shown ? format(shown.value) : ''}</Text>
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: svgH }}>
        {width > 0 ? (
          <Svg width={width} height={svgH}>
            {[0, 0.5, 1].map((t) => (
              <Line key={t} x1={0} x2={width} y1={base - t * plotH} y2={base - t * plotH} stroke={GRID} strokeWidth={1} />
            ))}
            {data.map((d, i) => {
              const h = d.value > 0 ? Math.max(3, (d.value / max) * plotH) : 0;
              const x = i * (slot + gap) + offset;
              return (
                <Path
                  key={i}
                  d={h ? barPath(x, base - h, barW, h, 4) : ''}
                  fill={i === active ? HERO : MARK}
                  stroke={i === active ? SURFACE : 'none'}
                  strokeWidth={0}
                />
              );
            })}
            {data.map((d, i) =>
              d.tick ? (
                <SvgText key={`t${i}`} x={i * (slot + gap) + slot / 2} y={svgH - 3} fill={INK} fontSize={10} textAnchor="middle">
                  {d.tick}
                </SvgText>
              ) : null,
            )}
          </Svg>
        ) : null}
        {/* Tap targets are full-height columns, much bigger than the marks. */}
        {width > 0 ? (
          <View style={{ position: 'absolute', inset: 0, flexDirection: 'row', gap }} pointerEvents="box-none">
            {data.map((d, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${d.label}: ${format(d.value)}`}
                onPress={() => setPicked((p) => (p === i ? null : i))}
                style={{ width: slot, height: '100%' }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export interface PointDatum {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: PointDatum[];
  height?: number;
  format: (v: number) => string;
  summary: string;
  /** colour of the end marker (defaults to the accent) */
  endColor?: string;
}

/** One line, 2px, with the latest point marked. Tap anywhere to read the nearest point. */
export function TrendChart({ data, height = 130, format, summary, endColor = HERO }: TrendChartProps) {
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  if (data.length < 2) return null;

  const padX = 8;
  const padTop = 10;
  const padBottom = 8;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const span = max - min || 1;
  const plotH = height - 24 - padTop - padBottom;
  const xAt = (i: number) => padX + (i / (data.length - 1)) * Math.max(1, width - padX * 2);
  const yAt = (v: number) => padTop + (1 - (v - min) / span) * plotH;
  const active = picked ?? data.length - 1;
  const pts = data.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(' ');

  const nearest = (x: number) => Math.round(((x - padX) / Math.max(1, width - padX * 2)) * (data.length - 1));

  return (
    <View accessible accessibilityLabel={summary}>
      <View className="mb-1 h-5 flex-row items-center justify-between">
        <Text className="text-caption text-muted/70">{data[active].label}</Text>
        <Text className="text-body font-semibold tabular-nums text-label">{format(data[active].value)}</Text>
      </View>
      <Pressable
        onPress={(e) => setPicked(Math.min(data.length - 1, Math.max(0, nearest(e.nativeEvent.locationX))))}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: height - 24 }}
      >
        {width > 0 ? (
          <Svg width={width} height={height - 24}>
            {[padTop, padTop + plotH / 2, padTop + plotH].map((y) => (
              <Line key={y} x1={0} x2={width} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
            ))}
            <Polyline points={pts} fill="none" stroke={colors.label} strokeOpacity={0.75} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={xAt(active)} cy={yAt(data[active].value)} r={6} fill={active === data.length - 1 ? endColor : colors.label} stroke={SURFACE} strokeWidth={2} />
            <SvgText x={width - padX} y={padTop - 2} fill={INK} fontSize={10} textAnchor="end">
              {format(max)}
            </SvgText>
            <SvgText x={width - padX} y={padTop + plotH + 12} fill={INK} fontSize={10} textAnchor="end">
              {format(min)}
            </SvgText>
          </Svg>
        ) : null}
      </Pressable>
    </View>
  );
}

export interface ShareDatum {
  label: string;
  value: number;
  share: number;
}

/** Ranked horizontal bars, one neutral colour, each labelled directly. */
export function ShareBars({ data, format }: { data: ShareDatum[]; format: (d: ShareDatum) => string }) {
  return (
    <View className="gap-3" accessible accessibilityLabel={data.map((d) => `${d.label} ${format(d)}`).join(', ')}>
      {data.map((d) => (
        <View key={d.label}>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-body text-label">{d.label}</Text>
            <Text className="text-body tabular-nums text-muted">{format(d)}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.fill }}>
            <View style={{ height: 6, borderRadius: 3, width: `${Math.max(2, d.share * 100)}%`, backgroundColor: 'rgba(255,255,255,0.85)' }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** "Show data" table: every chart has a plain-text equivalent. */
export function DataTable({ rows, head }: { rows: [string, string][]; head: [string, string] }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mt-2">
      <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} className="h-11 justify-center active:opacity-60">
        <Text className="text-body text-muted">{open ? 'Hide data' : 'Show data'}</Text>
      </Pressable>
      {open ? (
        <View>
          <View className="flex-row border-b border-line pb-1" style={{ borderBottomColor: GRID }}>
            <Text className="flex-1 text-caption text-muted/70">{head[0]}</Text>
            <Text className="text-caption text-muted/70">{head[1]}</Text>
          </View>
          {rows.map(([a, b], i) => (
            <View key={i} className="flex-row py-1.5">
              <Text className="flex-1 text-body text-label">{a}</Text>
              <Text className="text-body tabular-nums text-label">{b}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
