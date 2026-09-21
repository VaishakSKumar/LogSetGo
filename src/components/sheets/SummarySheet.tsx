import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { shortDate } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { routineFromSession, routineIdFor } from '../../lib/routines';
import { workoutSummary } from '../../lib/stats';
import { fmtVolume, fmtWeight } from '../../lib/units';
import { useGym } from '../../store/gym';
import { colors } from '../../theme';
import { Sheet, SheetBody } from '../Sheet';
import { Caption, Num, PillButton } from '../ui';

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View className="flex-1 rounded-2xl bg-fill/50 p-3">
    <Caption>{label}</Caption>
    <Num size="text-h2">{value}</Num>
    {sub ? <Caption>{sub}</Caption> : null}
  </View>
);

/** What you just did: time, volume, sets, PRs, each lift, and how it compares with last time. */
export function SummarySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, today, byId, actions } = useGym();
  const unit = data.unit;
  const summary = workoutSummary(data.sessions, today);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  const saveRoutine = () => {
    const session = data.sessions[today];
    const finalName = name.trim() || summary?.label || 'My workout';
    // Same name as an existing routine? Update it instead of adding a look-alike.
    const id = routineIdFor(data.routines, finalName, `mine-${Date.now().toString(36)}`);
    const routine = session ? routineFromSession(session, finalName, id) : null;
    if (!routine) return;
    actions.addRoutine(routine);
    haptic.pulse();
    setSaved(true);
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setSaved(false);
        setName('');
        onClose();
      }}
      title="Workout summary"
    >
      <SheetBody>
        {!summary ? (
          <Text className="py-6 text-body text-muted">Log at least one working set and your summary will appear here.</Text>
        ) : (
          <>
            <Caption className="mb-3">
              {summary.label} · {shortDate(summary.date)}
            </Caption>

            <View className="mb-2 flex-row gap-2">
              <Tile label="Duration" value={summary.durationMin == null ? '—' : `${summary.durationMin} min`} />
              <Tile label="Volume" value={fmtVolume(summary.totalVolume, unit)} sub={unit} />
            </View>
            <View className="flex-row gap-2">
              <Tile label="Sets" value={String(summary.totalSets)} sub={`${summary.exercises.length} exercise${summary.exercises.length > 1 ? 's' : ''}`} />
              <Tile label="Records" value={String(summary.prCount)} sub={summary.prCount === 1 ? 'new PR' : 'new PRs'} />
            </View>

            {summary.vsLast ? (
              <Text className="mt-3 text-body text-muted">
                vs your last {summary.label} on {shortDate(summary.vsLast.date)}:{' '}
                <Text style={{ color: summary.vsLast.pct > 0 ? colors.accent : colors.muted, fontWeight: '600' }}>
                  {summary.vsLast.pct > 0 ? '+' : summary.vsLast.pct < 0 ? '−' : ''}
                  {Math.abs(summary.vsLast.pct)}% volume
                </Text>
              </Text>
            ) : null}

            <View className="mt-4">
              {summary.exercises.map((e, i) => (
                <View key={e.exerciseId} className="min-h-[56px] flex-row items-center py-2" style={i ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
                  <View className="flex-1 pr-3">
                    <Text className="text-body text-label" numberOfLines={1}>
                      {byId.get(e.exerciseId)?.name ?? e.exerciseId}
                    </Text>
                    <Caption>
                      {e.sets} set{e.sets > 1 ? 's' : ''} · {fmtVolume(e.volume, unit)} {unit}
                    </Caption>
                  </View>
                  <View className="items-end">
                    <Num size="text-h2">
                      {fmtWeight(e.top.weight, unit)} × {e.top.reps}
                    </Num>
                    {e.pr ? <Text className="text-caption font-semibold" style={{ color: colors.accent }}>PR</Text> : <Caption>top set</Caption>}
                  </View>
                </View>
              ))}
            </View>

            <View className="mt-4 rounded-2xl bg-fill/40 p-3">
              <Text className="text-body text-label">Do this again?</Text>
              <Caption className="mb-2">Save today’s exercises and set counts as a routine.</Caption>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={summary.label}
                placeholderTextColor={colors.ghost}
                maxLength={24}
                accessibilityLabel="Routine name"
                className="mb-2 h-11 rounded-xl bg-fill px-3 text-body text-label"
                style={{ outlineStyle: 'none' } as never}
              />
              <PillButton compact variant={saved ? 'secondary' : 'white'} label={saved ? 'Saved to Routines' : 'Save as routine'} disabled={saved} onPress={saveRoutine} />
            </View>
          </>
        )}
      </SheetBody>
    </Sheet>
  );
}
