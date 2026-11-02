import { useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { haptic } from '../lib/haptics';
import { relativeDay } from '../lib/dates';
import { fmtSet, topSet } from '../lib/progress';
import { ghostSuffix, searchExercises, shouldOfferCreate, tidyName } from '../lib/search';
import { browseExercises } from '../lib/suggest';
import { fmtWeight } from '../lib/units';
import { useGym } from '../store/gym';
import { colors, fonts, motion } from '../theme';
import type { Equipment, Exercise, MuscleGroup } from '../types';
import { CloseIcon, PlusIcon, SearchIcon } from './Icons';

const GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Other'];

const EQUIPMENT: Equipment[] = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Cardio'];

/** How many rows a typed search or an equipment filter lists at once. */
const LIST_LIMIT = 30;

const INPUT_FONT = { fontSize: 17, fontFamily: fonts.medium } as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hero use (nothing logged yet): a "type an exercise" prompt instead of "Choose an exercise". */
  hero?: boolean;
  /** Show the selected exercise's name while closed. Off in the hero until you've picked one today. */
  showSelected?: boolean;
  /** "sheet": the elevated #2C2C2E field used inside the recorder drawer. */
  variant?: 'default' | 'sheet';
}

/** Highlights the part of the name you've typed so far. */
function Name({ name, query }: { name: string; query: string }) {
  const q = query.trim();
  const hit = q && name.toLowerCase().startsWith(q.toLowerCase()) ? q.length : 0;
  return (
    <Text className="text-h2 font-normal text-label" numberOfLines={1}>
      {hit > 0 ? <Text style={{ fontFamily: fonts.bold }}>{name.slice(0, hit)}</Text> : null}
      {name.slice(hit)}
    </Text>
  );
}

export function ExerciseSearch({ open, onOpenChange, hero = false, showSelected = true, variant = 'default' }: Props) {
  const { exercises, recents, history, active, label, today, data, actions } = useGym();
  const fieldHeight = hero ? 60 : 48;
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  /** name waiting for a muscle group (custom exercise being created) */
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const recencyRank = useMemo(() => new Map(recents.map((r, i) => [r.id, i])), [recents]);
  const lastDate = useMemo(() => new Map(recents.map((r) => [r.id, r.lastDate])), [recents]);
  const browse = useMemo(() => browseExercises(exercises, recents, label), [exercises, recents, label]);

  const pool = useMemo(() => (equipment ? exercises.filter((e) => e.equipment === equipment) : exercises), [exercises, equipment]);
  const results = useMemo(() => (query.trim() ? searchExercises(query, pool, recencyRank, LIST_LIMIT) : []), [query, pool, recencyRank]);
  const ghost = ghostSuffix(query, results[0]);
  const canCreate = shouldOfferCreate(query, exercises, results);

  const setsToday = (id: string) => data.sessions[today]?.exercises[id]?.filter((r) => r.done).length ?? 0;

  const close = () => {
    setPendingName(null);
    setQuery('');
    setEquipment(null);
    onOpenChange(false);
    Keyboard.dismiss();
  };

  const choose = (ex: Exercise) => {
    haptic.tap();
    actions.selectExercise(ex.id);
    close();
  };

  /** What the field currently shows: what you're typing, or the selected exercise's name while closed. */
  const shownText = open ? query : showSelected ? (active?.name ?? '') : '';

  /**
   * The ✕: empties the field right away and leaves you in it, ready to type. It never closes anything
   * around it, and it doesn't touch the selected exercise until you pick another one.
   */
  const clear = () => {
    haptic.tap();
    setPendingName(null);
    setQuery('');
    onOpenChange(true);
    inputRef.current?.focus();
  };

  const create = () => setPendingName(tidyName(query));
  const createWithGroup = (group: MuscleGroup) => {
    const ex = actions.createExercise(pendingName ?? tidyName(query), group);
    setPendingName(null);
    choose(ex);
  };

  const submit = () => {
    if (results[0]) choose(results[0]);
    else if (canCreate) create();
  };

  const subtitle = (ex: Exercise) => {
    const n = setsToday(ex.id);
    const kind = ex.equipment && ex.equipment !== ex.group ? `${ex.group} · ${ex.equipment}` : ex.group;
    if (n > 0) return `${kind} · ${n} set${n > 1 ? 's' : ''} today`;
    const d = lastDate.get(ex.id);
    return d ? `${kind} · ${relativeDay(d, today)}` : kind;
  };

  const renderRow = (ex: Exercise, first: boolean) => {
    const last = history[ex.id]?.find((h) => h.date <= today);
    const top = last ? topSet(last) : null;
    return (
      <Pressable
        key={ex.id}
        accessibilityRole="button"
        accessibilityLabel={`${ex.name}${top ? `, last ${top.weight > 0 ? `${fmtWeight(top.weight, data.unit)} ${data.unit} for ${top.reps}` : `${top.reps} reps`}` : ''}`}
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
              {top.weight > 0 ? (
                <>
                  {fmtWeight(top.weight, data.unit)} <Text className="text-muted">{data.unit}</Text> × {top.reps}
                </>
              ) : (
                fmtSet(top, data.unit)
              )}
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
          className="flex-1 flex-row items-center"
          style={{
            height: fieldHeight,
            paddingLeft: 14,
            borderRadius: 14,
            borderWidth: variant === 'sheet' ? 0 : 1.5,
            borderColor: open ? colors.accentBorder : colors.border,
            backgroundColor: variant === 'sheet' ? colors.fill : colors.panel,
            paddingRight: shownText.length > 0 ? 44 : 16,
          }}
        >
          <SearchIcon size={22} color="#fff" stroke={2.2} />
          <View className="ml-3 flex-1 justify-center" style={{ height: fieldHeight }}>
            {open && ghost ? (
              <View pointerEvents="none" className="absolute inset-0 justify-center" style={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                <Text numberOfLines={1} style={INPUT_FONT}>
                  <Text style={{ opacity: 0 }}>{query}</Text>
                  <Text style={{ color: colors.ghost }}>{ghost}</Text>
                </Text>
              </View>
            ) : null}
            <TextInput
              ref={inputRef}
              value={shownText}
              onChangeText={setQuery}
              onFocus={() => onOpenChange(true)}
              onSubmitEditing={submit}
              placeholder="Search exercises"
              placeholderTextColor={colors.ghost}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              selectionColor={colors.accent}
              accessibilityLabel="Exercise search"
              style={[INPUT_FONT, { height: fieldHeight, padding: 0, color: colors.label, outlineStyle: 'none' } as never]}
            />
          </View>
          {shownText.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={clear}
              className="items-center justify-center active:opacity-60"
              style={{ position: 'absolute', right: 6, top: 0, bottom: 0, width: 36 }}
            >
              <CloseIcon size={16} color={colors.muted} />
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
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.panel,
            paddingBottom: 4,
          }}
        >
          {pendingName ? null : (
            <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingTop: 12 }}>
              {EQUIPMENT.map((e) => {
                const on = equipment === e;
                return (
                  <Pressable
                    key={e}
                    accessibilityRole="button"
                    accessibilityLabel={`${e} exercises`}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      haptic.tap();
                      setEquipment(on ? null : e);
                    }}
                    className="h-9 items-center justify-center rounded-full px-3 active:opacity-70"
                    style={{ backgroundColor: on ? colors.accent : colors.fill }}
                  >
                    <Text className="text-meta font-medium" style={{ color: on ? '#000' : colors.label }}>
                      {e}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {pendingName ? (
            <View className="p-4">
              <Text className="text-h2 text-label">Which muscle group is “{pendingName}”?</Text>
              <Text className="mb-3 mt-1 text-caption text-muted/70">Used for your muscle-balance stats and day suggestions.</Text>
              <View className="flex-row flex-wrap gap-2">
                {GROUPS.map((g) => (
                  <Pressable
                    key={g}
                    accessibilityRole="button"
                    onPress={() => createWithGroup(g)}
                    className="h-11 items-center justify-center rounded-full bg-fill px-4 active:opacity-70"
                  >
                    <Text className="text-body font-medium text-label">{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : query.trim() ? (
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
          ) : equipment ? (
            renderSection(pool.length > LIST_LIMIT ? `${LIST_LIMIT} of ${pool.length}. Type to narrow` : equipment, pool.slice(0, LIST_LIMIT))
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
