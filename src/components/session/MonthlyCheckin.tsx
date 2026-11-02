import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { monthName, monthTitle, shiftMonth } from '../../lib/calendar';
import { haptic } from '../../lib/haptics';
import { MAX_PHOTO_MB, PHOTO_FORMATS, previousPhoto } from '../../lib/photoCheck';
import { chooseFile, takePhoto, type PhotoPick, type PickedPhoto } from '../../lib/photos';
import { useGym } from '../../store/gym';
import { usePhotoUri, usePhotos } from '../../store/photos';
import { colors, fonts } from '../../theme';
import { PillButton } from '../ui';

function Slot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="flex-1" style={{ gap: 6 }}>
      <Text className="text-center" style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const frame = { flex: 1, minHeight: 200, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' } as const;

/**
 * The monthly progress photo: last month's on the left, a new one on the right. It is never forced:
 * Gym Progress offers it once a month with a Skip, and Account opens it any time to add or replace.
 */
export function MonthlyCheckin({ onSkip, onSaved, intro }: { onSkip: () => void; onSaved: () => void; intro: string }) {
  const { realToday } = useGym();
  const { photos, save: savePhoto } = usePhotos();
  const insets = useSafeAreaInsets();
  const last = photos ? previousPhoto(photos, realToday) : null;
  const lastUri = usePhotoUri(last);
  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const take = async (pick: () => Promise<PhotoPick>) => {
    const result = await pick();
    if (result.ok) {
      haptic.tap();
      setPicked(result.photo);
      setError(null);
    } else if (!result.cancelled) {
      haptic.warn();
      setPicked(null);
      setError(result.error ?? 'Couldn’t use that file.');
    }
  };

  const save = async () => {
    if (!picked) return;
    setSaving(true);
    try {
      await savePhoto(picked, realToday);
      haptic.success();
      onSaved();
    } catch (e) {
      haptic.warn();
      setError(e instanceof Error ? e.message : 'Couldn’t save that photo. Try again.');
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-base" accessibilityLabel="Monthly photo check-in" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 14 }}>
      <View className="flex-row items-center justify-between">
        <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14 }}>{monthTitle(realToday)}</Text>
        <Pressable accessibilityRole="button" onPress={onSkip} className="justify-center active:opacity-60" style={{ height: 44, marginRight: -8, paddingHorizontal: 8 }}>
          <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 15 }}>Skip for now</Text>
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 2, marginBottom: 8, color: '#fff', fontFamily: fonts.display, fontSize: 58, lineHeight: 56, textTransform: 'uppercase' }}>
        Monthly{'\n'}
        <Text style={{ color: colors.accent }}>check-in</Text>
      </Text>
      <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>{intro}</Text>

      <View className="flex-1 flex-row" style={{ marginTop: 12, gap: 10 }}>
        <Slot title={monthName(last?.date ?? shiftMonth(realToday, -1))}>
          <View style={[frame, { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }]}>
            {lastUri ? (
              <Image accessibilityLabel="Your earlier photo" source={{ uri: lastUri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text className="text-center" style={{ paddingHorizontal: 12, color: colors.muted, fontFamily: fonts.medium, fontSize: 14 }}>
                No earlier photo yet
              </Text>
            )}
          </View>
        </Slot>
        <Slot title="This month">
          {picked ? (
            <View style={[frame, { borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.panel }]}>
              <Image accessibilityLabel="Your new photo" source={{ uri: picked.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            </View>
          ) : (
            <View style={[frame, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.handle }]}>
              <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 14 }}>Your new photo</Text>
            </View>
          )}
        </Slot>
      </View>

      <View className="flex-row" style={{ marginTop: 12, gap: 8 }}>
        <View className="flex-1">
          <PillButton compact variant="white" label={picked ? 'Retake' : 'Take photo'} onPress={() => void take(takePhoto)} />
        </View>
        <View className="flex-1">
          <PillButton compact label="Choose a file" onPress={() => void take(chooseFile)} />
        </View>
      </View>
      <Text className="text-center" style={{ marginVertical: 8, color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
        {PHOTO_FORMATS}, up to {MAX_PHOTO_MB} MB
      </Text>

      {error ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" className="rounded-2xl border p-3" style={{ marginBottom: 8, borderColor: colors.danger }}>
          <Text className="text-body" style={{ color: colors.danger }}>
            {error}
          </Text>
        </View>
      ) : null}

      <PillButton variant="primary" label={saving ? 'Saving…' : 'Save photo'} disabled={!picked || saving} onPress={() => void save()} />
    </ScrollView>
  );
}
