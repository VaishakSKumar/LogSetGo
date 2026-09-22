import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { haptic } from '../../lib/haptics';
import { DAY_NAME_PRESETS, MAX_DAY_LABEL_LENGTH, isDefaultDayLabel, normalizeDayLabel } from '../../lib/daylabels';
import { colors, motion } from '../../theme';
import { CloseIcon } from '../Icons';
import { Sheet, SheetBody } from '../Sheet';
import { Caption, PillButton } from '../ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Existing custom names, so the sheet can say when you're about to reuse one instead of creating it. */
  existing: string[];
  /** Save & Apply: creates (or reuses) the name and sets it as today's workout day, in one step. */
  onSave: (name: string) => void;
}

/** Apple-style "New workout day" sheet: a name field with a preset row, Cancel and Save & Apply. */
export function AddDayNameSheet({ visible, onClose, existing, onSave }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Fresh input, focused, every time the sheet opens — once its slide-in has settled.
  useEffect(() => {
    if (!visible) return;
    setText('');
    const t = setTimeout(() => inputRef.current?.focus(), motion.duration + 10);
    return () => clearTimeout(t);
  }, [visible]);

  const trimmed = normalizeDayLabel(text);
  const reused = !!trimmed && existing.some((l) => l.toLowerCase() === trimmed.toLowerCase());
  const isDefault = !!trimmed && isDefaultDayLabel(trimmed);

  const save = () => {
    if (!trimmed) return;
    haptic.pulse(); // impactLight
    onSave(trimmed);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="New workout day">
      <SheetBody>
        <View className="flex-row items-center rounded-2xl px-4" style={{ height: 48, backgroundColor: colors.fill }}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            onSubmitEditing={save}
            placeholder="e.g. Upper Hypertrophy"
            placeholderTextColor={colors.ghost}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={MAX_DAY_LABEL_LENGTH}
            selectionColor={colors.accent}
            accessibilityLabel="Workout day name"
            style={{ flex: 1, height: 48, padding: 0, fontSize: 17, color: colors.label, outlineStyle: 'none' } as never}
          />
          {text.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear"
              hitSlop={10}
              onPress={() => {
                haptic.tap();
                setText('');
                inputRef.current?.focus();
              }}
              className="active:opacity-60"
            >
              <CloseIcon size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mt-3" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {DAY_NAME_PRESETS.map((preset) => (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityLabel={`Start from “${preset}”`}
              onPress={() => {
                haptic.tap();
                setText(preset);
                inputRef.current?.focus();
              }}
              className="h-10 items-center justify-center rounded-full bg-fill px-4 active:opacity-70"
            >
              <Text className="text-body font-medium text-label">{preset}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Caption className="mb-4 mt-3">
          {reused
            ? `You already have “${trimmed}”. Save & Apply will switch today to it.`
            : isDefault
              ? `“${trimmed}” is one of the built-in day names — Save & Apply will just switch to it.`
              : 'Saved names show up in the workout-day picker for every future day, until you delete them.'}
        </Caption>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <PillButton label="Cancel" onPress={onClose} />
          </View>
          <View className="flex-1">
            <PillButton label="Save & Apply" variant="primary" disabled={!trimmed} onPress={save} />
          </View>
        </View>
      </SheetBody>
    </Sheet>
  );
}
