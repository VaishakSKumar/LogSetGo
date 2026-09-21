import { Text, View } from 'react-native';

import { PillButton } from './ui';
import { COL, SetRowItem } from './SetRow';
import { PlusIcon } from './Icons';
import { colors } from '../theme';
import type { Ghost, SetPerf, SetRow, Unit } from '../types';

interface SetTableProps {
  rows: SetRow[];
  ghosts: Ghost[];
  prevSets: SetPerf[] | undefined;
  unit: Unit;
  activeRowId: string | undefined;
  onChange: (rowId: string, field: 'weight' | 'reps', value: number | null) => void;
  onLog: (rowId: string, weight: number, reps: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  onDetails: (rowId: string) => void;
}

const Head = ({ children, className = '' }: { children: string; className?: string }) => (
  <Text className={`text-caption uppercase tracking-wider text-muted/60 ${className}`}>{children}</Text>
);

/** Active-set card: SET | PREVIOUS | WEIGHT | REPS | ✓ */
export function SetTable({ rows, ghosts, prevSets, unit, activeRowId, onChange, onLog, onAdd, onRemove, onDetails }: SetTableProps) {
  const canRemove = rows.length > 1 && !rows[rows.length - 1].done;

  return (
    <View className="rounded-3xl border border-line bg-surface p-3" style={{ borderColor: colors.line }}>
      <View className="mb-2 flex-row items-center px-2">
        <Head className={COL.set}>Set</Head>
        <Head className={COL.previous}>Previous</Head>
        <Head className="flex-1 pr-2 text-right">{unit}</Head>
        <Head className={`${COL.reps} ml-2 pr-2 text-right`}>Reps</Head>
        <View className={COL.check} />
      </View>

      <View className="gap-2">
        {rows.map((row, i) => (
          <SetRowItem
            key={row.id}
            index={i}
            row={row}
            prev={prevSets?.[i]}
            ghost={ghosts[i]}
            unit={unit}
            active={row.id === activeRowId}
            onChange={onChange}
            onLog={onLog}
            onDetails={onDetails}
          />
        ))}
      </View>

      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <PillButton compact label="Add set" onPress={onAdd} icon={<PlusIcon size={16} color={colors.label} />} />
        </View>
        {canRemove ? (
          <View className="w-28">
            <PillButton compact label="Remove" onPress={onRemove} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
