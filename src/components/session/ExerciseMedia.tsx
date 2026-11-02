import { useEffect, useState } from 'react';
import { Image, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { cuesFor } from '../../data/formCues';
import { haptic } from '../../lib/haptics';
import { parseYouTubeId } from '../../lib/media';
import { MAX_PHOTO_MB, PHOTO_FORMATS } from '../../lib/photoCheck';
import { chooseFile, loadFormImages, photoDisplayUri, removeFormImage, saveFormImage } from '../../lib/photos';
import { useGym } from '../../store/gym';
import { colors, fonts } from '../../theme';
import type { Exercise } from '../../types';
import { PlayCircleIcon } from '../Icons';
import { Sheet } from '../Sheet';
import { YouTubeEmbed } from './YouTubeEmbed';

const MEDIA_HEIGHT = 182;

/** A bundled clip wins, then the exercise's video, then a link or image you added yourself. */
export function ExerciseMedia({ exercise }: { exercise: Exercise }) {
  const { data, actions } = useGym();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [link, setLink] = useState('');
  const [error, setError] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLink('');
    setError(false);
    setFileError(null);
    setImageUri(null);
    void (async () => {
      const image = (await loadFormImages())[exercise.id];
      const uri = image ? await photoDisplayUri(image) : null;
      if (!cancelled) setImageUri(uri);
    })();
    return () => {
      cancelled = true;
    };
  }, [exercise.id]);

  const saved = data.exerciseVideos[exercise.id];
  const videoId = parseYouTubeId(exercise.youtubeUrl ?? saved ?? '');
  const removable = exercise.localMedia == null && exercise.youtubeUrl == null && (!!saved || !!imageUri);
  const empty = exercise.localMedia == null && !videoId && !imageUri;

  const save = () => {
    if (!parseYouTubeId(link)) {
      haptic.warn();
      setError(true);
      return;
    }
    haptic.tap();
    // the link box unmounts on save, and Android would move focus to the exercise search
    Keyboard.dismiss();
    actions.setExerciseVideo(exercise.id, link.trim());
    setSheetOpen(false);
  };

  const upload = async () => {
    const picked = await chooseFile();
    if (!picked.ok) {
      if (!picked.cancelled) {
        haptic.warn();
        setFileError(picked.error ?? 'Couldn’t use that file.');
      }
      return;
    }
    try {
      const image = await saveFormImage(picked.photo, exercise.id);
      haptic.tap();
      setImageUri(await photoDisplayUri(image));
      setFileError(null);
    } catch (e) {
      haptic.warn();
      setFileError(e instanceof Error ? e.message : 'Couldn’t save that file. Try again.');
    }
  };

  const remove = () => {
    haptic.tap();
    if (saved) actions.setExerciseVideo(exercise.id, null);
    if (imageUri) void removeFormImage(exercise.id);
    setImageUri(null);
  };

  return (
    <View>
      <View
        accessibilityLabel="Form demo"
        className="overflow-hidden"
        style={{ height: MEDIA_HEIGHT, borderRadius: 18, borderWidth: 1.5, borderStyle: empty ? 'dashed' : 'solid', borderColor: empty ? colors.handle : colors.border, backgroundColor: colors.panel }}
      >
        {exercise.localMedia != null ? (
          <Image accessibilityLabel={`${exercise.name} form guide`} source={exercise.localMedia} resizeMode="contain" style={{ width: '100%', height: '100%', backgroundColor: '#000' }} />
        ) : videoId ? (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <YouTubeEmbed id={videoId} />
          </View>
        ) : imageUri ? (
          <Image accessibilityLabel={`${exercise.name} form demo`} source={{ uri: imageUri }} resizeMode="contain" style={{ width: '100%', height: '100%', backgroundColor: '#000' }} />
        ) : (
          <View className="flex-1 items-center justify-center" style={{ padding: 12, gap: 4 }}>
            <PlayCircleIcon />
            <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 }}>No form demo yet</Text>
            <View className="flex-row" style={{ alignSelf: 'stretch', marginTop: 6, gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Paste YouTube link"
                onPress={() => {
                  haptic.tap();
                  setLink('');
                  setError(false);
                  setFileError(null);
                  setSheetOpen(true);
                }}
                className="flex-1 items-center justify-center active:opacity-80"
                style={{ height: 44, borderRadius: 12, backgroundColor: colors.accent }}
              >
                <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 14 }}>Paste YouTube link</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload GIF or image"
                onPress={() => void upload()}
                className="flex-1 items-center justify-center active:opacity-70"
                style={{ height: 44, borderRadius: 12, backgroundColor: colors.control }}
              >
                <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 14 }}>Upload GIF or image</Text>
              </Pressable>
            </View>
            <Text accessibilityLiveRegion="polite" className="text-center" style={{ marginTop: 4, color: fileError ? colors.dangerText : colors.secondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
              {fileError ?? `Uploads: ${PHOTO_FORMATS}, up to ${MAX_PHOTO_MB} MB`}
            </Text>
          </View>
        )}
        {removable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove"
            onPress={remove}
            className="items-center justify-center active:opacity-70"
            style={{ position: 'absolute', top: 6, right: 6, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.72)' }}
          >
            <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 14 }}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      <View accessibilityLabel="Form cues" style={{ marginTop: 12 }}>
        <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 }}>Form Cue</Text>
        {cuesFor(exercise).map((cue) => (
          <Text key={cue} style={{ marginTop: 2, color: '#fff', fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 }}>
            • {cue}
          </Text>
        ))}
      </View>

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Add a YouTube video" display>
        <View className="px-4 pb-1">
          <Text style={{ marginBottom: 14, color: colors.secondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>It plays here every time you do {exercise.name}.</Text>
          <Text style={{ marginBottom: 8, color: '#fff', fontFamily: fonts.semibold, fontSize: 15 }}>YouTube link</Text>
          <TextInput
            value={link}
            onChangeText={(t) => {
              setLink(t);
              setError(false);
            }}
            accessibilityLabel="YouTube link"
            placeholder="Paste the link here"
            placeholderTextColor={colors.ghost}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[
              { height: 56, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 14, borderColor: error ? '#FF6B5E' : colors.border, backgroundColor: colors.raised, color: '#fff', fontFamily: fonts.regular, fontSize: 16 },
              { outlineStyle: 'none' } as never,
            ]}
          />
          <Text accessibilityLiveRegion="polite" style={{ marginTop: 8, minHeight: 20, color: colors.dangerText, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
            {error ? 'That is not a YouTube video link.' : ''}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Add video" onPress={save} className="items-center justify-center active:opacity-80" style={{ height: 56, marginTop: 8, borderRadius: 14, backgroundColor: colors.accent }}>
            <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 18 }}>Add video</Text>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}
