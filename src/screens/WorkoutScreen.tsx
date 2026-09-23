import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseSearch } from '../components/ExerciseSearch';
import { Header } from '../components/Header';
import { QuickActions, type QuickSheet } from '../components/QuickActions';
import { RestBanner } from '../components/RestBanner';
import { AddExerciseButton } from '../components/session/AddExerciseButton';
import { ExerciseLogCard } from '../components/session/ExerciseLogCard';
import { ExerciseMenuSheet, type MenuStep } from '../components/session/ExerciseMenuSheet';
import { SummaryCard } from '../components/session/SummaryCard';
import { WorkoutRecorderSheet } from '../components/session/WorkoutRecorderSheet';
import { RoutinesSheet } from '../components/sheets/RoutinesSheet';
import { StatsSheet } from '../components/sheets/StatsSheet';
import { SummarySheet } from '../components/sheets/SummarySheet';
import { ToolsSheet } from '../components/sheets/ToolsSheet';
import { SectionHeader } from '../components/ui';
import { WeeklyProgressCard } from '../components/WeeklyProgressCard';
import { relativeDay } from '../lib/dates';
import { haptic } from '../lib/haptics';
import { ghostFor, previousEntry } from '../lib/progress';
import { exerciseTut, exerciseVolume, formatSets, loggedExercises, summarizeDay, type LoggedExercise } from '../lib/session';
import type { SetMode } from '../types';
import { useGym } from '../store/gym';
import { useTimer } from '../store/timer';
import { colors } from '../theme';

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

/**
 * Gym Progress strictly reflects whichever date is selected — the real today, or wherever the
 * calendar or the header's day arrows point — in one of three modes:
 *  · Today: fully interactive. Nothing logged yet shows a search hero; something logged shows the
 *    summary, feed and a "+" to add another; either opens the recorder drawer to log sets.
 *  · A past date: read-only. The feed (if any) is a plain activity log — no "+", no ••• menu, no
 *    swipe-to-delete, and picking an exercise or starting a routine can't open the recorder.
 *  · A future date: an empty-state placeholder. Nothing can be logged yet.
 * Sets are saved the moment they're checked, so the summary and feed behind the drawer update live;
 * Done validates, closes the drawer and brings you back to the top of the screen.
 */
export function WorkoutScreen() {
  const { active, rows, history, durationHistory, data, today, realToday, byId, selectionCount, actions } = useGym();
  const { timer, settings, controls } = useTimer();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const modalClosedAt = useRef(0);

  const [heroSearchOpen, setHeroSearchOpen] = useState(false);
  const [drawerSearchOpen, setDrawerSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const ghosts = useMemo(() => rows.map((_, i) => ghostFor(i, rows, prevSets)), [rows, prevSets]);

  const activeIndex = rows.findIndex((r) => !r.done);
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;

  const lastTimeFor = (id: string) => {
    const m = modeOf(id);
    const prev = previousEntry(m === 'time' ? durationHistory[id] : history[id], today);
    return prev ? `Last time · ${relativeDay(prev.date, today)} · ${formatSets(prev.sets, unit, m)}` : null;
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

  const closeDrawer = useCallback(() => {
    modalClosedAt.current = Date.now();
    setDrawerOpen(false);
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
      if (!wasDone && settings.autoStart && today === realToday) controls.start(settings.defaultSeconds);
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

  const emptyMessage = isFuture ? 'No workout logged for this date yet.' : canWrite ? 'No exercises logged for today. Start by typing an exercise above.' : 'Nothing was logged on this day.';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-base">
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: showBanner ? stackHeight + 16 : insets.bottom + 32 }}
      >
        <Header />

        {/* Today, nothing logged: the search bar is the hero. */}
        {!hasLogged && canWrite ? (
          <View className="gap-3 pt-2">
            <Text className="text-center text-h1 text-label">What are you training?</Text>
            <ExerciseSearch hero open={heroSearchOpen} onOpenChange={setHeroSearchOpen} showSelected={false} />
          </View>
        ) : null}

        {/* Something logged (today, or a past day's log): summary, feed, and — only today — the + button. */}
        {hasLogged && !heroSearchOpen ? <SummaryCard summary={summary} unit={unit} /> : null}

        {hasLogged ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Logged exercises" />
            {logged.map((entry) => {
              const ex = byId.get(entry.id);
              return (
                <ExerciseLogCard
                  key={entry.id}
                  entry={entry}
                  exercise={ex ?? { name: entry.id, group: 'Other' }}
                  unit={unit}
                  previous={lastTimeFor(entry.id)}
                  readOnly={!canWrite}
                  onMenu={() => openMenu(entry, 'menu')}
                  onDelete={() => openMenu(entry, 'confirm')}
                />
              );
            })}
          </View>
        ) : null}

        {hasLogged && canWrite ? <AddExerciseButton open={drawerOpen} onPress={openDrawerForNew} /> : null}

        {!hasLogged && !heroSearchOpen ? (
          <View
            className="items-center rounded-3xl border px-6 py-8"
            style={{ backgroundColor: colors.glass, borderColor: colors.glassBorder }}
            accessibilityLabel={canWrite ? 'No exercises logged for today' : isFuture ? 'No workout logged for this date yet' : 'Nothing was logged on this day'}
          >
            <Text className="text-center text-body text-muted">{emptyMessage}</Text>
          </View>
        ) : null}

        {!heroSearchOpen ? <QuickActions onOpen={setSheet} /> : null}
        {hasLogged ? <WeeklyProgressCard /> : null}
      </ScrollView>

      {/* Rest countdown on the page itself, above the scrolled content. Measured so nothing hides behind it. */}
      {showBanner ? (
        <View
          onLayout={(e) => setStackHeight(e.nativeEvent.layout.height)}
          className="absolute bottom-0 left-0 right-0 border-t border-line bg-base"
          style={{ borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 12) + 4 }}
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
        active={active}
        rows={rows}
        ghosts={ghosts}
        prevSets={prevSets}
        entries={entries}
        lastTime={active ? lastTimeFor(active.id) : null}
        unit={unit}
        step={step}
        mode={mode}
        onModeChange={(m) => active && actions.setExerciseMode(active.id, m)}
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
