import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon } from '../../components/Icons';
import { fonts } from '../../theme';

/** Back arrow and title at the top of each Account page. */
export function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center bg-base" style={{ height: 50 + insets.top, paddingTop: insets.top, paddingLeft: 6, paddingRight: 16, gap: 2 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Account" onPress={onBack} className="items-center justify-center active:opacity-60" style={{ width: 44, height: 44 }}>
        <ChevronLeftIcon size={22} color="#fff" stroke={2.4} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.display, fontSize: 30, lineHeight: 36 }}>
        {title}
      </Text>
    </View>
  );
}
