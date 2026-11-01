import { useEffect, useState, type ReactNode } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

import { monthTitle } from '../../lib/calendar';
import { haptic } from '../../lib/haptics';
import { MAX_PHOTO_MB, PHOTO_FORMATS, needsMonthlyPhoto, previousPhoto } from '../../lib/photoCheck';
import { chooseFile, loadPhotos, photoDisplayUri, savePhoto, takePhoto, type PhotoPick, type PickedPhoto } from '../../lib/photos';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import type { MonthlyPhoto } from '../../types';
import { PillButton } from '../ui';

function Slot({ title, uri, empty, children }: { title: string; uri: string | null; empty: string; children?: ReactNode }) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-center text-meta text-muted">{title}</Text>
      <View className="items-center justify-center overflow-hidden rounded-2xl border" style={{ aspectRatio: 3 / 4, backgroundColor: colors.surface, borderColor: colors.line }}>
        {uri ? <Image accessibilityLabel={title} source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Text className="px-3 text-center text-caption text-muted">{empty}</Text>}
      </View>
      {children}
    </View>
  );
}

/**
 * The first workout of each calendar month opens with a progress photo: last month's on the left,
 * a new one on the right. Nothing behind it can be used until a valid photo is saved.
 */
export function MonthlyPhotoGate({ children }: { children: ReactNode }) {
  const { today, realToday } = useGym();
  const [photos, setPhotos] = useState<Record<string, MonthlyPhoto> | null>(null);
  const [lastUri, setLastUri] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadPhotos();
      const last = previousPhoto(stored, realToday);
      const uri = last ? await photoDisplayUri(last) : null;
      if (cancelled) return;
      setLastUri(uri);
      setPhotos(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [realToday]);

  if (today !== realToday) return <>{children}</>;
  if (!photos) return <View className="flex-1 bg-base" />;
  if (!needsMonthlyPhoto(photos, realToday)) return <>{children}</>;

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
      const photo = await savePhoto(picked, realToday);
      haptic.success();
      setPhotos({ ...photos, [realToday]: photo });
    } catch (e) {
      haptic.warn();
      setError(e instanceof Error ? e.message : 'Couldn’t save that photo. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-base" accessibilityLabel="Monthly photo check-in" contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1, justifyContent: 'center' }}>
      <View>
        <Text className="text-caption uppercase tracking-wider text-muted/60">{monthTitle(realToday)}</Text>
        <Text className="py-1 text-h1 text-label">Monthly check-in</Text>
        <Text className="text-body text-muted">Add this month’s progress photo to start your workout. It stays on this device.</Text>
      </View>

      <View className="flex-row" style={{ gap: 12 }}>
        <Slot title="Last Month’s Photo" uri={lastUri} empty="No earlier photo yet" />
        <Slot title="This Month" uri={picked?.uri ?? null} empty="Your new photo">
          <PillButton compact variant="white" label={picked ? 'Retake' : 'Take photo'} onPress={() => void take(takePhoto)} className="mt-2" />
        </Slot>
      </View>

      <PillButton compact label="Choose a file" onPress={() => void take(chooseFile)} />
      <Text className="text-center text-caption text-muted">
        {PHOTO_FORMATS}, up to {MAX_PHOTO_MB} MB
      </Text>

      {error ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" className="rounded-2xl border p-3" style={{ borderColor: colors.danger }}>
          <Text className="text-body" style={{ color: colors.danger }}>
            {error}
          </Text>
        </View>
      ) : null}

      <PillButton variant="primary" label={saving ? 'Saving…' : 'Save and start workout'} disabled={!picked || saving} onPress={() => void save()} />
    </ScrollView>
  );
}
