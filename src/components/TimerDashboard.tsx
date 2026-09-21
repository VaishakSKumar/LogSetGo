import { useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { haptic } from '../lib/haptics';
import { MAX_CUSTOM_SECONDS, MAX_SAVED, PRESETS, fmt, type SavedTimer } from '../lib/timer';
import { useTimer } from '../store/timer';
import { colors, roundedFont } from '../theme';
import { CheckIcon, ChevronDownIcon, CloseIcon, MinusIcon, PlayIcon, PlusIcon } from './Icons';
import { Sheet } from './Sheet';
import { Caption, Card, HoldButton, Num, PillButton } from './ui';

/* ─────────────── Inline min / sec selector ─────────────── */

function Selector({
  label,
  value,
  onStep,
}: {
  label: string;
  value: number;
  onStep: (dir: 1 | -1) => void;
}) {
  return (
    <View className="flex-1 items-center">
      <Caption className="mb-1 uppercase tracking-wider">{label}</Caption>
      <View className="flex-row items-center gap-2">
        <HoldButton label={`Decrease ${label}`} onStep={() => onStep(-1)}>
          <MinusIcon color={colors.label} />
        </HoldButton>
        <View className="min-w-[48px] items-center">
          <Text
            className="text-[28px] font-bold tabular-nums text-label"
            style={{ fontFamily: roundedFont, lineHeight: 34 }}
            accessibilityLabel={`${value} ${label}`}
          >
            {String(value).padStart(2, '0')}
          </Text>
        </View>
        <HoldButton label={`Increase ${label}`} onStep={() => onStep(1)}>
          <PlusIcon color={colors.label} />
        </HoldButton>
      </View>
    </View>
  );
}

/* ─────────────── Creator ─────────────── */

function Creator({ onAdded }: { onAdded: () => void }) {
  const { controls, settings } = useTimer();
  const [minutes, setMinutes] = useState(1);
  const [secs, setSecs] = useState(45);
  const [name, setName] = useState('');

  const total = minutes * 60 + secs;
  const full = settings.saved.length >= MAX_SAVED;

  // Functional updates: the hold-to-repeat button calls these many times from a single render.
  const stepMinutes = (dir: 1 | -1) => setMinutes((m) => Math.min(59, Math.max(0, m + dir)));
  const stepSeconds = (dir: 1 | -1) =>
    setSecs((s) => {
      const next = s + dir * 5;
      return next < 0 ? 55 : next > 55 ? 0 : next; // wraps: 55 → 00 → 05
    });

  const add = () => {
    if (!controls.saveTimer(total, name)) return haptic.warn();
    haptic.log();
    setName('');
    onAdded();
  };

  return (
    <View className="mt-1 rounded-2xl bg-fill/40 p-3">
      <View className="flex-row gap-2">
        <Selector label="min" value={minutes} onStep={stepMinutes} />
        <Selector label="sec" value={secs} onStep={stepSeconds} />
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name, e.g. Heavy Squats (optional)"
        placeholderTextColor={colors.ghost}
        maxLength={24}
        returnKeyType="done"
        selectionColor={colors.accent}
        accessibilityLabel="Timer name"
        className="mt-3 h-11 rounded-xl bg-fill px-3 text-body text-label"
        style={{ outlineStyle: 'none' } as never}
      />

      <View className="mt-3">
        <PillButton
          variant="white"
          label="Add to Dashboard"
          detail={fmt(total)}
          icon={<PlusIcon size={16} color="#000" />}
          disabled={total < 5 || full}
          onPress={add}
        />
      </View>
      {full ? <Caption className="mt-2 text-center">Dashboard is full. Delete a timer to add another.</Caption> : null}
    </View>
  );
}

/* ─────────────── Saved timers ─────────────── */

function SavedRow({ item, first }: { item: SavedTimer; first: boolean }) {
  const { controls } = useTimer();
  return (
    <View
      className={`min-h-[60px] flex-row items-center ${first ? '' : 'border-t border-line'}`}
      style={first ? undefined : { borderTopColor: colors.line }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start ${item.label}, ${fmt(item.seconds)}`}
        onPress={() => {
          haptic.tap();
          controls.start(item.seconds, item.label);
        }}
        className="h-14 flex-1 flex-row items-center active:opacity-60"
      >
        <View className="flex-1 pr-2">
          <Text className="text-body text-label" numberOfLines={1}>
            {item.label}
          </Text>
          <Caption>Tap to start</Caption>
        </View>
        <Num size="text-h2" className="mr-2">
          {fmt(item.seconds)}
        </Num>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-fill">
          <PlayIcon size={16} color={colors.accent} />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.label}`}
        onPress={() => {
          haptic.tap();
          controls.deleteTimer(item.id);
        }}
        className="h-11 w-11 items-center justify-center active:opacity-60"
      >
        <CloseIcon size={16} color={colors.danger} />
      </Pressable>
    </View>
  );
}

/* ─────────────── Default-rest picker ─────────────── */

function DefaultSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, controls } = useTimer();
  const options: { key: string; label: string; seconds: number }[] = [
    ...PRESETS.map((s) => ({ key: `p${s}`, label: 'Preset', seconds: s })),
    ...settings.saved.map((t) => ({ key: t.id, label: t.label, seconds: t.seconds })),
  ];
  return (
    <Sheet visible={visible} onClose={onClose} title="Default rest">
      <View className="px-4 pb-2">
        <Caption className="mb-1">Starts automatically after each set you log.</Caption>
        {options.map((o, i) => {
          const selected = o.seconds === settings.defaultSeconds;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                haptic.tap();
                controls.setDefaultSeconds(o.seconds);
                onClose();
              }}
              className={`min-h-[56px] flex-row items-center active:opacity-60 ${i ? 'border-t border-line' : ''}`}
              style={i ? { borderTopColor: colors.line } : undefined}
            >
              <Text className="flex-1 text-body text-muted" numberOfLines={1}>
                {o.label}
              </Text>
              <Num size="text-h2" className="mr-3">
                {fmt(o.seconds)}
              </Num>
              <View className="w-5 items-center">{selected ? <CheckIcon size={18} color={colors.accent} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/* ─────────────── Dashboard card ─────────────── */

/** Presets, custom timer creator, saved timers, and the auto-start switch. */
export function TimerDashboard() {
  const { settings, controls } = useTimer();
  const [creating, setCreating] = useState(false);
  const [pickDefault, setPickDefault] = useState(false);

  return (
    <Card>
      <View className="mb-1 flex-row items-center justify-between px-1">
        <View>
          <Text className="text-h2 text-label">Rest timer</Text>
          <Caption>Auto-start after each set</Caption>
        </View>
        <Switch
          accessibilityLabel="Auto-start rest timer after each set"
          value={settings.autoStart}
          onValueChange={(on) => {
            haptic.tap();
            controls.setAutoStart(on);
          }}
          trackColor={{ false: colors.fill, true: colors.accent }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.fill}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Default rest ${fmt(settings.defaultSeconds)}. Tap to change.`}
        onPress={() => setPickDefault(true)}
        className="min-h-[44px] flex-row items-center justify-between px-1 active:opacity-60"
        style={{ opacity: settings.autoStart ? 1 : 0.45 }}
      >
        <Text className="text-body text-muted">Default rest</Text>
        <View className="flex-row items-center gap-2">
          <Num size="text-h2">{fmt(settings.defaultSeconds)}</Num>
          <ChevronDownIcon />
        </View>
      </Pressable>

      {/* 1-tap presets */}
      <View className="mt-2 flex-row gap-2">
        {PRESETS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={`Start ${fmt(s)} rest`}
            onPress={() => {
              haptic.tap();
              controls.start(s);
            }}
            className="h-11 flex-1 items-center justify-center rounded-full bg-fill active:opacity-60"
          >
            <Text className="text-h2 tabular-nums text-label" style={{ fontFamily: roundedFont }}>
              {fmt(s)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Custom creator */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: creating }}
        onPress={() => setCreating((c) => !c)}
        className="mt-2 min-h-[44px] flex-row items-center justify-between px-1 active:opacity-60"
      >
        <Text className="text-body text-label">Custom timer</Text>
        <View style={{ transform: [{ rotate: creating ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon />
        </View>
      </Pressable>
      {creating ? <Creator onAdded={() => setCreating(false)} /> : null}

      {/* Saved dashboard */}
      <View className="mt-3 border-t border-line px-1 pt-3" style={{ borderTopColor: colors.line }}>
        <Text className="text-h2 text-label">Saved timers</Text>
        {settings.saved.length ? (
          <View className="mt-1">
            {settings.saved.map((t, i) => (
              <SavedRow key={t.id} item={t} first={i === 0} />
            ))}
          </View>
        ) : (
          <Caption className="mt-1">Custom timers you add show up here for one-tap starts.</Caption>
        )}
      </View>

      <DefaultSheet visible={pickDefault} onClose={() => setPickDefault(false)} />
    </Card>
  );
}
