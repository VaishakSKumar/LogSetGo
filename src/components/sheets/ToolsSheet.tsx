import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DEFAULT_BAR, PLATES, oneRepMax, percentTable, platesPerSide, warmupSets } from '../../lib/calc';
import { bestsOf } from '../../lib/progress';
import { roundDisplay, toDisplay } from '../../lib/units';
import { useGym } from '../../store/gym';
import { colors, roundedFont } from '../../theme';
import { Sheet, SheetBody } from '../Sheet';
import { Caption } from '../ui';
import { NumField } from './NumField';

type Tab = 'rm' | 'plates' | 'warmup';
const TABS: { key: Tab; label: string }[] = [
  { key: 'rm', label: '1RM' },
  { key: 'plates', label: 'Plates' },
  { key: 'warmup', label: 'Warm-up' },
];

const BARS = { kg: [20, 15, 10], lb: [45, 35, 25] } as const;

const Row = ({ left, right, strong }: { left: string; right: string; strong?: boolean }) => (
  <View className="flex-row items-center justify-between py-2" style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
    <Text className={`text-body ${strong ? 'font-semibold text-label' : 'text-muted'}`}>{left}</Text>
    <Text className="text-body tabular-nums text-label" style={{ fontFamily: roundedFont }}>
      {right}
    </Text>
  </View>
);

/** Three gym calculators: estimated 1RM with a percentage table, plates per side, and a warm-up ramp. */
export function ToolsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, active, history } = useGym();
  const unit = data.unit;
  const step = unit === 'kg' ? data.prefs.stepKg : data.prefs.stepLb;

  // Start from your last lift on the selected exercise, else a sensible default.
  const best = active ? bestsOf(history[active.id]) : null;
  const seed = best ? roundDisplay(toDisplay(best.heaviest.weight, unit)) : unit === 'kg' ? 100 : 225;

  const [tab, setTab] = useState<Tab>('rm');
  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState(5);
  const [bar, setBar] = useState<number | null>(null);

  const w = weight ?? seed;
  const barKg = bar != null && (BARS[unit] as readonly number[]).includes(bar) ? bar : DEFAULT_BAR[unit];

  const rm = useMemo(() => oneRepMax(w, reps), [w, reps]);
  const table = useMemo(() => percentTable(rm.estimate, unit === 'kg' ? 0.5 : 1), [rm.estimate, unit]);
  const load = useMemo(() => platesPerSide(w, barKg, PLATES[unit]), [w, barKg, unit]);
  const warm = useMemo(() => warmupSets(w, barKg, step), [w, barKg, step]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Gym tools">
      <SheetBody>
        <View className="mb-4 flex-row rounded-full bg-fill p-1">
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
              onPress={() => setTab(t.key)}
              className="h-9 flex-1 items-center justify-center rounded-full"
              style={{ backgroundColor: tab === t.key ? colors.outline : 'transparent' }}
            >
              <Text className={`text-body font-semibold ${tab === t.key ? 'text-label' : 'text-muted'}`}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'rm' ? (
          <>
            <View className="flex-row">
              <NumField label={`Weight (${unit})`} value={w} onChange={setWeight} step={step} max={1500} />
              <NumField label="Reps" value={reps} onChange={setReps} step={1} min={1} max={30} integer />
            </View>
            <View className="my-4 items-center">
              <Caption>Estimated 1-rep max</Caption>
              <Text className="tabular-nums text-label" style={{ fontFamily: roundedFont, fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.5 }}>
                {roundDisplay(rm.estimate)} <Text className="text-h2 text-muted">{unit}</Text>
              </Text>
              <Caption>
                Epley {roundDisplay(rm.epley)} · Brzycki {rm.brzycki === undefined ? '—' : roundDisplay(rm.brzycki)}
                {reps > 10 ? ' · rough beyond 10 reps' : ''}
              </Caption>
            </View>
            {table.map((r) => (
              <Row key={r.pct} left={`${r.pct}% · about ${r.reps} rep${r.reps > 1 ? 's' : ''}`} right={`${r.weight} ${unit}`} strong={r.pct === 100} />
            ))}
          </>
        ) : null}

        {tab === 'plates' || tab === 'warmup' ? (
          <>
            <View className="flex-row">
              <NumField label={tab === 'plates' ? `Target (${unit})` : `Working (${unit})`} value={w} onChange={setWeight} step={step} max={1500} />
            </View>
            <Text className="mb-2 mt-4 text-body text-muted">Bar</Text>
            <View className="mb-4 flex-row gap-2">
              {BARS[unit].map((b) => (
                <Pressable
                  key={b}
                  accessibilityRole="button"
                  accessibilityState={{ selected: barKg === b }}
                  onPress={() => setBar(b)}
                  className={`h-11 flex-1 items-center justify-center rounded-full ${barKg === b ? 'bg-label' : 'bg-fill'}`}
                >
                  <Text className={`text-body font-medium ${barKg === b ? 'text-black' : 'text-label'}`}>
                    {b} {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {tab === 'plates' ? (
          load.belowBar ? (
            <Text className="text-body text-muted">That’s lighter than the empty bar ({barKg} {unit}).</Text>
          ) : (
            <>
              <Caption className="mb-1">Load on each side</Caption>
              {load.perSide.length === 0 ? <Text className="text-body text-muted">Just the bar.</Text> : null}
              {load.perSide.map((p) => (
                <Row key={p.plate} left={`${p.plate} ${unit} plate`} right={`× ${p.count}`} strong />
              ))}
              <Row left="Total on the bar" right={`${roundDisplay(load.loaded)} ${unit}`} strong />
              {load.short > 0.001 ? (
                <Text className="mt-2 text-body" style={{ color: colors.warn }}>
                  Closest loadable weight is {load.short} {unit} under your target.
                </Text>
              ) : null}
            </>
          )
        ) : null}

        {tab === 'warmup' ? (
          warm.length === 0 ? (
            <Text className="text-body text-muted">Working weight is at or below the bar, so no warm-up ramp is needed.</Text>
          ) : (
            <>
              <Caption className="mb-1">Ramp to your first working set</Caption>
              {warm.map((s, i) => (
                <Row key={i} left={`${s.label} · ${s.reps} rep${s.reps > 1 ? 's' : ''}`} right={`${s.weight} ${unit}`} />
              ))}
              <Row left="Working set" right={`${roundDisplay(w)} ${unit}`} strong />
              <Caption className="mt-2">Mark these as warm-ups (tap a set number) so they don’t count toward volume or records.</Caption>
            </>
          )
        ) : null}
      </SheetBody>
    </Sheet>
  );
}
