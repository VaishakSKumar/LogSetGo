import { useEffect, useState } from 'react';
import { Image, Keyboard, Text, TextInput, View } from 'react-native';

import { cuesFor } from '../../data/formCues';
import { haptic } from '../../lib/haptics';
import { parseYouTubeId } from '../../lib/media';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import type { Exercise } from '../../types';
import { PillButton } from '../ui';
import { YouTubeEmbed } from './YouTubeEmbed';

/** A bundled clip wins, then the exercise's video, then a link you pasted yourself. */
export function ExerciseMedia({ exercise }: { exercise: Exercise }) {
  const { data, actions } = useGym();
  const [link, setLink] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    setLink('');
    setError(false);
  }, [exercise.id]);

  const saved = data.exerciseVideos[exercise.id];
  const videoId = parseYouTubeId(exercise.youtubeUrl ?? saved ?? '');

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
  };

  return (
    <View className="overflow-hidden rounded-3xl border" style={{ backgroundColor: colors.surface, borderColor: colors.line }}>
      {exercise.localMedia != null ? (
        <Image accessibilityLabel={`${exercise.name} form guide`} source={exercise.localMedia} resizeMode="contain" style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }} />
      ) : videoId ? (
        <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}>
          <YouTubeEmbed id={videoId} />
        </View>
      ) : (
        <View className="gap-2 p-3">
          <Text className="text-meta text-muted">No form video yet. Paste a YouTube link to add one.</Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={link}
              onChangeText={(t) => {
                setLink(t);
                setError(false);
              }}
              accessibilityLabel="YouTube link"
              placeholder="https://youtu.be/…"
              placeholderTextColor={colors.ghost}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              className="h-11 flex-1 rounded-xl bg-fill px-3 text-body text-label"
              style={{ outlineStyle: 'none' } as never}
            />
            <PillButton compact label="Add video" onPress={save} />
          </View>
          {error ? (
            <Text className="text-caption" style={{ color: colors.danger }}>
              That isn’t a YouTube link.
            </Text>
          ) : null}
        </View>
      )}

      <View className="gap-1 p-3" accessibilityLabel="Form cues">
        {cuesFor(exercise).map((cue) => (
          <Text key={cue} className="text-body text-label">
            • {cue}
          </Text>
        ))}
      </View>

      {saved && exercise.youtubeUrl == null && exercise.localMedia == null ? (
        <View className="px-3 pb-3">
          <PillButton compact label="Remove video" onPress={() => actions.setExerciseVideo(exercise.id, null)} />
        </View>
      ) : null}
    </View>
  );
}
