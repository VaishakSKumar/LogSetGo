import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { haptic } from '../../lib/haptics';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import type { SetRow } from '../../types';
import { Sheet } from '../Sheet';
import { Caption } from '../ui';

const RPES = [6, 7, 8, 9, 10];

const RPE_HELP: Record<number, string> = {
  6: 'Easy, 4+ reps left',
  7: 'Moderate, 3 reps left',
  8: 'Hard, 2 reps left',
  9: 'Very hard, 1 rep left',
  10: 'Max effort, nothing left',
};

/** Per-set extras: mark a warm-up, record how hard it was (RPE), add a note. */
export function SetDetailsSheet({ visible, onClose, row, index }: { visible: boolean; onClose: () => void; row: SetRow | undefined; index: number }) {
  const { actions } = useGym();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote(row?.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!row) return <Sheet visible={false} onClose={onClose} title="" children={null} />;

  const commitNote = () => actions.setSetMeta(row.id, { note });
  const close = () => {
    commitNote();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title={`Set ${index + 1}`}>
      <View className="px-4 pb-2">
        <Text className="mb-2 text-body text-muted">Type</Text>
        <View className="mb-4 flex-row rounded-full bg-fill p-1">
          {[
            { key: false, label: 'Working set' },
            { key: true, label: 'Warm-up' },
          ].map((o) => {
            const selected = !!row.warmup === o.key;
            return (
              <Pressable
                key={String(o.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  haptic.tap();
                  actions.setSetMeta(row.id, { warmup: o.key });
                }}
                className="h-9 flex-1 items-center justify-center rounded-full"
                style={{ backgroundColor: selected ? colors.outline : 'transparent' }}
              >
                <Text className={`text-body font-semibold ${selected ? 'text-label' : 'text-muted'}`}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {row.warmup ? <Caption className="-mt-2 mb-3">Warm-ups don’t count toward volume, records or suggestions.</Caption> : null}

        <Text className="mb-2 text-body text-muted">How hard was it? (RPE)</Text>
        <View className="flex-row gap-2">
          {RPES.map((r) => {
            const selected = row.rpe === r;
            return (
              <Pressable
                key={r}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`RPE ${r}, ${RPE_HELP[r]}`}
                onPress={() => {
                  haptic.tap();
                  actions.setSetMeta(row.id, { rpe: selected ? null : r });
                }}
                className={`h-11 flex-1 items-center justify-center rounded-full ${selected ? 'bg-label' : 'bg-fill'}`}
              >
                <Text className={`text-body font-semibold tabular-nums ${selected ? 'text-black' : 'text-label'}`}>{r}</Text>
              </Pressable>
            );
          })}
        </View>
        <Caption className="mb-4 mt-1">{row.rpe ? RPE_HELP[row.rpe] : 'Optional. Tap again to clear.'}</Caption>

        <Text className="mb-2 text-body text-muted">Note</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={commitNote}
          placeholder="e.g. paused reps, felt light"
          placeholderTextColor={colors.ghost}
          maxLength={80}
          returnKeyType="done"
          accessibilityLabel="Set note"
          className="h-11 rounded-xl bg-fill px-3 text-body text-label"
          style={{ outlineStyle: 'none' } as never}
        />
      </View>
    </Sheet>
  );
}
