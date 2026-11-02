import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { HeightSheet } from '../../components/body/HeightSheet';
import { UpdateWeightSheet } from '../../components/body/UpdateWeightSheet';
import { ChevronRightIcon } from '../../components/Icons';
import { MAX_GOAL_KG, MIN_GOAL_KG, bmiOf, categoryMeta, categoryOf, fmtHeight, isValidGoalKg, normalRangeKg } from '../../lib/body';
import { goalProgress } from '../../lib/insights';
import { fmtWeight, fmtWeightUnit, fromDisplay, roundDisplay, toDisplay } from '../../lib/units';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { useTimer } from '../../store/timer';
import { colors, fonts } from '../../theme';
import { PageHeader } from './PageHeader';

const SCALE = 40;
const TICKS = [18.5, 25, 30];
const card = { borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel } as const;

function Tile({ title, value, action, onPress }: { title: string; value: string; action: string; onPress: () => void }) {
  return (
    <View className="flex-1" style={{ padding: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
      <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>{title}</Text>
      <Text numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.display, fontSize: 34, lineHeight: 40, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${action} ${title.toLowerCase()}`} onPress={onPress} className="items-center justify-center active:opacity-70" style={{ height: 44, marginTop: 6, borderRadius: 12, backgroundColor: colors.fill }}>
        <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 15 }}>{action}</Text>
      </Pressable>
    </View>
  );
}

/** BMI, its healthy range for your height, and the target goal weight. */
export function BmiPage({ onBack, onWeightProgress }: { onBack: () => void; onWeightProgress: () => void }) {
  const { data: gym } = useGym();
  const { data, latest, bmi, actions } = useBody();
  const { timer } = useTimer();
  const unit = gym.unit;
  const [weightOpen, setWeightOpen] = useState(false);
  const [heightOpen, setHeightOpen] = useState(false);

  const shownGoal = data.goalKg == null ? '' : String(roundDisplay(toDisplay(data.goalKg, unit)));
  const [draft, setDraft] = useState(shownGoal);
  useEffect(() => setDraft(shownGoal), [unit]); // eslint-disable-line react-hooks/exhaustive-deps

  const typed = fromDisplay(Number.parseFloat(draft.replace(',', '.')), unit);
  const valid = isValidGoalKg(typed);
  const blank = !draft.trim();

  const onGoal = (text: string) => {
    setDraft(text);
    const kg = fromDisplay(Number.parseFloat(text.replace(',', '.')), unit);
    if (!text.trim()) actions.setGoal(null);
    else if (isValidGoalKg(kg)) actions.setGoal(kg);
  };

  const band = bmi == null ? null : categoryMeta(categoryOf(bmi));
  const range = data.heightCm ? normalRangeKg(data.heightCm) : null;
  const goalBmi = valid && data.heightCm ? bmiOf(typed, data.heightCm) : null;
  const goalBand = goalBmi == null ? null : categoryMeta(categoryOf(goalBmi));
  const first = data.entries[0];
  const progress = valid && latest && first ? goalProgress(first.kg, latest.kg, typed) : null;

  const message = !valid
    ? `Enter a weight from ${Math.round(toDisplay(MIN_GOAL_KG, unit))} to ${Math.round(toDisplay(MAX_GOAL_KG, unit))} ${unit}`
    : goalBmi == null
      ? 'Add your height to see your BMI at this goal'
      : `BMI at goal: ${goalBmi.toFixed(1)}, ${goalBand!.label}`;

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-base">
      <PageHeader title="BMI" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: timer.status !== 'idle' ? 150 : 8, gap: 10 }}>
        <View accessibilityLabel="Your BMI" style={[card, { padding: 16 }]}>
          {bmi == null ? (
            <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 }}>Add your weight and height to see your BMI.</Text>
          ) : (
            <View className="flex-row items-end justify-between" style={{ gap: 12 }}>
              <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 92, lineHeight: 88, fontVariant: ['tabular-nums'] }}>{bmi.toFixed(1)}</Text>
              <Text style={{ marginBottom: 8, color: band!.color, fontFamily: fonts.bold, fontSize: 18 }}>{band!.label}</Text>
            </View>
          )}

          <View style={{ marginTop: 22, height: 8 }}>
            <View className="flex-row" style={{ gap: 2 }}>
              <View style={{ flex: 18.5, height: 8, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, backgroundColor: '#5A5E5A' }} />
              <View style={{ flex: 6.5, height: 8, backgroundColor: colors.accent }} />
              <View style={{ flex: 5, height: 8, backgroundColor: colors.holiday }} />
              <View style={{ flex: 10, height: 8, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: colors.danger }} />
            </View>
            {bmi != null ? (
              <View style={{ position: 'absolute', top: -5, left: `${Math.min(100, (bmi / SCALE) * 100)}%`, marginLeft: -9, width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: colors.panel, backgroundColor: '#fff' }} />
            ) : null}
          </View>
          <View style={{ height: 20, marginTop: 6 }}>
            {TICKS.map((t) => (
              <Text key={t} className="text-center" style={{ position: 'absolute', left: `${(t / SCALE) * 100}%`, width: 40, marginLeft: -20, color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] }}>
                {t}
              </Text>
            ))}
          </View>
          {range ? (
            <Text style={{ marginTop: 8, color: colors.secondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}>
              A healthy range for your height is {fmtWeight(range.min, unit)} to {fmtWeightUnit(range.max, unit)}.
            </Text>
          ) : null}
        </View>

        <View accessibilityLabel="Target goal" style={[card, { padding: 12 }]}>
          <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
            <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 }}>Target goal weight</Text>
            <View className="flex-row items-center" style={{ height: 48, paddingHorizontal: 12, gap: 4, borderRadius: 12, backgroundColor: colors.fill }}>
              <TextInput
                accessibilityLabel="Target goal weight"
                value={draft}
                onChangeText={onGoal}
                keyboardType="decimal-pad"
                maxLength={5}
                selectTextOnFocus
                style={{ width: 56, height: 44, padding: 0, color: '#fff', fontFamily: fonts.bold, fontSize: 20, textAlign: 'right', fontVariant: ['tabular-nums'] }}
              />
              <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 15 }}>{unit}</Text>
            </View>
          </View>
          <Text accessibilityLiveRegion="polite" style={{ marginTop: 8, color: goalBand?.key === 'normal' ? colors.accent : colors.holiday, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 }}>
            {blank ? `Type the weight you want to reach, from ${Math.round(toDisplay(MIN_GOAL_KG, unit))} to ${Math.round(toDisplay(MAX_GOAL_KG, unit))} ${unit}` : message}
          </Text>
          {progress ? (
            <>
              <View className="overflow-hidden" style={{ height: 8, marginTop: 8, borderRadius: 4, backgroundColor: colors.border }}>
                <View style={{ width: `${progress.percent}%`, height: '100%', borderRadius: 4, backgroundColor: colors.accent }} />
              </View>
              <Text style={{ marginTop: 4, color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
                {progress.direction === 'reached' ? 'You have reached your goal' : `${fmtWeightUnit(progress.left, unit)} to ${progress.direction}`}
              </Text>
            </>
          ) : valid && !latest ? (
            <Text style={{ marginTop: 4, color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>Log your weight to track this goal.</Text>
          ) : null}
        </View>

        <View className="flex-row" style={{ gap: 8 }}>
          <Tile title="Weight" value={latest ? fmtWeightUnit(latest.kg, unit) : '—'} action={latest ? 'Update' : 'Add'} onPress={() => setWeightOpen(true)} />
          <Tile title="Height" value={data.heightCm ? fmtHeight(data.heightCm, data.heightUnit) : '—'} action={data.heightCm ? 'Edit' : 'Add'} onPress={() => setHeightOpen(true)} />
        </View>

        <Pressable accessibilityRole="button" onPress={onWeightProgress} className="flex-row items-center justify-between active:opacity-60" style={{ minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.navLine }}>
          <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 15 }}>See weight progress</Text>
          <ChevronRightIcon size={18} color={colors.muted} stroke={2.4} />
        </Pressable>

        <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>BMI is a general guide. It does not separate muscle from fat.</Text>
      </ScrollView>

      <UpdateWeightSheet visible={weightOpen} onClose={() => setWeightOpen(false)} />
      <HeightSheet visible={heightOpen} onClose={() => setHeightOpen(false)} />
    </KeyboardAvoidingView>
  );
}
