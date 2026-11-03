import { Pressable, Text, View } from 'react-native';

import { COL, SetRowItem } from './SetRow';
import { PlusIcon } from './Icons';
import { colors, fonts } from '../theme';
import type { LoadKind, SetMode, SetPerf, SetRow, Unit } from '../types';

interface SetTableProps {
  rows: SetRow[];
  prevSets: SetPerf[] | undefined;
  unit: Unit;
  /** Which column the second field is: Reps or Time. New rows are created in this mode. */
  mode: SetMode;
  load?: LoadKind;
  activeRowId: string | undefined;
  onChange: (rowId: string, field: 'weight' | 'reps', value: number | null) => void;
  onLog: (rowId: string, weight: number, reps: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  onDetails: (rowId: string) => void;
}

const Head = ({ children, className = '' }: { children: string; className?: string }) => (
  <Text className={`text-muted ${className}`} style={{ fontFamily: fonts.semibold, fontSize: 12, lineHeight: 20 }}>
    {children}
  </Text>
);

/** Set | Last | kg | Reps-or-Time | ✓ */
export function SetTable({ rows, prevSets, unit, mode, load = 'kg', activeRowId, onChange, onLog, onAdd, onRemove, onDetails }: SetTableProps) {
  const canRemove = rows.length > 1 && !rows[rows.length - 1].done;

  return (
    <View>
      <View className="flex-row items-center" style={{ paddingHorizontal: 6 }}>
        <Head className={COL.set}>Set</Head>
        <Head className={COL.previous}>Last</Head>
        {load === 'none' ? null : <Head className="flex-1 text-center">{load === 'extra' ? `+${unit}` : unit}</Head>}
        <Head className="flex-1 text-center">{mode === 'time' ? 'Time' : 'Reps'}</Head>
        <View className={COL.check} />
      </View>

      {rows.map((row, i) => (
        <SetRowItem
          key={row.id}
          index={i}
          row={row}
          prev={prevSets?.[i]}
          unit={unit}
          active={row.id === activeRowId}
          load={load}
          onChange={onChange}
          onLog={onLog}
          onDetails={onDetails}
        />
      ))}

      <View className="flex-row">
        <Pressable accessibilityRole="button" accessibilityLabel="Add set" onPress={onAdd} className="flex-1 flex-row items-center justify-center active:opacity-60" style={{ height: 44, gap: 6 }}>
          <PlusIcon size={16} color={colors.accent} stroke={2.8} />
          <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 15 }}>Add set</Text>
        </Pressable>
        {canRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Remove" onPress={onRemove} className="justify-center active:opacity-60" style={{ height: 44, paddingHorizontal: 12 }}>
            <Text style={{ color: colors.muted, fontFamily: fonts.semibold, fontSize: 14 }}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
