import { Pressable, Text, View } from 'react-native';

import { haptic } from '../../lib/haptics';
import type { LoggedExercise } from '../../lib/session';
import { fmtVolume } from '../../lib/units';
import { colors } from '../../theme';
import type { Exercise, Unit } from '../../types';
import { Sheet } from '../Sheet';
import { PillButton } from '../ui';

export type MenuStep = 'menu' | 'confirm';

interface Props {
  visible: boolean;
  step: MenuStep;
  exercise: Pick<Exercise, 'name'> | undefined;
  entry: LoggedExercise | undefined;
  unit: Unit;
  onClose: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
}

/** The ••• menu, and the "are you sure?" step that every delete goes through (swipe or menu). */
export function ExerciseMenuSheet({ visible, step, exercise, entry, unit, onClose, onEdit, onAskDelete, onConfirmDelete }: Props) {
  const name = exercise?.name ?? 'this exercise';
  const sets = entry?.sets.length ?? 0;

  return (
    <Sheet visible={visible} onClose={onClose} title={step === 'confirm' ? `Delete ${name}?` : name}>
      <View className="px-4 pb-2">
        {step === 'menu' ? (
          <View className="gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add or edit sets"
              onPress={() => {
                haptic.tap();
                onEdit();
              }}
              className="h-14 justify-center rounded-2xl bg-fill px-4 active:opacity-70"
            >
              <Text className="text-h2 text-label">Add or edit sets</Text>
              <Text className="text-meta text-muted">Reopen it in the entry panel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete exercise"
              onPress={() => {
                haptic.tap();
                onAskDelete();
              }}
              className="h-14 justify-center rounded-2xl bg-fill px-4 active:opacity-70"
            >
              <Text className="text-h2" style={{ color: colors.danger }}>
                Delete exercise…
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="text-body text-muted">
              This removes {sets} logged set{sets === 1 ? '' : 's'}
              {entry ? ` (${fmtVolume(entry.volume, unit)} ${unit})` : ''} from today. Your other days aren’t touched.
            </Text>
            <View className="mt-4 flex-row gap-2">
              <View className="flex-1">
                <PillButton label="Cancel" onPress={onClose} />
              </View>
              <View className="flex-1">
                <PillButton label="Delete" variant="danger" onPress={onConfirmDelete} />
              </View>
            </View>
          </View>
        )}
      </View>
    </Sheet>
  );
}
