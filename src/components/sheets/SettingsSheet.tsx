import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Switch, Text, View } from 'react-native';

import { backupFileName, buildBackup, describeBackup, mergeBackups, parseBackup, setsToCsv, weightsToCsv, type Backup } from '../../lib/backup';
import { clearErrors, readErrors } from '../../lib/diagnostics';
import { formatErrorReport } from '../../lib/errorlog';
import { pickTextFile, saveTextFile } from '../../lib/files';
import { haptic } from '../../lib/haptics';
import { ensurePermission, notificationsSupported, sendTestAlert } from '../../lib/notify';
import { useAttendance } from '../../store/attendance';
import { useBody } from '../../store/body';
import { useGym } from '../../store/gym';
import { useTimer } from '../../store/timer';
import { colors } from '../../theme';
import type { Unit } from '../../types';
import { MinusIcon, PlusIcon } from '../Icons';
import { Sheet, SheetBody } from '../Sheet';
import { Caption, HoldButton, PillButton } from '../ui';

const STEPS: Record<Unit, number[]> = { kg: [1, 1.25, 2, 2.5, 5], lb: [2.5, 5, 10] };
const PRIVACY_URL = 'https://vaishakskumar.github.io/LogSetGo/privacy.html';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mt-5">
    <Text className="mb-2 text-h2 text-label">{title}</Text>
    {children}
  </View>
);

const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    className={`h-11 min-w-[56px] items-center justify-center rounded-full px-4 active:opacity-70 ${selected ? 'bg-label' : 'bg-fill'}`}
  >
    <Text className={`text-body font-medium ${selected ? 'text-black' : 'text-label'}`}>{label}</Text>
  </Pressable>
);

const ToggleRow = ({ label, sub, value, onChange, disabled }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <View className="min-h-[56px] flex-row items-center justify-between" style={{ opacity: disabled ? 0.45 : 1 }}>
    <View className="flex-1 pr-3">
      <Text className="text-body text-label">{label}</Text>
      {sub ? <Caption>{sub}</Caption> : null}
    </View>
    <Switch
      accessibilityLabel={label}
      disabled={disabled}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.fill, true: colors.accent }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.fill}
    />
  </View>
);

const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`;

/** Units, weight step, alerts, backup & export, diagnostics. */
export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data, exercises, actions } = useGym();
  const { marks, replaceMarks } = useAttendance();
  const { data: body, actions: bodyActions } = useBody();
  const { settings, controls } = useTimer();
  const unit = data.unit;

  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const refreshErrors = useCallback(() => void readErrors().then((e) => setErrorCount(e.length)), []);
  useEffect(() => {
    if (visible) {
      setMessage(null);
      setIncoming(null);
      refreshErrors();
    }
  }, [visible, refreshErrors]);

  const say = (text: string, good = true) => setMessage({ text, good });
  const parts = () => ({ gym: data, attendance: marks, body, timer: settings });

  /* ── notifications ── */
  const toggleAlerts = async (on: boolean) => {
    if (on && !(await ensurePermission())) {
      say('Notifications are blocked. Turn them on for LogSetGo in your phone’s Settings.', false);
      return;
    }
    haptic.tap();
    controls.setAlerts(on);
  };
  const toggleReminder = async (on: boolean) => {
    if (on && !(await ensurePermission())) {
      say('Notifications are blocked. Turn them on for LogSetGo in your phone’s Settings.', false);
      return;
    }
    haptic.tap();
    controls.setReminderHour(on ? 18 : null);
  };
  const testAlert = async () => {
    haptic.tap();
    const result = await sendTestAlert(5);
    if (result === 'sent') say('Test alert sent. Lock your phone now; it should buzz in about 5 seconds.');
    else if (result === 'blocked') say('Notifications are blocked. Turn them on for LogSetGo in your phone’s Settings.', false);
    else say('Couldn’t schedule the alert on this device.', false);
  };
  const stepHour = (d: number) => controls.setReminderHour(((settings.reminderHour ?? 18) + d + 24) % 24);

  /* ── backup ── */
  const exportBackup = async () => {
    const r = await saveTextFile(backupFileName(), JSON.stringify(buildBackup(parts()), null, 1), 'application/json');
    say(r.ok ? (r.how === 'download' ? 'Backup downloaded. Keep it somewhere safe.' : 'Backup ready. Choose where to save it.') : r.error, r.ok);
  };
  const exportSets = async () => {
    const r = await saveTextFile(backupFileName(new Date(), 'csv', 'workouts'), setsToCsv(data, exercises), 'text/csv');
    say(r.ok ? 'Workouts exported as CSV.' : r.error, r.ok);
  };
  const exportWeights = async () => {
    const r = await saveTextFile(backupFileName(new Date(), 'csv', 'weight'), weightsToCsv(body), 'text/csv');
    say(r.ok ? 'Weight log exported as CSV.' : r.error, r.ok);
  };
  const chooseImport = async () => {
    const picked = await pickTextFile();
    if (!picked.ok) {
      if (!picked.cancelled) say(picked.error ?? 'Couldn’t read that file.', false);
      return;
    }
    const parsed = parseBackup(picked.text);
    if (!parsed.ok) return say(parsed.error, false);
    setMessage(null);
    setIncoming(parsed.backup);
  };
  const applyImport = (mode: 'merge' | 'replace') => {
    if (!incoming) return;
    const next = mode === 'replace' ? { gym: incoming.gym, attendance: incoming.attendance, body: incoming.body, timer: incoming.timer } : mergeBackups(parts(), incoming);
    actions.replaceAll(next.gym);
    replaceMarks(next.attendance);
    bodyActions.replaceAll(next.body);
    controls.replaceSettings(next.timer);
    haptic.pulse();
    setIncoming(null);
    say(mode === 'replace' ? 'Backup restored. Everything was replaced.' : 'Backup merged. Your existing data was kept.');
  };

  /* ── diagnostics ── */
  const shareErrors = async () => {
    const list = await readErrors();
    const r = await saveTextFile('LogSetGo-error-log.txt', formatErrorReport(list, Constants.expoConfig?.version ?? '1.0.0', Platform.OS), 'text/plain');
    say(r.ok ? 'Error log ready to share.' : r.error, r.ok);
  };

  const info = incoming ? describeBackup(incoming) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title="Settings">
      <SheetBody>
        {message ? (
          <View className="mb-1 rounded-2xl p-3" style={{ backgroundColor: message.good ? 'rgba(48,209,88,0.14)' : 'rgba(255,69,58,0.14)' }}>
            <Text className="text-body" style={{ color: message.good ? colors.accent : colors.danger }} accessibilityLiveRegion="polite">
              {message.text}
            </Text>
          </View>
        ) : null}

        <Section title="Units">
          <View className="flex-row gap-2">
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <Chip
                key={u}
                label={u}
                selected={unit === u}
                onPress={() => {
                  haptic.tap();
                  actions.setUnit(u);
                }}
              />
            ))}
          </View>
        </Section>

        <Section title="Weight step">
          <Caption className="mb-2">How much one + or − tap changes the weight. Also sets the size of suggested jumps.</Caption>
          <View className="flex-row flex-wrap gap-2">
            {STEPS[unit].map((s) => {
              const current = unit === 'kg' ? data.prefs.stepKg : data.prefs.stepLb;
              return (
                <Chip
                  key={s}
                  label={`${s} ${unit}`}
                  selected={current === s}
                  onPress={() => {
                    haptic.tap();
                    actions.setPrefs(unit === 'kg' ? { stepKg: s } : { stepLb: s });
                  }}
                />
              );
            })}
          </View>
        </Section>

        <Section title="Notifications">
          {!notificationsSupported ? (
            <Caption>Rest-timer alerts and reminders work in the iPhone and Android apps. Web browsers can’t notify you while the app is closed.</Caption>
          ) : null}
          <ToggleRow label="Rest-over alert" sub="Buzz when a rest ends, even with the app closed" value={settings.alerts} disabled={!notificationsSupported} onChange={toggleAlerts} />
          <ToggleRow label="Daily reminder" sub="A nudge to log your workout" value={settings.reminderHour != null} disabled={!notificationsSupported} onChange={toggleReminder} />
          {settings.reminderHour != null ? (
            <View className="mb-1 flex-row items-center justify-between pl-1">
              <Text className="text-body text-muted">Remind me at</Text>
              <View className="flex-row items-center gap-3">
                <HoldButton label="Earlier" onStep={() => stepHour(-1)}>
                  <MinusIcon size={16} color={colors.label} />
                </HoldButton>
                <Text className="w-20 text-center text-body font-semibold tabular-nums text-label">{fmtHour(settings.reminderHour)}</Text>
                <HoldButton label="Later" onStep={() => stepHour(1)}>
                  <PlusIcon size={16} color={colors.label} />
                </HoldButton>
              </View>
            </View>
          ) : null}
          {notificationsSupported ? (
            <PillButton compact label="Send test alert" onPress={testAlert} className="mt-2 self-start" />
          ) : null}
        </Section>

        <Section title="Backup & export">
          <Caption className="mb-2">Your data lives only on this device. A backup file protects it if you lose your phone or clear the browser.</Caption>
          {incoming && info ? (
            <View className="rounded-2xl bg-fill/50 p-3">
              <Text className="mb-1 text-body font-semibold text-label">Restore this backup?</Text>
              <Caption className="mb-2">
                {info.workouts} workout days · {info.sets} sets · {info.weights} weigh-ins · {info.attendanceMarks} attendance marks · {info.routines} routines
                {info.exportedAt ? `\nExported ${info.exportedAt.slice(0, 10)}` : ''}
              </Caption>
              <View className="gap-2">
                <PillButton compact variant="white" label="Merge, keep my data" onPress={() => applyImport('merge')} />
                <PillButton compact label="Replace everything" onPress={() => applyImport('replace')} />
                <PillButton compact label="Cancel" onPress={() => setIncoming(null)} />
              </View>
              <Caption className="mt-2">Merge adds anything missing and never overwrites what you have. Replace erases current data first, so export a backup if unsure.</Caption>
            </View>
          ) : (
            <View className="gap-2">
              <PillButton variant="white" label="Export backup" onPress={exportBackup} />
              <PillButton label="Import backup…" onPress={chooseImport} />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <PillButton compact label="Workouts CSV" onPress={exportSets} />
                </View>
                <View className="flex-1">
                  <PillButton compact label="Weight CSV" onPress={exportWeights} />
                </View>
              </View>
            </View>
          )}
        </Section>

        <Section title="Diagnostics">
          <Caption className="mb-2">
            {errorCount === 0 ? 'No errors recorded.' : `${errorCount} error${errorCount > 1 ? 's' : ''} recorded on this device.`} Logs stay here unless you share them.
          </Caption>
          {errorCount > 0 ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <PillButton compact label="Share log" onPress={shareErrors} />
              </View>
              <View className="flex-1">
                <PillButton
                  compact
                  label="Clear"
                  onPress={async () => {
                    await clearErrors();
                    refreshErrors();
                  }}
                />
              </View>
            </View>
          ) : null}
        </Section>

        <Section title="About">
          <Text className="text-body text-label">LogSetGo {Constants.expoConfig?.version ?? ''}</Text>
          <Caption className="mb-2">Track. Rest. Progress. No account, no ads, no tracking.</Caption>
          <Pressable
            accessibilityRole="link"
            onPress={() => (Platform.OS === 'web' ? window.open('privacy.html', '_blank') : Linking.openURL(PRIVACY_URL))}
            className="h-11 justify-center active:opacity-60"
          >
            <Text className="text-body text-label">Privacy policy</Text>
          </Pressable>
        </Section>
      </SheetBody>
    </Sheet>
  );
}
