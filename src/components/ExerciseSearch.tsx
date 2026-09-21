import { useMemo, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { haptic } from '../lib/haptics';
import { relativeDay } from '../lib/dates';
import { topSet } from '../lib/progress';
import { ghostSuffix, searchExercises, shouldOfferCreate, tidyName } from '../lib/search';
import { browseExercises } from '../lib/suggest';
import { fmtWeight } from '../lib/units';
import { useGym } from '../store/gym';
import { colors, motion } from '../theme';
import type { Exercise } from '../types';
import { CloseIcon, PlusIcon, SearchIcon } from './Icons';

const INPUT_FONT = { fontSize: 17, letterSpacing: -0.2, fontWeight: '400' } as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Highlights the part of the name you've typed so far. */
function Name({ name, query }: { name: string; query: string }) {
  const q = query.trim();
  const hit = q && name.toLowerCase().startsWith(q.toLowerCase()) ? q.length : 0;
  return (
    <Text className="text-h2 font-normal text-label" numberOfLines={1}>
      {hit > 0 ? <Text style={{ fontWeight: '700' }}>{name.slice(0, hit)}</Text> : null}
      {name.slice(hit)}
    </Text>
  );
}

export function ExerciseSearch({ open, onOpenChange }: Props) {
  const { exercises, recents, history, active, label, today, data, actions } = useGym();
  const [query, setQuery] = useState('');

  const recencyRank = useMemo(() => new Map(recents.map((r, i) => [r.id, i])), [recents]);
  const lastDate = useMemo(() => new Map(recents.map((r) => [r.id, r.lastDate])), [recents]);
  const browse = useMemo(() => browseExercises(exercises, recents, label), [exercises, recents, label]);

  const results = useMemo(() => (query.trim() ? searchExercises(query, exercises, recencyRank) : []), [query, exercises, recencyRank]);
  const ghost = ghostSuffix(query, results[0]);
  const canCreate = shouldOfferCreate(query, exercises, results);

  const setsToday = (id: string) => data.sessions[today]?.exercises[id]?.filter((r) => r.done).length ?? 0;

  const close = () => {
    setQuery('');
    onOpenChange(false);
    Keyboard.dismiss();
  };

  const choose = (ex: Exercise) => {
    haptic.tap();
    actions.selectExercise(ex.id);
    close();
  };

  const create = () => {
    const ex = actions.createExercise(tidyName(query));
    choose(ex);
  };

  const submit = () => {
    if (results[0]) choose(results[0]);
    else if (canCreate) create();
  };

  const subtitle = (ex: Exercise) => {
    const n = setsToday(ex.id);
    if (n > 0) return `${ex.group} · ${n} set${n > 1 ? 's' : ''} today`;
    const d = lastDate.get(ex.id);
    return d ? `${ex.group} · ${relativeDay(d, today)}` : ex.group;
  };

  const renderRow = (ex: Exercise, first: boolean) => {
    const last = history[ex.id]?.find((h) => h.date <= today);
    const top = last ? topSet(last) : null;
    return (
      <Pressable
        key={ex.id}
        accessibilityRole="button"
        accessibilityLabel={`${ex.name}${top ? `, last ${fmtWeight(top.weight, data.unit)} ${data.unit} for ${top.reps}` : ''}`}
        onPress={() => choose(ex)}
        className={`min-h-[56px] flex-row items-center px-4 py-2 active:bg-fill/70 ${first ? '' : 'border-t border-line'}`}
        style={first ? undefined : { borderTopColor: colors.line }}
      >
        <View className="flex-1 pr-3">
          <Name name={ex.name} query={query} />
          <Text className="text-caption text-muted/60">{subtitle(ex)}</Text>
        </View>
        {top ? (
          <View className="items-end">
            <Text className="text-body tabular-nums text-label">
              {fmtWeight(top.weight, data.unit)} <Text className="text-muted">{data.unit}</Text> × {top.reps}
            </Text>
            <Text className="text-caption text-muted/60">last time</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderSection = (title: string, items: Exercise[]) =>
    items.length ? (
      <View>
        <Text className="px-4 pb-1 pt-3 text-caption uppercase tracking-wider text-muted/60">{title}</Text>
        {items.map((ex, i) => renderRow(ex, i === 0))}
      </View>
    ) : null;

  return (
    <View>
      <View className="flex-row items-center gap-3">
        <View
          className="h-12 flex-1 flex-row items-center rounded-full border border-line bg-surface px-4"
          style={{ borderColor: open ? 'rgba(255,255,255,0.25)' : colors.line }}
        >
          <SearchIcon />
          <View className="ml-3 h-12 flex-1 justify-center">
            {open && ghost ? (
              <View pointerEvents="none" className="absolute inset-0 justify-center" style={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <Text numberOfLines={1} style={INPUT_FONT}>
                  <Text style={{ opacity: 0 }}>{query}</Text>
                  <Text style={{ color: colors.ghost }}>{ghost}</Text>
                </Text>
              </View>
            ) : null}
            <TextInput
              value={open ? query : (active?.name ?? '')}
              onChangeText={setQuery}
              onFocus={() => onOpenChange(true)}
              onSubmitEditing={submit}
              placeholder={open ? 'Search exercises' : 'Choose an exercise'}
              placeholderTextColor={colors.ghost}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              selectionColor={colors.accent}
              accessibilityLabel="Exercise search"
              style={[INPUT_FONT, { height: 48, padding: 0, color: colors.label, outlineStyle: 'none' } as never]}
            />
          </View>
          {open && query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear" hitSlop={12} onPress={() => setQuery('')}>
              <CloseIcon size={16} />
            </Pressable>
          ) : null}
        </View>
        {open ? (
          <Pressable accessibilityRole="button" onPress={close} hitSlop={8} className="active:opacity-60">
            <Text className="text-body text-label">Cancel</Text>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(motion.duration)}
          style={{
            marginTop: 12,
            overflow: 'hidden',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            paddingBottom: 4,
          }}
        >
          {query.trim() ? (
            <>
              {results.map((ex, i) => renderRow(ex, i === 0))}
              {canCreate ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={create}
                  className={`min-h-[56px] flex-row items-center gap-3 px-4 active:bg-fill/70 ${results.length ? 'border-t border-line' : ''}`}
                >
                  <PlusIcon size={18} color={colors.accent} />
                  <Text className="text-h2 font-normal text-label" numberOfLines={1}>
                    Add “{tidyName(query)}”
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              {renderSection('Recent', browse.recent)}
              {renderSection(browse.recent.length ? 'Suggested' : `Suggested for ${label}`, browse.suggested)}
            </>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}
