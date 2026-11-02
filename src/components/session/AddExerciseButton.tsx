import { Pressable, View } from 'react-native';

import { colors } from '../../theme';
import { PlusIcon } from '../Icons';

/** The floating "+" above the tab bar, with the same raised lip as the punch button. */
export function AddExerciseButton({ onPress, bottom }: { onPress: () => void; bottom: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Add exercise" onPress={onPress} className="active:opacity-90" style={{ position: 'absolute', right: 16, bottom, width: 60, height: 65 }}>
      <View style={{ position: 'absolute', top: 5, left: 0, width: 60, height: 60, borderRadius: 18, backgroundColor: colors.accentLip }} />
      <View className="items-center justify-center" style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: colors.accent }}>
        <PlusIcon size={28} color="#000" stroke={2.8} />
      </View>
    </Pressable>
  );
}
