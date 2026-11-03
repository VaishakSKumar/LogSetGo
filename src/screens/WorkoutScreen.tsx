import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayStatusButtons } from '../components/attendance/DayStatusButtons';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { Header } from '../components/Header';
import { CrossIcon, SunIcon } from '../components/Icons';
import { QuickActions, type QuickSheet } from '../components/QuickActions';
import { RestBanner } from '../components/RestBanner';
import { AddExerciseButton } from '../components/session/AddExerciseButton';
import { ExerciseLogCard } from '../components/session/ExerciseLogCard';
import { ExerciseMenuSheet, type MenuStep } from '../components/session/ExerciseMenuSheet';
import { SummaryCard } from '../components/session/SummaryCard';
import { WorkoutRecorderSheet } from '../components/session/WorkoutRecorderSheet';
import { TodaysPlan, YourPlans } from '../components/session/PlanLists';
import { RoutinesSheet } from '../components/sheets/RoutinesSheet';
import { StatsSheet } from '../components/sheets/StatsSheet';
import { SummarySheet } from '../components/sheets/SummarySheet';
import { ToolsSheet } from '../components/sheets/ToolsSheet';
import { STATUS_META, type Status } from '../lib/attendance';
import { relativeDay } from '../lib/dates';
import { formatDuration } from '../lib/duration';
import { haptic } from '../lib/haptics';
import { fmtSet, previousEntry, topSet } from '../lib/progress';
import { exerciseTut, exerciseVolume, formatSets, loggedExercises, summarizeDay, type LoggedExercise } from '../lib/session';
import { browseExercises } from '../lib/suggest';
import { roundDisplay, toDisplay } from '../lib/units';
import { useDayStep } from '../lib/useDayStep';
import type { Ghost, SetMode } from '../types';
const NO_GHOST: Ghost = { weight: null, reps: null };
import { useAttendance } from '../store/attendance';
import { useGym } from '../store/gym';
import { useTimer } from '../store/timer';
import { colors, fonts } from '../theme';

/** A modal that closed less than this long ago may still be animating out; don't open another over it yet. */
const MODAL_SETTLE_MS = 320;

/** What the ••• / swipe sheet is about. Kept after closing so it can slide out with its content intact. */
interface MenuState {
  id: string;
  step: MenuStep;
  visible: boolean;
  name: string;
  entry: LoggedExercise;
}

const dayMessage = (status: Status | undefined, date: string, today: string, logged: boolean) => {
  if (status === 'present') return logged ? 'Here is what you logged.' : 'Nothing was logged on this day.';
  if (status === 'absent') return date === today ? 'No workout to log today.' : 'You missed the gym on this day.';
  if (status === 'holiday') return 'Planned rest. Your streak stays safe.';
  return date > today ? 'Nothing to log yet. You can plan a Holiday.' : 'No attendance was saved for this day.';
};

/**
 * Gym Progress strictly reflects whichever date is selected — the real today, or wherever the
 * calendar or the header's day arrows point — in one of three modes:
 *  · Today: fully interactive. Nothing logged yet shows a search hero; something logged shows the
 *    summary, feed and a "+" to add another; either opens the recorder drawer to log sets.
 *  · A past or future date: read-only. An Absent or Holiday day fills the page with its colour;
 *    any other day shows its status, what was logged, and a way to change the status.
 * Swiping sideways moves between days, except on today's feed where it deletes a card.
 * Sets are saved the moment they're checked, so the summary and feed behind the drawer update live;
 * Done validates, closes the drawer and brings you back to the top of the screen.
 */
export function WorkoutScreen() {
  const { active, rows, history, durationHistory, exercises, recents, label, data, today, realToday, byId, selectionCount, actions } = useGym();
  const { timer, settings, controls } = useTimer();
  const { statuses, setStatus } = useAttendance();
  const swipe = useDayStep();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const modalClosedAt = useRef(0);

  const [heroSearchOpen, setHeroSearchOpen] = useState(false);
  const [drawerSearchOpen, setDrawerSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const [stackHeight, setStackHeight] = useState(0);
  const [sheet, setSheet] = useState<QuickSheet | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const unit = data.unit;
  const step = unit === 'kg' ? data.prefs.stepKg : data.prefs.stepLb;

  /** Only today can be logged. Every other date — past or future — is a view, never an edit. */
  const canWrite = today === realToday;
  const isFuture = today > realToday;

  const session = data.sessions[today];
  const logged = useMemo(() => loggedExercises(session), [session]);
  const summary = useMemo(() => summarizeDay(session), [session]);
  const hasLogged = logged.length > 0;

  /** Your saved preference, else the catalog's smart-detected default, else Reps. */
  const modeOf = (id: string) => data.exerciseModes[id] ?? byId.get(id)?.defaultMode ?? 'reps';
  const mode: SetMode = active ? modeOf(active.id) : 'reps';

  const entries = active ? (mode === 'time' ? durationHistory[active.id] : history[active.id]) : undefined;
  const prevSets = useMemo(() => previousEntry(entries, today)?.sets, [entries, today]);
  // Every set starts empty: nothing is copied in from the last set or the last session ("Last" shows those).
  const ghosts = useMemo(() => rows.map(() => NO_GHOST), [rows]);

  const activeIndex = rows.findIndex((r) => !r.done);
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;

  const nextUp = !activeRow
    ? 'All sets done'
    : activeRow.reps == null
      ? `Next: Set ${activeIndex + 1}`
      : `Next: Set ${activeIndex + 1} · ${mode === 'time' ? formatDuration(activeRow.reps) : `${activeRow.reps} reps`}${activeRow.weight ? ` · ${roundDisplay(toDisplay(activeRow.weight, unit))} ${unit}` : ''}`;

  const lastTimeFor = (id: string) => {
    const m = modeOf(id);
    const prev = previousEntry(m === 'time' ? durationHistory[id] : history[id], today);
    return prev ? `Last time · ${relativeDay(prev.date, today)} · ${formatSets(prev.sets, unit, m)}` : null;
  };

  /** The hero's list: what you did lately, or a few ideas for today's workout day on a first run. */
  const starters = useMemo(() => {
    const { recent, suggested } = browseExercises(exercises, recents, label);
    return recent.length ? { title: 'Recent exercises', items: recent.slice(0, 4) } : { title: `Suggested for ${label}`, items: suggested.slice(0, 4) };
  }, [exercises, recents, label]);

  const lastSetOf = (id: string) => {
    if (modeOf(id) === 'time') {
      const entry = previousEntry(durationHistory[id], today);
      return entry ? formatDuration(entry.sets[0].reps) : '';
    }
    const entry = previousEntry(history[id], today);
    return entry ? fmtSet(topSet(entry), unit) : '';
  };

  // Picking an exercise (search, chip, card menu) or starting a routine opens the recorder — but
  // only on today: a past or future date is a view, so there is nothing for it to open. If another
  // modal has only just closed it may still be sliding away, and stacking two modals misbehaves on iOS.
  const seenSelection = useRef(selectionCount);
  useEffect(() => {
    if (selectionCount === seenSelection.current) return;
    seenSelection.current = selectionCount;
    if (!canWrite) return;
    const wait = Math.max(0, MODAL_SETTLE_MS - (Date.now() - modalClosedAt.current));
    if (!wait) {
      setDrawerOpen(true);
      return;
    }
    const t = setTimeout(() => setDrawerOpen(true), wait);
    return () => clearTimeout(t);
  }, [selectionCount, canWrite]);

  // Each date starts from its own state.
  useEffect(() => {
    setDrawerOpen(false);
    setDrawerSearchOpen(false);
    setHeroSearchOpen(false);
  }, [today]);

  // The overlay leaves the moment the rest ends (or on Skip), back to the set you are recording.
  useEffect(() => {
    if (timer.status !== 'running' && timer.status !== 'paused') setRestOpen(false);
  }, [timer.status]);

  const closeDrawer = useCallback(() => {
    modalClosedAt.current = Date.now();
    setDrawerOpen(false);
    setRestOpen(false);
    setDrawerSearchOpen(false);
    setHeroSearchOpen(false);
    Keyboard.dismiss();
  }, []);

  /** Done: the drawer closes and the top of the screen (today's summary) comes back into view. */
  const finishDrawer = useCallback(() => {
    closeDrawer();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [closeDrawer]);

  const openDrawerForNew = () => {
    if (!canWrite) return;
    haptic.tap();
    actions.deselectExercise(); // "+" is for a new exercise, not the one you just finished
    setDrawerOpen(true);
  };

  const closeQuick = () => {
    modalClosedAt.current = Date.now();
    setSheet(null);
  };

  /** Every checkmark goes through here. Logging a set today starts the rest timer. */
  const logSet = useCallback(
    (rowId: string, weight: number, reps: number) => {
      const wasDone = rows.find((r) => r.id === rowId)?.done ?? false;
      actions.toggleSet(rowId, weight, reps);
      if (!wasDone && settings.autoStart && today === realToday) {
        controls.start(settings.defaultSeconds);
        setRestOpen(true);
      }
    },
    [rows, actions, settings.autoStart, settings.defaultSeconds, controls, today, realToday],
  );

  /* ── the ••• menu and every delete (today only) ── */
  const openMenu = (entry: LoggedExercise, stepName: MenuStep) =>
    setMenu({ id: entry.id, step: stepName, visible: true, name: byId.get(entry.id)?.name ?? entry.id, entry });
  const closeMenu = () => {
    modalClosedAt.current = Date.now();
    setMenu((m) => (m ? { ...m, visible: false } : m));
  };
  const confirmDelete = () => {
    if (!menu) return;
    haptic.log(); // impactMedium: deleting a day's work should be felt
    actions.removeExercise(menu.id);
    closeMenu();
  };
  const editFromMenu = () => {
    if (!menu) return;
    closeMenu();
    actions.selectExercise(menu.id);
  };

  // While the drawer is open it shows the countdown itself; behind it the page has no need to.
  const showBanner = timer.status !== 'idle' && !drawerOpen;

  const status = statuses[today];
  // Today is only reachable here once it's Present (see PresenceGate).
  const hero = canWrite && !hasLogged;

  const pagePadding = { paddingTop: insets.top + 12, paddingHorizontal: 16 };

  if (!canWrite && (status === 'absent' || status === 'holiday')) {
    return (
      <View {...swipe} className="flex-1" style={[pagePadding, { paddingBottom: 16, overflow: 'hidden', backgroundColor: STATUS_META[status].color }]}>
        <Header ink="#000" />
        <View pointerEvents="none" style={{ position: 'absolute', top: 62 + insets.top, right: status === 'absent' ? -40 : -60 }}>
          {status === 'absent' ? <CrossIcon size={300} stroke={3} opacity={0.14} /> : <SunIcon size={320} stroke={1.8} opacity={0.14} />}
        </View>
        <View className="flex-1 justify-end">
          <Text accessibilityLiveRegion="polite" style={{ marginBottom: 6, color: '#000', fontFamily: fonts.display, fontSize: 92, lineHeight: 88, textTransform: 'uppercase' }}>
            {STATUS_META[status].label}
          </Text>
          <Text style={{ color: '#000', fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28 }}>{dayMessage(status, today, realToday, false)}</Text>
          <View style={{ marginTop: 22, padding: 12, borderRadius: 18, backgroundColor: '#000' }}>
            <Text style={{ marginBottom: 8, color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>Change day status</Text>
            <DayStatusButtons date={today} today={realToday} current={status} onChange={(next) => setStatus(today, next)} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-base">
      <ScrollView
        {...(hasLogged && canWrite ? null : swipe)}
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[pagePadding, { flexGrow: 1, paddingBottom: (showBanner ? stackHeight : 0) + (canWrite && hasLogged ? 88 : 12) }]}
      >
        <Header />

        {hero ? (
          <>
            {heroSearchOpen ? null : (
              <Text style={{ marginTop: 12, marginBottom: 14, color: '#fff', fontFamily: fonts.display, fontSize: 58, lineHeight: 56, textTransform: 'uppercase' }} accessibilityRole="header">
                What are you <Text style={{ color: colors.accent }}>training?</Text>
              </Text>
            )}
            <ExerciseSearch hero open={heroSearchOpen} onOpenChange={setHeroSearchOpen} showSelected={false} />
            {heroSearchOpen ? null : (
              <>
                <TodaysPlan date={today} />
                <YourPlans />
              </>
            )}
            {heroSearchOpen ? null : (
              <View style={{ marginTop: 14 }}>
                <Text style={{ marginBottom: 2, color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>{starters.title}</Text>
                {starters.items.map((ex) => (
                  <Pressable
                    key={ex.id}
                    accessibilityRole="button"
                    accessibilityLabel={ex.name}
                    onPress={() => {
                      haptic.tap();
                      actions.selectExercise(ex.id);
                    }}
                    className="flex-row items-center justify-between active:opacity-60"
                    style={{ height: 52, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.navLine }}
                  >
                    <Text className="shrink" numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16 }}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 14, fontVariant: ['tabular-nums'] }}>{lastSetOf(ex.id)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : null}

        {canWrite && hasLogged ? (
          <>
            <SummaryCard summary={summary} unit={unit} />
            <TodaysPlan date={today} />
            <View style={{ marginTop: 10 }}>
              <QuickActions onOpen={setSheet} />
            </View>
            <View style={{ marginTop: 16, gap: 10 }}>
              <Text style={{ color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>Logged exercises</Text>
              {logged.map((entry) => (
                <ExerciseLogCard
                  key={entry.id}
                  entry={entry}
                  exercise={byId.get(entry.id) ?? { name: entry.id, group: 'Other' }}
                  unit={unit}
                  onMenu={() => openMenu(entry, 'menu')}
                  onDelete={() => openMenu(entry, 'confirm')}
                />
              ))}
            </View>
          </>
        ) : null}

        {!canWrite ? (
          <>
            <View accessibilityLiveRegion="polite" style={{ marginTop: 18 }}>
              <Text style={{ marginBottom: 8, color: status ? STATUS_META[status].color : '#fff', fontFamily: fonts.display, fontSize: 72, lineHeight: 72, textTransform: 'uppercase' }}>
                {status ? STATUS_META[status].label : isFuture ? 'Upcoming' : 'Not marked'}
              </Text>
              <Text style={{ color: '#E5E5EA', fontFamily: fonts.medium, fontSize: 18, lineHeight: 26 }}>{dayMessage(status, today, realToday, hasLogged)}</Text>
            </View>

            {hasLogged ? (
              <View style={{ marginTop: 12 }}>
                {logged.map((entry) => (
                  <View key={entry.id} className="flex-row items-center justify-between" style={{ height: 48, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.navLine }}>
                    <Text className="shrink" numberOfLines={1} style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16 }}>
                      {byId.get(entry.id)?.name ?? entry.id}
                    </Text>
                    <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 14, fontVariant: ['tabular-nums'] }}>
                      {entry.sets.length} {entry.sets.length === 1 ? 'set' : 'sets'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ marginTop: 20, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }}>
              <Text style={{ marginBottom: 8, color: colors.secondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }}>Change day status</Text>
              <DayStatusButtons date={today} today={realToday} current={status} onChange={(next) => setStatus(today, next)} />
            </View>
          </>
        ) : null}

        {(hero && !heroSearchOpen) || !canWrite ? (
          <View style={{ marginTop: 'auto', paddingTop: 12 }}>
            <QuickActions onOpen={setSheet} />
          </View>
        ) : null}
      </ScrollView>

      {canWrite && hasLogged ? <AddExerciseButton onPress={openDrawerForNew} bottom={showBanner ? stackHeight + 14 : 14} /> : null}

      {/* Rest countdown on the page itself, above the scrolled content. Measured so nothing hides behind it. */}
      {showBanner ? (
        <View
          onLayout={(e) => setStackHeight(e.nativeEvent.layout.height)}
          className="absolute bottom-0 left-0 right-0 border-t border-line bg-base pb-3"
          style={{ borderTopColor: colors.line }}
        >
          <View className="px-4 pt-3">
            <RestBanner />
          </View>
        </View>
      ) : null}

      <WorkoutRecorderSheet
        visible={drawerOpen}
        onClose={closeDrawer}
        onDone={finishDrawer}
        search={<ExerciseSearch variant="sheet" open={drawerSearchOpen} onOpenChange={setDrawerSearchOpen} />}
        searching={drawerSearchOpen}
        restOpen={restOpen}
        active={active}
        rows={rows}
        ghosts={ghosts}
        prevSets={prevSets}
        entries={entries}
        lastTime={active ? lastTimeFor(active.id) : null}
        nextUp={nextUp}
        unit={unit}
        step={step}
        mode={mode}
        onModeChange={(m) => active && actions.setExerciseMode(active.id, m)}
        onUnitChange={actions.setUnit}
        today={today}
        activeIndex={activeIndex}
        activeRow={activeRow}
        exerciseKg={exerciseVolume(rows)}
        tutSeconds={exerciseTut(rows)}
        dayKg={summary.volume}
        onChange={actions.setField}
        onLog={logSet}
        onAdd={actions.addSet}
        onRemove={actions.removeSet}
        onApply={actions.fillSets}
      />

      <RoutinesSheet visible={sheet === 'routines'} onClose={closeQuick} />
      <StatsSheet visible={sheet === 'stats'} onClose={closeQuick} />
      <ToolsSheet visible={sheet === 'tools'} onClose={closeQuick} />
      <SummarySheet visible={sheet === 'summary'} onClose={closeQuick} />
      <ExerciseMenuSheet
        visible={!!menu?.visible}
        step={menu?.step ?? 'menu'}
        exercise={menu ? { name: menu.name } : undefined}
        entry={menu?.entry}
        unit={unit}
        onClose={closeMenu}
        onEdit={editFromMenu}
        onAskDelete={() => setMenu((m) => (m ? { ...m, step: 'confirm' } : m))}
        onConfirmDelete={confirmDelete}
      />
    </KeyboardAvoidingView>
  );
}
