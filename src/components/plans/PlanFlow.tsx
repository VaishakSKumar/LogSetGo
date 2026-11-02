import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../../lib/haptics';
import { pickPlanFile } from '../../lib/planFile';
import {
  DEFAULT_PLAN_SETS,
  MAX_PLAN_MB,
  MAX_PLAN_SETS,
  MIN_PLAN_SETS,
  exerciseCount,
  matchRows,
  newPlan,
  planDetail,
  planNameFromFile,
  type MatchedRow,
} from '../../lib/plans';
import { hasExactName, searchExercises } from '../../lib/search';
import { useGym } from '../../store/gym';
import { colors, fonts } from '../../theme';
import type { Exercise } from '../../types';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, FileIcon, InfoIcon, PencilIcon, PlusIcon, SearchIcon, UploadIcon } from '../Icons';
import { PillButton } from '../ui';

type Way = 'manual' | 'file';
type Stage = 'choose' | 'info' | 'builder' | 'picker' | 'import';

const COPY: Record<Way, { way: string; title: string; action: string; steps: [string, string][] }> = {
  manual: {
    way: 'Add manually',
    title: 'Build your\nown plan',
    action: 'Start my plan',
    steps: [
      ['Name your plan', 'Use a name you will recognise, like Push Day.'],
      ['Add exercises', 'Search the list. Add your own if it is missing.'],
      ['Set your sets', 'Choose how many sets for each exercise.'],
      ['Save and train', 'Your plan appears on Gym Progress. Tap it to start.'],
    ],
  },
  file: {
    way: 'Import from a file',
    title: 'Bring your\nplan in',
    action: 'Choose my file',
    steps: [
      ['Set up your file', 'One row for each exercise, with sets and reps.'],
      ['Upload it', `Excel (.xlsx), CSV or .txt, up to ${MAX_PLAN_MB} MB.`],
      ['Check the list', 'We match each name to an exercise before saving.'],
    ],
  },
};

const heading = (size: number) => ({ color: '#fff', fontFamily: fonts.display, fontSize: size, lineHeight: size + 6 });

function CloseButton({ label, onPress, children }: { label: string; onPress: () => void; children?: ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="items-center justify-center active:opacity-60" style={{ width: 44, height: 44, marginRight: -8 }}>
      {children ?? <CloseIcon size={18} color="#fff" />}
    </Pressable>
  );
}

function SheetFrame({ title, right, children }: { title: string; right: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1" style={{ paddingTop: 44 + insets.top, backgroundColor: '#000' }}>
      <View className="flex-1" style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 + insets.bottom, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.panel }}>
        <View style={{ alignSelf: 'center', width: 36, height: 4, marginBottom: 6, borderRadius: 2, backgroundColor: colors.handle }} />
        <View className="flex-row items-center justify-between">
          <Text accessibilityRole="header" style={heading(34)}>
            {title}
          </Text>
          {right}
        </View>
        {children}
      </View>
    </View>
  );
}

function NameField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>Plan name</Text>
      <TextInput
        accessibilityLabel="Plan name"
        value={value}
        onChangeText={onChange}
        placeholder="For example, Push Day"
        placeholderTextColor={colors.muted}
        maxLength={60}
        style={{ height: 52, marginTop: 4, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.raised, color: '#fff', fontFamily: fonts.semibold, fontSize: 17 }}
      />
    </View>
  );
}

/* ── Choose ── */

function Choice({ icon, title, detail, onPress }: { icon: ReactNode; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} className="flex-row items-center active:opacity-70" style={{ padding: 14, gap: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.raised }}>
      <View className="items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.fill }}>
        {icon}
      </View>
      <View className="flex-1">
        <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 }}>{title}</Text>
        <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>{detail}</Text>
      </View>
      <ChevronRightIcon size={18} color={colors.muted} stroke={2.4} />
    </Pressable>
  );
}

function ChooseStage({ onPick, onClose }: { onPick: (way: Way) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 justify-end">
      <Pressable accessibilityLabel="Close new plan" onPress={onClose} className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 + insets.bottom, gap: 10, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.panel }}>
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.handle }} />
        <View className="flex-row items-center justify-between">
          <Text accessibilityRole="header" style={heading(36)}>
            New workout plan
          </Text>
          <CloseButton label="Close" onPress={onClose} />
        </View>
        <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>How do you want to add your plan?</Text>
        <Choice icon={<PencilIcon size={24} color={colors.accent} />} title="Add manually" detail="Search and pick each exercise" onPress={() => onPick('manual')} />
        <Choice icon={<FileIcon size={24} color={colors.accent} />} title="Import from a file" detail="Excel, CSV or .txt" onPress={() => onPick('file')} />
      </View>
    </View>
  );
}

/* ── Info ── */

function InfoStage({ way, onBack, onNext }: { way: Way; onBack: () => void; onNext: (hide: boolean) => void }) {
  const { data } = useGym();
  const insets = useSafeAreaInsets();
  const copy = COPY[way];
  const [hide, setHide] = useState(data.prefs.hidePlanInfo[way]);

  const line = { color: '#fff', fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, fontVariant: ['tabular-nums'] as 'tabular-nums'[] };
  const grid = [
    ['Barbell Bench Press', '4', '10'],
    ['Cable Fly', '3', '12'],
  ];

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 14 + insets.bottom }}>
      <View className="flex-row items-center justify-between" style={{ height: 44 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} className="items-center justify-center active:opacity-60" style={{ width: 44, height: 44, marginLeft: -10 }}>
          <ChevronLeftIcon size={22} color="#fff" stroke={2.4} />
        </Pressable>
        <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14 }}>{copy.way}</Text>
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 6, marginBottom: 14, color: '#fff', fontFamily: fonts.display, fontSize: 52, lineHeight: 52, textTransform: 'uppercase' }}>
        {copy.title}
      </Text>
      <View style={{ gap: 12 }}>
        {copy.steps.map(([title, text], i) => (
          <View key={title} className="flex-row" style={{ gap: 12 }}>
            <View className="items-center justify-center" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent }}>
              <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 15 }}>{i + 1}</Text>
            </View>
            <View className="flex-1">
              <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 }}>{title}</Text>
              <Text style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>{text}</Text>
            </View>
          </View>
        ))}
      </View>

      {way === 'file' ? (
        <View accessibilityLabel="Example file" style={{ marginTop: 14, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
          <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 }}>Excel or CSV columns</Text>
          <View className="flex-row" style={{ marginTop: 4, gap: 8 }}>
            <Text className="flex-1" style={[line, { fontFamily: fonts.bold }]}>
              Exercise
            </Text>
            <Text style={[line, { width: 44, fontFamily: fonts.bold }]}>Sets</Text>
            <Text style={[line, { width: 44, fontFamily: fonts.bold }]}>Reps</Text>
          </View>
          {grid.map(([name, sets, reps]) => (
            <View key={name} className="flex-row" style={{ gap: 8 }}>
              <Text className="flex-1" style={line}>
                {name}
              </Text>
              <Text style={[line, { width: 44 }]}>{sets}</Text>
              <Text style={[line, { width: 44 }]}>{reps}</Text>
            </View>
          ))}
          <Text style={{ marginTop: 8, color: colors.secondary, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 }}>.txt, one exercise on each line</Text>
          <Text style={line}>Barbell Bench Press, 4, 10</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hide }}
        accessibilityLabel="Don’t show this again"
        onPress={() => setHide((h) => !h)}
        className="flex-row items-center"
        style={{ minHeight: 44, marginTop: 'auto', gap: 10 }}
      >
        <View className="items-center justify-center" style={{ width: 24, height: 24, borderRadius: 6, borderWidth: hide ? 0 : 1.5, borderColor: colors.handle, backgroundColor: hide ? colors.accent : 'transparent' }}>
          {hide ? <CheckIcon size={16} color="#000" /> : null}
        </View>
        <Text style={{ color: '#fff', fontFamily: fonts.medium, fontSize: 15 }}>Don’t show this again</Text>
      </Pressable>
      <View style={{ marginTop: 6 }}>
        <PillButton variant="primary" label={copy.action} onPress={() => onNext(hide)} />
      </View>
    </ScrollView>
  );
}

/* ── Builder ── */

interface DraftItem {
  exercise: Exercise;
  sets: number;
}

function BuilderStage({ name, onName, items, onItems, onAdd, onClose, onSave }: { name: string; onName: (s: string) => void; items: DraftItem[]; onItems: (next: DraftItem[]) => void; onAdd: () => void; onClose: () => void; onSave: () => void }) {
  const change = (id: string, delta: number) =>
    onItems(items.map((it) => (it.exercise.id === id ? { ...it, sets: Math.min(MAX_PLAN_SETS, Math.max(MIN_PLAN_SETS, it.sets + delta)) } : it)));

  const stepper = { width: 40, height: 44 };
  const stepText = { color: '#fff', fontFamily: fonts.regular, fontSize: 22 };

  return (
    <SheetFrame title="New workout plan" right={<CloseButton label="Close" onPress={onClose} />}>
      <NameField value={name} onChange={onName} />
      <View className="flex-row items-center justify-between" style={{ marginTop: 14 }}>
        <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>Exercises</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.semibold, fontSize: 14 }}>{exerciseCount(items.length)}</Text>
      </View>
      <ScrollView className="flex-1" style={{ marginTop: 6 }} keyboardShouldPersistTaps="handled">
        {items.map(({ exercise, sets }) => (
          <View key={exercise.id} className="flex-row items-center" style={{ minHeight: 68, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <View className="flex-1">
              <Text numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>
                {exercise.name}
              </Text>
              <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{exercise.group}</Text>
            </View>
            <View className="flex-row items-center justify-between" style={{ width: 116, height: 44, borderRadius: 12, backgroundColor: colors.fill }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Fewer sets of ${exercise.name}`} onPress={() => change(exercise.id, -1)} className="items-center justify-center" style={stepper}>
                <Text style={stepText}>−</Text>
              </Pressable>
              <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 14, fontVariant: ['tabular-nums'] }}>{sets} sets</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`More sets of ${exercise.name}`} onPress={() => change(exercise.id, 1)} className="items-center justify-center" style={stepper}>
                <Text style={stepText}>+</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${exercise.name}`} onPress={() => onItems(items.filter((it) => it.exercise.id !== exercise.id))} className="items-center justify-center active:opacity-60" style={{ width: 36, height: 44, marginRight: -8 }}>
              <CloseIcon size={16} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={onAdd} className="flex-row items-center justify-center active:opacity-60" style={{ height: 48, marginTop: 6, gap: 6 }}>
          <PlusIcon size={18} color={colors.accent} stroke={2.6} />
          <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 15 }}>Add exercise</Text>
        </Pressable>
      </ScrollView>
      <View style={{ marginTop: 8 }}>
        <PillButton variant="primary" label="Save plan" disabled={!name.trim() || !items.length} onPress={onSave} />
      </View>
    </SheetFrame>
  );
}

function PickerStage({ taken, onPick, onBack }: { taken: Set<string>; onPick: (exercise: Exercise) => void; onBack: () => void }) {
  const { exercises, recents, actions } = useGym();
  const [query, setQuery] = useState('');
  const rank = useMemo(() => new Map(recents.map((r, i) => [r.id, i])), [recents]);
  const typed = query.trim();
  const results = useMemo(() => (typed ? searchExercises(typed, exercises, rank, 30) : exercises.slice(0, 30)).filter((e) => !taken.has(e.id)), [typed, exercises, rank, taken]);

  return (
    <SheetFrame
      title="Add exercise"
      right={
        <CloseButton label="Back to plan" onPress={onBack}>
          <CloseIcon size={18} color="#fff" />
        </CloseButton>
      }
    >
      <View className="flex-row items-center" style={{ height: 52, marginTop: 6, paddingHorizontal: 14, gap: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.raised }}>
        <SearchIcon size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search exercises"
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor={colors.muted}
          className="flex-1"
          style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 17 }}
        />
      </View>
      <FlatList
        style={{ flex: 1, marginTop: 6 }}
        data={results}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          typed && !hasExactName(typed, exercises) ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Add ${typed} as a new exercise`} onPress={() => onPick(actions.createExercise(typed))} className="flex-row items-center active:opacity-60" style={{ minHeight: 52, gap: 6 }}>
              <PlusIcon size={18} color={colors.accent} stroke={2.6} />
              <Text numberOfLines={1} className="shrink" style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 15 }}>
                Add “{typed}” as new
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => onPick(item)} className="justify-center active:opacity-60" style={{ minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>
              {item.name}
            </Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{item.group}</Text>
          </Pressable>
        )}
      />
    </SheetFrame>
  );
}

/* ── Import ── */

export interface PlanReview {
  file: string;
  name: string;
  rows: MatchedRow[];
}

function ImportStage({ review, onReview, onInfo, onClose, onSave }: { review: PlanReview | null; onReview: (next: PlanReview | null) => void; onInfo: () => void; onClose: () => void; onSave: () => void }) {
  const { exercises } = useGym();
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const choose = async () => {
    setReading(true);
    const result = await pickPlanFile();
    setReading(false);
    if (result.ok) {
      haptic.success();
      setError(null);
      onReview({ file: result.name, name: planNameFromFile(result.name), rows: matchRows(result.rows, exercises) });
    } else if (!result.cancelled) {
      haptic.warn();
      setError(result.error ?? 'Couldn’t read that file.');
    }
  };

  const open = review ? review.rows.filter((r) => !r.exercise && !r.addNew).length : 0;

  return (
    <SheetFrame
      title="Import your plan"
      right={
        <CloseButton label="How to set up your file" onPress={onInfo}>
          <InfoIcon size={22} color="#fff" />
        </CloseButton>
      }
    >
      {review ? (
        <>
          <Text numberOfLines={1} style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
            {review.file} · {exerciseCount(review.rows.length)} found
          </Text>
          <NameField value={review.name} onChange={(name) => onReview({ ...review, name })} />
          <ScrollView className="flex-1" style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
            {review.rows.map((row, i) => {
              const missing = !row.exercise && !row.addNew;
              return (
                <View key={row.name} className="flex-row items-center" style={{ minHeight: 56, paddingVertical: 6, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <View className="items-center justify-center" style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: missing ? colors.holiday : colors.accent }}>
                    {missing ? <Text style={{ color: '#000', fontFamily: fonts.bold, fontSize: 14 }}>!</Text> : <CheckIcon size={14} color="#000" />}
                  </View>
                  <View className="flex-1">
                    <Text numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>
                      {row.exercise?.name ?? row.name}
                    </Text>
                    <Text style={{ color: missing ? colors.holiday : colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
                      {missing ? 'Not in our list' : `${planDetail(row.sets, row.reps)}${row.addNew ? ' · New' : ''}`}
                    </Text>
                  </View>
                  {missing ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${row.name} as new`}
                      onPress={() => onReview({ ...review, rows: review.rows.map((r, n) => (n === i ? { ...r, addNew: true } : r)) })}
                      className="items-center justify-center active:opacity-70"
                      style={{ height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.fill }}
                    >
                      <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 14 }}>Add as new</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
          {open ? (
            <Text accessibilityLiveRegion="polite" className="text-center" style={{ marginTop: 8, color: colors.holiday, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
              Sort out the {open === 1 ? 'exercise' : `${open} exercises`} we could not match to save.
            </Text>
          ) : null}
          <View style={{ marginTop: open ? 6 : 8 }}>
            <PillButton variant="primary" label="Save plan" disabled={!!open || !review.name.trim()} onPress={onSave} />
          </View>
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a file"
            disabled={reading}
            onPress={() => void choose()}
            className="flex-1 items-center justify-center active:opacity-70"
            style={{ marginTop: 8, padding: 16, gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.handle, borderRadius: 18 }}
          >
            <UploadIcon size={40} color={colors.accent} />
            <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 18 }}>{reading ? 'Reading…' : 'Choose a file'}</Text>
            <Text className="text-center" style={{ color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
              Excel (.xlsx), CSV or .txt, up to {MAX_PLAN_MB} MB
            </Text>
          </Pressable>
          {error ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" className="rounded-2xl border p-3" style={{ marginTop: 8, borderColor: colors.danger }}>
              <Text className="text-body" style={{ color: colors.danger }}>
                {error}
              </Text>
            </View>
          ) : null}
          <View style={{ marginTop: 8 }}>
            <PillButton compact label="Cancel" onPress={onClose} />
          </View>
        </>
      )}
    </SheetFrame>
  );
}

/* ── The flow ── */

/**
 * + on Gym Progress: pick manual or file, read the info screen once, then build or import. Saving only
 * adds a plan. Nothing is logged until a plan is started and its sets are ticked.
 */
export function PlanFlow({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, actions } = useGym();
  const [stage, setStage] = useState<Stage>('choose');
  const [way, setWay] = useState<Way>('manual');
  const [name, setName] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [review, setReview] = useState<PlanReview | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStage('choose');
    setName('');
    setItems([]);
    setReview(null);
  }, [visible]);

  const taken = useMemo(() => new Set(items.map((it) => it.exercise.id)), [items]);
  const workStage: Stage = way === 'manual' ? 'builder' : 'import';

  const pick = (next: Way) => {
    haptic.tap();
    setWay(next);
    setStage(data.prefs.hidePlanInfo[next] ? (next === 'manual' ? 'builder' : 'import') : 'info');
  };

  const leaveInfo = (hide: boolean) => {
    actions.setPrefs({ hidePlanInfo: { ...data.prefs.hidePlanInfo, [way]: hide } });
    setStage(workStage);
  };

  const finish = (planName: string, planItems: { exerciseId: string; sets: number; reps?: number }[]) => {
    haptic.success();
    actions.addRoutine(newPlan(planName, planItems));
    onClose();
  };

  const saveBuilt = () => finish(name, items.map((it) => ({ exerciseId: it.exercise.id, sets: it.sets })));

  const saveImported = () => {
    if (!review) return;
    const planItems = review.rows.map((row) => {
      const exercise = row.exercise ?? actions.createExercise(row.name);
      return { exerciseId: exercise.id, sets: row.sets, ...(row.reps ? { reps: row.reps } : null) };
    });
    // Two file names can land on one exercise; a plan lists it once.
    const seen = new Set<string>();
    finish(review.name, planItems.filter((it) => (seen.has(it.exerciseId) ? false : (seen.add(it.exerciseId), true))));
  };

  const back = () => {
    if (stage === 'picker') setStage('builder');
    else if (stage === 'info' && review) setStage('import');
    else if (stage === 'choose') onClose();
    else setStage('choose');
  };

  return (
    <Modal visible={visible} transparent={stage === 'choose'} animationType="slide" onRequestClose={back} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {stage === 'choose' ? <ChooseStage onPick={pick} onClose={onClose} /> : null}
        {stage === 'info' ? <InfoStage way={way} onBack={back} onNext={leaveInfo} /> : null}
        {stage === 'builder' ? <BuilderStage name={name} onName={setName} items={items} onItems={setItems} onAdd={() => setStage('picker')} onClose={onClose} onSave={saveBuilt} /> : null}
        {stage === 'picker' ? (
          <PickerStage
            taken={taken}
            onBack={() => setStage('builder')}
            onPick={(exercise) => {
              haptic.tap();
              setItems((list) => [...list, { exercise, sets: DEFAULT_PLAN_SETS }]);
              setStage('builder');
            }}
          />
        ) : null}
        {stage === 'import' ? <ImportStage review={review} onReview={setReview} onInfo={() => setStage('info')} onClose={onClose} onSave={saveImported} /> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}
