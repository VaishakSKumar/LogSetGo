import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, motion } from '../theme';
import { CloseIcon } from './Icons';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** The large condensed heading, without the close button. */
  display?: boolean;
}

/** Bottom sheet: 250ms ease-out slide + backdrop fade. Stays mounted just long enough to animate out. */
export function Sheet({ visible, onClose, title, children, display = false }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, motion);
      return;
    }
    progress.value = withTiming(0, motion);
    const t = setTimeout(() => setMounted(false), motion.duration + 20);
    return () => clearTimeout(t);
  }, [visible, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value * 0.6 }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * height * 0.6 }], opacity: 0.2 + progress.value * 0.8 }));

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000' }, backdrop]}>
          <Pressable accessibilityLabel="Close" className="flex-1" onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            {
              maxHeight: height * 0.82,
              flexShrink: 1,
              backgroundColor: colors.panel,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: insets.bottom + 16,
            },
            panel,
          ]}
        >
          <View className="items-center pt-2">
            <View style={{ height: 4, width: 36, borderRadius: 2, backgroundColor: colors.handle }} />
          </View>
          <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
            <Text className={display ? 'text-display text-label' : 'text-h1 text-label'}>{title}</Text>
            {display ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-fill active:opacity-60"
              >
                <CloseIcon size={16} color="#fff" />
              </Pressable>
            )}
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Scrollable content area for tall sheets. Keeps taps working while a keyboard is open. */
export function SheetBody({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  return (
    <ScrollView
      style={{ maxHeight: height * 0.62, flexShrink: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
