import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, motion } from '../../theme';

/** One snap point: 90% of the screen height. */
const SNAP = 0.9;
/** Pull further than this (px), or flick faster than DISMISS_VELOCITY, and the drawer closes. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.9;
/** zinc-600 */
const HANDLE = '#52525B';

interface Props {
  visible: boolean;
  /** Backdrop tap, drag-down, or the Android back button. Not called by the footer's own actions. */
  onClose: () => void;
  /** Scrollable content. */
  children: ReactNode;
  /** Pinned to the bottom of the drawer, always visible. */
  footer?: ReactNode;
  /** Rendered inside the drawer's modal but outside its scroll area (for sheets that open on top of it). */
  overlays?: ReactNode;
  label: string;
}

/**
 * A bottom-to-top drawer at 90% height: slides up over a dimmed backdrop, has a drag handle, and
 * dismisses by dragging the handle down, tapping the backdrop, or the Android back button.
 * The body scrolls; the footer never does.
 */
export function BottomDrawer({ visible, onClose, children, footer, overlays, label }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const height = Math.round(windowHeight * SNAP);

  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, motion);
      return;
    }
    progress.value = withTiming(0, motion);
    const t = setTimeout(() => setMounted(false), motion.duration + 30);
    return () => clearTimeout(t);
  }, [visible, progress, drag]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          drag.value = Math.max(0, g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) closeRef.current();
          else drag.value = withSpring(0, { damping: 18, stiffness: 220 });
        },
        onPanResponderTerminate: () => {
          drag.value = withTiming(0, motion);
        },
      }),
    [drag],
  );

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * height + drag.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value * 0.65 * Math.max(0, 1 - drag.value / height) }));

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000' }, backdrop]}>
          <Pressable accessibilityLabel="Dismiss" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View
          accessibilityLabel={label}
          style={[
            {
              height,
              backgroundColor: colors.base,
              borderColor: colors.line,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            },
            panel,
          ]}
        >
          {/* The drag zone: the handle plus generous padding so it's easy to grab. */}
          <View {...pan.panHandlers} style={[{ alignItems: 'center', paddingTop: 10, paddingBottom: 14 }, Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab' } as never) : null]}>
            <View accessibilityLabel="Drag down to close" style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: HANDLE }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.base, paddingBottom: Math.max(insets.bottom, 12) }}>{footer}</View>
          ) : null}
        </Animated.View>

        {overlays}
      </KeyboardAvoidingView>
    </Modal>
  );
}
