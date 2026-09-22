import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CATALOG } from '../data/catalog';
import { initialData, reducer } from '../store/reducer';
import { DEFAULT_PREFS, type AppData, type HistoryEntry, type SetRow } from '../types';
import { EMPTY_APP_DATA, mergeAppData, normalizeAppData } from './appdata';
import { backupFileName, buildBackup, describeBackup, mergeBackups, parseBackup, setsToCsv, weightsToCsv } from './backup';
import { canLog, resolveStatuses } from './attendance';
import { emptyBody } from './body';
import { DEFAULT_BAR, oneRepMax, percentTable, platesPerSide, PLATES, warmupSets } from './calc';
import { buildDemoData } from './demo';
import { addCustomDayLabel, hideDefaultDayLabel, isDefaultDayLabel, MAX_CUSTOM_DAY_LABELS, MAX_DAY_LABEL_LENGTH, normalizeDayLabel, removeCustomDayLabel, visibleDefaultDayLabels } from './daylabels';
import { formatDuration, parseDurationInput } from './duration';
import { bestDurationExcluding, buildDurationHistory, buildHistory, DAY_LABELS, isLogged, isTimeSet, setKg, suggestNext, weekTotals } from './progress';
import { exerciseTut, exerciseVolume, formatSets, loggedExercises, summarizeDay } from './session';
import { PLAN_EXERCISE_IDS, buildPlan, routineFromSession, routineIdFor, type PlanDays } from './routines';
import { e1rmSeries, goalProgress, muscleSplit, recordsList, weeklyBuckets, workoutSummary } from './stats';
import { MAX_ERRORS, pushError, type ErrorEntry } from './errorlog';
import { addSeconds, defaultTimerSettings, finishTimer, idleTimer, parseTimerSettings, pauseTimer, restAlertPlan, resumeTimer, skipTimer, startTimer } from './timer';
import { fmtWeight, roundDisplay } from './units';

const TODAY = '2026-09-21'; // a Monday
const row = (id: string, weight: number | null, reps: number | null, done = false, extra: Partial<SetRow> = {}): SetRow => ({ id, weight, reps, done, ...extra });
const withSessions = (sessions: AppData['sessions']): AppData => ({ ...EMPTY_APP_DATA, sessions });

describe('app data normalisation', () => {
  it('fills in every field an older save is missing', () => {
    const old = { version: 1, unit: 'lb', activeExerciseId: null, customExercises: [], sessions: {} };
    const n = normalizeAppData(old)!;
    assert.equal(n.unit, 'lb');
    assert.deepEqual(n.routines, []);
    assert.deepEqual(n.goals, {});
    assert.deepEqual(n.prefs, DEFAULT_PREFS);
  });

  it('rejects things that are not LogSetGo data and repairs bad prefs', () => {
    assert.equal(normalizeAppData(null), null);
    assert.equal(normalizeAppData({ version: 2, sessions: {} }), null);
    assert.equal(normalizeAppData({ version: 1 }), null);
    const n = normalizeAppData({ version: 1, sessions: {}, prefs: { stepKg: -3, stepLb: 'x' }, goals: { a: { targetKg: 100, createdAt: 'x' }, b: 5 } })!;
    assert.deepEqual(n.prefs, DEFAULT_PREFS);
    assert.deepEqual(Object.keys(n.goals), ['a']);
  });

  it('merge never overwrites what you already have', () => {
    const mine = withSessions({ '2026-09-14': { label: 'Push A', exercises: { bench: [row('1', 60, 8, true)] } } });
    const theirs = withSessions({
      '2026-09-14': { label: 'Other', exercises: { bench: [row('1', 999, 1, true)], squat: [row('1', 100, 5, true)] } },
      '2026-09-07': { label: 'Legs A', exercises: { squat: [row('1', 90, 5, true)] } },
    });
    const m = mergeAppData(mine, theirs);
    assert.equal(m.sessions['2026-09-14'].exercises.bench[0].weight, 60); // yours wins
    assert.equal(m.sessions['2026-09-14'].label, 'Push A');
    assert.ok(m.sessions['2026-09-14'].exercises.squat); // but you gain exercises you lacked that day
    assert.ok(m.sessions['2026-09-07']); // and whole days you lacked
  });
});

describe('backup & restore', () => {
  const parts = () => ({ gym: buildDemoData(TODAY), attendance: { '2026-09-20': 'absent' as const }, body: { ...emptyBody, heightCm: 178, entries: [{ id: 'w1', date: '2026-09-18', at: 1, kg: 77 }] }, timer: defaultTimerSettings });

  it('round-trips everything through a file', () => {
    const text = JSON.stringify(buildBackup(parts(), new Date('2026-09-21T10:00:00Z')));
    const r = parseBackup(text);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.backup.body.heightCm, 178);
    assert.equal(r.backup.attendance['2026-09-20'], 'absent');
    assert.deepEqual(Object.keys(r.backup.gym.sessions), Object.keys(parts().gym.sessions));
    const d = describeBackup(r.backup);
    assert.ok(d.workouts > 5 && d.sets > 30 && d.weights === 1);
  });

  it('turns every kind of bad input into a readable error instead of throwing', () => {
    for (const bad of ['', '{nope', 'null', '[]', '{"app":"Other"}', '{"app":"LogSetGo","schema":99,"gym":{}}', '{"app":"LogSetGo","schema":1,"gym":{"version":1}}']) {
      const r = parseBackup(bad);
      assert.equal(r.ok, false, bad);
      if (!r.ok) assert.ok(r.error.length > 10);
    }
  });

  it('drops garbage rows but keeps the good ones', () => {
    const b = buildBackup(parts());
    const messy = JSON.stringify({ ...b, attendance: { '2026-09-20': 'absent', 'not-a-date': 'present', '2026-09-19': 'nonsense' } });
    const r = parseBackup(messy);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.backup.attendance, { '2026-09-20': 'absent' });
  });

  it('merge keeps your data, adds missing marks/weights, and does not duplicate', () => {
    const current = { gym: EMPTY_APP_DATA, attendance: { '2026-09-01': 'holiday' as const }, body: { ...emptyBody, heightCm: 170, entries: [{ id: 'w1', date: '2026-09-18', at: 5, kg: 70 }] }, timer: defaultTimerSettings };
    const incoming = buildBackup({ ...parts(), attendance: { '2026-09-01': 'present' as const, '2026-09-02': 'absent' as const }, body: { ...emptyBody, heightCm: 999, entries: [{ id: 'w1', date: 'x', at: 1, kg: 1 }, { id: 'w2', date: '2026-09-10', at: 2, kg: 71 }] } });
    const m = mergeBackups(current, incoming);
    assert.equal(m.attendance['2026-09-01'], 'holiday'); // yours wins
    assert.equal(m.attendance['2026-09-02'], 'absent'); // added
    assert.equal(m.body.heightCm, 170);
    assert.deepEqual(m.body.entries.map((e) => e.id), ['w2', 'w1']); // sorted by time, w1 not duplicated
    assert.ok(Object.keys(m.gym.sessions).length > 5);
  });

  it('CSV escapes commas, quotes and newlines, and skips unfinished sets', () => {
    const gym = withSessions({ '2026-09-21': { label: 'Push, A', exercises: { x: [row('1', 60, 8, true, { note: 'felt "great"\nnext' }), row('2', 60, 8, false)] } } });
    const csv = setsToCsv(gym, [{ id: 'x', name: 'Bench, Flat', group: 'Chest', split: 'push' }]);
    const lines = csv.trim().split('\r\n');
    assert.equal(lines[0], 'date,workout,exercise,set,weight_kg,reps,duration,mode,warmup,rpe,note');
    assert.ok(csv.includes('"Push, A"') && csv.includes('"Bench, Flat"') && csv.includes('"felt ""great""\nnext"'));
    assert.equal((csv.match(/2026-09-21/g) ?? []).length, 1); // only the done set
    assert.equal(weightsToCsv({ ...emptyBody, entries: [{ id: 'a', date: '2026-09-18', at: 0, kg: 77.123456 }] }).includes('77.12'), true);
  });

  it('names files by date', () => {
    assert.equal(backupFileName(new Date(2026, 8, 5)), 'LogSetGo-backup-2026-09-05.json');
    assert.equal(backupFileName(new Date(2026, 8, 5), 'csv', 'sets'), 'LogSetGo-sets-2026-09-05.csv');
  });
});

describe('warm-up sets', () => {
  it('never count as working sets', () => {
    assert.equal(isLogged(row('1', 60, 8, true, { warmup: true })), false);
    assert.equal(isLogged(row('1', 60, 8, true)), true);
    const sessions = { [TODAY]: { label: 'x', exercises: { a: [row('1', 40, 10, true, { warmup: true }), row('2', 100, 5, true)] } } };
    assert.equal(weekTotals(sessions, TODAY).volume, 500);
    assert.deepEqual(buildHistory(sessions).a[0].sets, [{ weight: 100, reps: 5 }]);
  });

  it('marking a set as warm-up in the reducer clears its PR flag and it cannot earn one', () => {
    let s = reducer(initialData, { type: 'select', id: 'a', date: TODAY, mode: 'reps' });
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '1', weight: 60, reps: 5, at: 1 });
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '2', weight: 100, reps: 5, at: 2 });
    assert.equal(s.sessions[TODAY].exercises.a[1].pr, true);
    s = reducer(s, { type: 'setSetMeta', date: TODAY, rowId: '2', meta: { warmup: true } });
    assert.equal(s.sessions[TODAY].exercises.a[1].pr, undefined);
    assert.equal(s.sessions[TODAY].exercises.a[1].warmup, true);
    s = reducer(s, { type: 'setSetMeta', date: TODAY, rowId: '3', meta: { warmup: true } });
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '3', weight: 500, reps: 5, at: 3 });
    assert.equal(s.sessions[TODAY].exercises.a[2].pr, false);
  });
});

describe('reducer: routines, goals, prefs, notes, set details', () => {
  it('startRoutine creates rows for each exercise, selects the first, names the day, keeps existing work', () => {
    let s = reducer(initialData, { type: 'select', id: 'barbell-bench-press', date: TODAY, mode: 'reps' });
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '1', weight: 60, reps: 8, at: 1 });
    const routine = { id: 'r', name: 'Push A', items: [{ exerciseId: 'overhead-press', sets: 4 }, { exerciseId: 'barbell-bench-press', sets: 5 }] };
    s = reducer(s, { type: 'startRoutine', date: TODAY, routine, modes: {} });
    assert.equal(s.activeExerciseId, 'overhead-press');
    assert.equal(s.sessions[TODAY].label, 'Push A');
    assert.equal(s.sessions[TODAY].exercises['overhead-press'].length, 4);
    assert.equal(s.sessions[TODAY].exercises['barbell-bench-press'][0].done, true); // untouched
    assert.equal(s.sessions[TODAY].exercises['barbell-bench-press'].length, 3);
  });

  it('routines are added, replaced by id, and deleted', () => {
    const r = { id: 'a', name: 'One', items: [] };
    let s = reducer(initialData, { type: 'addRoutine', routine: r });
    s = reducer(s, { type: 'addRoutine', routine: { ...r, name: 'Renamed' } });
    assert.deepEqual(s.routines.map((x) => x.name), ['Renamed']);
    assert.equal(reducer(s, { type: 'deleteRoutine', id: 'a' }).routines.length, 0);
  });

  it('goals set and clear; prefs merge', () => {
    let s = reducer(initialData, { type: 'setGoal', exerciseId: 'bench', goal: { targetKg: 100, createdAt: TODAY } });
    assert.equal(s.goals.bench.targetKg, 100);
    s = reducer(s, { type: 'setGoal', exerciseId: 'bench', goal: null });
    assert.deepEqual(s.goals, {});
    s = reducer(s, { type: 'setPrefs', prefs: { stepKg: 1.25 } });
    assert.deepEqual(s.prefs, { stepKg: 1.25, stepLb: 5 });
  });

  it('set details (RPE, note) and exercise notes', () => {
    let s = reducer(initialData, { type: 'select', id: 'a', date: TODAY, mode: 'reps' });
    s = reducer(s, { type: 'setSetMeta', date: TODAY, rowId: '1', meta: { rpe: 8, note: '  paused reps  ' } });
    assert.deepEqual([s.sessions[TODAY].exercises.a[0].rpe, s.sessions[TODAY].exercises.a[0].note], [8, 'paused reps']);
    s = reducer(s, { type: 'setSetMeta', date: TODAY, rowId: '1', meta: { rpe: null, note: '' } });
    assert.deepEqual([s.sessions[TODAY].exercises.a[0].rpe, s.sessions[TODAY].exercises.a[0].note], [undefined, undefined]);
    s = reducer(s, { type: 'setExerciseNote', date: TODAY, exerciseId: 'a', note: 'shoulder tight' });
    assert.equal(s.sessions[TODAY].notes?.a, 'shoulder tight');
    s = reducer(s, { type: 'setExerciseNote', date: TODAY, exerciseId: 'a', note: '  ' });
    assert.deepEqual(s.sessions[TODAY].notes, {});
  });

  it('a custom weight step drives overload suggestions, and quarter plates are never rounded away', () => {
    const s = suggestNext([{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }], 'kg', 1.25)!;
    assert.equal(s.headline, '101.25 kg × 5');
    assert.equal(roundDisplay(101.25), 101.25);
    assert.equal(roundDisplay(143.3004), 143.3); // converted values still read cleanly
    assert.equal(roundDisplay(59.5248), 59.5);
    assert.equal(roundDisplay(82.5), 82.5);
    assert.equal(roundDisplay(100), 100);
    assert.equal(fmtWeight(51.25, 'kg'), '51.25');
  });
});

describe('plan builder', () => {
  const ids = new Set(CATALOG.map((e) => e.id));

  it('only uses exercises that exist in the catalog', () => {
    for (const id of PLAN_EXERCISE_IDS) assert.ok(ids.has(id), `unknown exercise id: ${id}`);
  });

  it('builds the right split for every day count, with unique ids', () => {
    const names = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 } as const;
    for (const days of [2, 3, 4, 5, 6] as PlanDays[]) {
      const plan = buildPlan({ goal: 'muscle', days, level: 'intermediate' });
      assert.equal(plan.length, names[days]);
      assert.equal(new Set(plan.map((r) => r.id)).size, plan.length);
      for (const r of plan) assert.ok(r.items.length >= 4 && r.items.every((i) => i.sets >= 2 && (i.reps ?? 0) > 0));
    }
  });

  it('scales sets and reps by goal and level', () => {
    const strength = buildPlan({ goal: 'strength', days: 3, level: 'intermediate' })[0].items;
    assert.deepEqual([strength[0].sets, strength[0].reps, strength[3].sets, strength[3].reps], [5, 5, 3, 8]);
    const beginner = buildPlan({ goal: 'strength', days: 3, level: 'beginner' })[0].items;
    assert.equal(beginner[0].sets, 4);
    assert.equal(beginner.length, 4);
    assert.equal(buildPlan({ goal: 'strength', days: 3, level: 'advanced' })[0].items.length, 6);
    assert.ok(buildPlan({ goal: 'endurance', days: 4, level: 'intermediate' })[0].items.every((i) => i.reps === 15));
  });

  it('saving under an existing name updates that routine instead of duplicating it', () => {
    const existing = [{ id: 'plan-1', name: 'Upper A', items: [] }, { id: 'x', name: 'Legs', items: [] }];
    assert.equal(routineIdFor(existing, 'upper a ', 'fresh'), 'plan-1'); // case and spacing don't matter
    assert.equal(routineIdFor(existing, 'Upper B', 'fresh'), 'fresh');
    let s = reducer(initialData, { type: 'addRoutine', routine: { id: 'plan-1', name: 'Upper A', items: [{ exerciseId: 'a', sets: 3 }] } });
    s = reducer(s, { type: 'addRoutine', routine: { id: routineIdFor(s.routines, 'Upper A', 'fresh'), name: 'Upper A', items: [{ exerciseId: 'b', sets: 5 }] } });
    assert.deepEqual(s.routines.map((r) => [r.id, r.items[0].exerciseId]), [['plan-1', 'b']]);
  });

  it('saves a session as a routine, keeping order and set counts', () => {
    const session = { label: 'Push A', exercises: { a: [row('1', 1, 1), row('2', 1, 1)], b: [row('1', 1, 1)], c: [] } };
    assert.deepEqual(routineFromSession(session, ' ', 'id')?.items, [{ exerciseId: 'a', sets: 2 }, { exerciseId: 'b', sets: 1 }]);
    assert.equal(routineFromSession(session, ' ', 'id')?.name, 'Push A');
    assert.equal(routineFromSession({ label: 'x', exercises: {} }, 'n', 'id'), null);
  });
});

describe('stats', () => {
  const data = buildDemoData(TODAY);

  it('weekly buckets run oldest to newest and end on the current week', () => {
    const b = weeklyBuckets(data.sessions, TODAY, 6);
    assert.equal(b.length, 6);
    assert.equal(b[5].weekStart, TODAY);
    assert.equal(b[5].volume, 0);
    assert.ok(b[4].volume > 0 && b[0].weekStart < b[1].weekStart);
  });

  it('records keep the first time a best was set and list the newest records first', () => {
    const hist = buildHistory(data.sessions);
    const recs = recordsList(hist);
    const bench = recs.find((r) => r.exerciseId === 'barbell-bench-press')!;
    assert.equal(bench.heaviest.weight, 65);
    assert.equal(bench.heaviestDate, '2026-09-14');
    assert.ok(recs.every((r, i) => i === 0 || recs[i - 1].bestE1rmDate >= r.bestE1rmDate));
  });

  it('e1RM series is chronological', () => {
    const series = e1rmSeries(buildHistory(data.sessions)['barbell-bench-press']);
    assert.equal(series.length, 5);
    assert.ok(series[0].date < series[4].date && series[4].e1rm > series[0].e1rm);
  });

  it('muscle split adds up to 100% and only counts the window', () => {
    const byId = new Map(CATALOG.map((e) => [e.id, e]));
    const split = muscleSplit(data.sessions, byId, TODAY, 30);
    assert.ok(Math.abs(split.reduce((s, g) => s + g.share, 0) - 1) < 1e-9);
    assert.equal(muscleSplit(data.sessions, byId, TODAY, 0).length, 0);
  });

  it('workout summary totals sets, volume, PRs, duration and compares with the last same-label workout', () => {
    const sessions = {
      '2026-09-14': { label: 'Push A', exercises: { a: [row('1', 100, 5, true, { at: 1 })] } },
      [TODAY]: {
        label: 'Push A',
        exercises: {
          a: [row('1', 100, 5, true, { at: 60_000 * 10, pr: false }), row('2', 110, 5, true, { at: 60_000 * 40, pr: true })],
          b: [row('1', 50, 10, true, { at: 60_000 * 25 }), row('2', 20, 10, true, { warmup: true, at: 60_000 * 20 })],
        },
      },
    };
    const s = workoutSummary(sessions, TODAY)!;
    assert.deepEqual([s.totalSets, s.totalVolume, s.prCount, s.durationMin], [3, 500 + 550 + 500, 1, 30]);
    assert.equal(s.exercises.find((e) => e.exerciseId === 'a')!.top.weight, 110);
    assert.equal(s.vsLast?.date, '2026-09-14');
    assert.equal(s.vsLast?.pct, Math.round(((1550 - 500) / 500) * 100));
    assert.equal(workoutSummary(sessions, '2026-01-01'), null);
  });
});

describe('goals', () => {
  const entry = (date: string, kg: number): HistoryEntry => ({ date, sets: [{ weight: kg, reps: 5 }] });
  // newest first, like the app's history
  const climbing = [entry('2026-09-21', 90), entry('2026-09-14', 87.5), entry('2026-09-07', 85), entry('2026-08-31', 82.5)];

  it('reports progress, pace and an ETA from recent sessions', () => {
    const p = goalProgress({ targetKg: 100, createdAt: '2026-08-01' }, climbing, 2.5);
    assert.equal(p.bestKg, 90);
    assert.equal(p.pct, 90);
    assert.equal(p.remainingKg, 10);
    assert.ok(Math.abs(p.slopeKgPerWeek! - 2.5) < 1e-9);
    assert.equal(p.etaWeeks, 4);
    assert.deepEqual(p.milestones.slice(-1), [100]);
    assert.ok(p.milestones.every((m) => m > 90 && m <= 100) && p.milestones.length <= 4);
  });

  it('refuses to project without enough data or without an upward trend', () => {
    assert.equal(goalProgress({ targetKg: 100, createdAt: '' }, climbing.slice(0, 2), 2.5).etaWeeks, null);
    const flat = [entry('2026-09-21', 80), entry('2026-09-14', 80), entry('2026-09-07', 80)];
    assert.equal(goalProgress({ targetKg: 100, createdAt: '' }, flat, 2.5).etaWeeks, null);
    const sameDay = [entry('2026-09-21', 80), entry('2026-09-21', 85), entry('2026-09-21', 90)];
    assert.equal(goalProgress({ targetKg: 100, createdAt: '' }, sameDay, 2.5).slopeKgPerWeek, null);
  });

  it('recognises an achieved goal and empty history', () => {
    const done = goalProgress({ targetKg: 85, createdAt: '' }, climbing, 2.5);
    assert.deepEqual([done.achieved, done.pct, done.remainingKg, done.milestones.length], [true, 100, 0, 0]);
    const none = goalProgress({ targetKg: 100, createdAt: '' }, undefined, 2.5);
    assert.deepEqual([none.bestKg, none.pct, none.etaWeeks], [0, 0, null]);
  });
});

describe('calculators', () => {
  it('1RM matches known values', () => {
    assert.equal(oneRepMax(100, 1).estimate, 100);
    assert.equal(oneRepMax(100, 5).epley, 116.67);
    assert.equal(oneRepMax(100, 5).brzycki, 112.5);
    assert.equal(oneRepMax(100, 5).estimate, 114.58);
    assert.equal(oneRepMax(100, 12).estimate, oneRepMax(100, 12).epley); // beyond 10 reps: Epley only
    assert.equal(oneRepMax(100, 40).brzycki, undefined);
  });

  it('percent table scales from the 1RM', () => {
    const t = percentTable(200, 0.5);
    assert.deepEqual([t[0].weight, t[2].weight, t[4].weight], [200, 180, 160]);
  });

  it('plate calculator loads each side and reports what it cannot make', () => {
    const exact = platesPerSide(100, 20, PLATES.kg);
    assert.deepEqual(exact.perSide, [{ plate: 25, count: 1 }, { plate: 15, count: 1 }]); // 40 per side, fewest plates
    assert.deepEqual([exact.loaded, exact.short], [100, 0]);
    const lb = platesPerSide(225, DEFAULT_BAR.lb, PLATES.lb);
    assert.deepEqual(lb.perSide, [{ plate: 45, count: 2 }]);
    const odd = platesPerSide(101, 20, PLATES.kg); // 40.5/side, smallest plate is 1.25
    assert.equal(odd.loaded, 100.0);
    assert.equal(odd.short, 1);
    assert.equal(platesPerSide(15, 20, PLATES.kg).belowBar, true);
    assert.deepEqual(platesPerSide(20, 20, PLATES.kg).perSide, []);
  });

  it('warm-ups ramp up, stay below the working weight and skip duplicates', () => {
    const w = warmupSets(100, 20, 2.5);
    assert.equal(w[0].label, 'Empty bar');
    assert.ok(w.every((s, i) => s.weight < 100 && (i === 0 || s.weight > w[i - 1].weight)));
    assert.deepEqual(w.map((s) => s.reps), [10, 5, 3, 2, 1]);
    assert.deepEqual(warmupSets(20, 20, 2.5), []);
    const light = warmupSets(30, 20, 2.5); // close to the bar: no empty-bar set, no duplicates
    assert.equal(new Set(light.map((s) => s.weight)).size, light.length);
    assert.ok(light.every((s) => s.weight >= 20 && s.weight < 30));
  });
});

describe('rest alerts and diagnostics', () => {
  const T0 = 1_000_000;

  it('schedules only for a running timer with alerts on, and reschedules from the new end time', () => {
    const s = startTimer(idleTimer, 90, null, T0);
    assert.deepEqual(restAlertPlan(s, true, T0), { action: 'schedule', seconds: 90 });
    assert.deepEqual(restAlertPlan(s, true, T0 + 30_000), { action: 'schedule', seconds: 60 });
    assert.deepEqual(restAlertPlan(s, false, T0), { action: 'cancel' }); // alerts off
    assert.deepEqual(restAlertPlan(pauseTimer(s, T0 + 10_000), true, T0 + 10_000), { action: 'cancel' });
    assert.deepEqual(restAlertPlan(skipTimer(s), true, T0), { action: 'cancel' });
    assert.deepEqual(restAlertPlan(finishTimer(s, T0 + 90_000), true, T0 + 90_000), { action: 'cancel' });
    // +15s moves the alert 15 seconds later
    assert.deepEqual(restAlertPlan(addSeconds(s, 15, T0), true, T0), { action: 'schedule', seconds: 105 });
    // resuming after a pause schedules only what's left
    const resumed = resumeTimer(pauseTimer(s, T0 + 20_000), T0 + 100_000);
    assert.deepEqual(restAlertPlan(resumed, true, T0 + 100_000), { action: 'schedule', seconds: 70 });
  });

  it('reads the new timer settings safely', () => {
    const s = parseTimerSettings(JSON.stringify({ alerts: true, reminderHour: 18 }));
    assert.deepEqual([s.alerts, s.reminderHour], [true, 18]);
    for (const bad of [24, -1, 7.5, '9', null]) assert.equal(parseTimerSettings(JSON.stringify({ reminderHour: bad })).reminderHour, null);
    assert.equal(parseTimerSettings(JSON.stringify({ alerts: 'yes' })).alerts, false);
  });

  it('error log keeps the newest 20, trims long text, and never grows unbounded', () => {
    let list: ErrorEntry[] = [];
    for (let i = 0; i < 30; i++) list = pushError(list, { at: i, message: `e${i}` });
    assert.equal(list.length, MAX_ERRORS);
    assert.equal(list[0].message, 'e29');
    assert.equal(list[19].message, 'e10');
    const big = pushError([], { at: 1, message: 'x'.repeat(5000), stack: 'y'.repeat(5000) });
    assert.ok(big[0].message.length < 1600 && (big[0].stack ?? '').length < 1600);
    assert.equal(pushError([], { at: 1, message: '' })[0].message, '');
  });
});

describe('Gym Progress gate', () => {
  it('opens only for a Present day (tapped, or derived from logged sets)', () => {
    const map = { '2026-09-21': 'present', '2026-09-20': 'absent', '2026-09-19': 'holiday' } as const;
    assert.equal(canLog(map, '2026-09-21'), true);
    assert.equal(canLog(map, '2026-09-20'), false);
    assert.equal(canLog(map, '2026-09-19'), false);
    assert.equal(canLog(map, '2026-09-18'), false); // unmarked
    const derived = resolveStatuses({}, { '2026-09-17': { exercises: { x: [{ id: 'r', weight: 50, reps: 5, done: true }] } } } as never);
    assert.equal(canLog(derived, '2026-09-17'), true);
  });
});

describe('session summary and exercise feed', () => {
  const row = (id: string, weight: number, reps: number, at: number, extra: Partial<SetRow> = {}): SetRow => ({ id, weight, reps, done: true, at, ...extra });
  const empty = (id: string): SetRow => ({ id, weight: null, reps: null, done: false });
  const session = {
    label: 'Push A',
    exercises: {
      // logged second, though it comes first in the object
      squat: [row('1', 100, 5, 2000), row('2', 100, 5, 2100)],
      // picked but never logged: must not appear
      curl: [empty('1'), empty('2')],
      // logged first; the first set is a warm-up
      bench: [row('1', 40, 10, 1000, { warmup: true }), row('2', 60, 8, 1100), empty('3')],
    },
  };

  it('lists only exercises with a finished set, in the order they were first logged', () => {
    assert.deepEqual(loggedExercises(session).map((e) => e.id), ['bench', 'squat']);
    assert.deepEqual(loggedExercises(undefined), []);
    assert.deepEqual(loggedExercises({ label: 'x', exercises: { a: [empty('1')] } }), []);
  });

  it('keeps warm-ups on the card but out of the sets and volume', () => {
    const bench = loggedExercises(session)[0];
    assert.deepEqual(bench.sets.map((s) => s.number), [1, 2]);
    assert.equal(bench.workingSets, 1);
    assert.equal(bench.volume, 60 * 8);
  });

  it('adds the day up: exercises, working sets, volume', () => {
    assert.deepEqual(summarizeDay(session), { exercises: 2, sets: 3, volume: 60 * 8 + 100 * 5 * 2 });
    assert.deepEqual(summarizeDay(undefined), { exercises: 0, sets: 0, volume: 0 });
  });

  it('formats earlier sets for the "last time" line', () => {
    const sets = [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }, { weight: 62.5, reps: 6 }, { weight: 65, reps: 5 }, { weight: 65, reps: 5 }];
    assert.equal(formatSets(sets, 'kg'), '60 × 8 · 60 × 8 · 62.5 × 6 · +2 more');
    assert.equal(formatSets(sets.slice(0, 2), 'kg'), '60 × 8 · 60 × 8');
  });

  it('deleting an exercise removes its sets and note, keeps the rest, and deselects it', () => {
    const state: AppData = {
      ...initialData,
      activeExerciseId: 'bench',
      sessions: { '2026-09-21': { ...session, notes: { bench: 'felt heavy', squat: 'ok' } }, '2026-09-20': { label: 'x', exercises: { bench: [row('1', 50, 5, 1)] } } },
    };
    const next = reducer(state, { type: 'removeExercise', date: '2026-09-21', exerciseId: 'bench' });
    assert.deepEqual(Object.keys(next.sessions['2026-09-21'].exercises).sort(), ['curl', 'squat']);
    assert.deepEqual(next.sessions['2026-09-21'].notes, { squat: 'ok' });
    assert.equal(next.activeExerciseId, null);
    assert.equal(next.sessions['2026-09-20'].exercises.bench.length, 1); // other days untouched
    assert.equal(summarizeDay(next.sessions['2026-09-21']).volume, 1000);
    // a different active exercise stays selected; a missing one is a no-op
    assert.equal(reducer({ ...state, activeExerciseId: 'squat' }, { type: 'removeExercise', date: '2026-09-21', exerciseId: 'bench' }).activeExerciseId, 'squat');
    assert.equal(reducer(state, { type: 'removeExercise', date: '2026-09-21', exerciseId: 'nope' }), state);
    assert.equal(reducer(state, { type: 'deselect' }).activeExerciseId, null);
  });
});

describe('adding a set', () => {
  const D = '2026-09-21';
  const filled = (weight: number | null, reps: number | null, done: boolean): SetRow => ({ id: '', weight, reps, done });

  it('starts from the set before it, so repeating a set is one tap', () => {
    const state: AppData = {
      ...initialData,
      activeExerciseId: 'x',
      sessions: { [D]: { label: 'Push A', exercises: { x: [{ ...filled(60, 8, true), id: '1' }, { ...filled(62.5, 6, false), id: '2' }] } } },
    };
    const rows = reducer(state, { type: 'addSet', date: D }).sessions[D].exercises.x;
    assert.equal(rows.length, 3);
    assert.deepEqual([rows[2].weight, rows[2].reps, rows[2].done], [62.5, 6, false]); // copies the preceding row, unlogged
    assert.equal(rows[2].warmup, undefined);
    assert.equal(new Set(rows.map((r) => r.id)).size, 3);
  });

  it('leaves a new set blank when the one before it is blank, and works on an empty exercise', () => {
    const blank: AppData = { ...initialData, activeExerciseId: 'x', sessions: { [D]: { label: 'x', exercises: { x: [{ ...filled(null, null, false), id: '1' }] } } } };
    const rows = reducer(blank, { type: 'addSet', date: D }).sessions[D].exercises.x;
    assert.deepEqual([rows[1].weight, rows[1].reps], [null, null]);
    const none: AppData = { ...initialData, activeExerciseId: 'x', sessions: { [D]: { label: 'x', exercises: { x: [] } } } };
    assert.equal(reducer(none, { type: 'addSet', date: D }).sessions[D].exercises.x.length, 1);
  });
});

describe('custom day names', () => {
  it('normalizes: trims, collapses spaces, title-cases, caps length', () => {
    assert.equal(normalizeDayLabel('  upper   hypertrophy  '), 'Upper Hypertrophy');
    assert.equal(normalizeDayLabel(''), '');
    assert.equal(normalizeDayLabel('   '), '');
    assert.equal(normalizeDayLabel('x'.repeat(50)).length, MAX_DAY_LABEL_LENGTH);
  });

  it('recognizes the built-in day names, case-insensitively', () => {
    assert.equal(isDefaultDayLabel('Upper'), true);
    assert.equal(isDefaultDayLabel('upper'), true);
    assert.equal(isDefaultDayLabel('Push A'), true);
    assert.equal(isDefaultDayLabel('Upper Hypertrophy'), false);
  });

  it('adds to the front, dedupes case-insensitively, and ignores blanks and defaults', () => {
    let list = addCustomDayLabel([], 'Delts & Arms');
    assert.deepEqual(list, ['Delts & Arms']);
    list = addCustomDayLabel(list, 'core & cardio');
    assert.deepEqual(list, ['Core & Cardio', 'Delts & Arms']);
    // re-adding (any case) moves it to the front instead of duplicating
    list = addCustomDayLabel(list, 'delts & arms');
    assert.deepEqual(list, ['Delts & Arms', 'Core & Cardio']);
    assert.equal(addCustomDayLabel(list, '   ').length, 2);
    assert.equal(addCustomDayLabel(list, 'upper').length, 2); // matches a default: not added
  });

  it('caps the custom list at MAX_CUSTOM_DAY_LABELS, dropping the oldest', () => {
    let list: string[] = [];
    for (let i = 0; i < MAX_CUSTOM_DAY_LABELS + 5; i++) list = addCustomDayLabel(list, `Day ${i}`);
    assert.equal(list.length, MAX_CUSTOM_DAY_LABELS);
    assert.equal(list[0], `Day ${MAX_CUSTOM_DAY_LABELS + 4}`); // newest first
    assert.ok(!list.includes('Day 0')); // oldest fell off
  });

  it('removes case-insensitively and leaves everything else untouched', () => {
    const list = ['Delts & Arms', 'Core & Cardio'];
    assert.deepEqual(removeCustomDayLabel(list, 'DELTS & ARMS'), ['Core & Cardio']);
    assert.deepEqual(removeCustomDayLabel(list, 'nope'), list);
  });

  it('reducer: addDayLabel/deleteDayLabel touch only customDayLabels', () => {
    let s = reducer(initialData, { type: 'addDayLabel', label: 'Core & Cardio' });
    assert.deepEqual(s.customDayLabels, ['Core & Cardio']);
    s = reducer(s, { type: 'deleteDayLabel', label: 'core & cardio' });
    assert.deepEqual(s.customDayLabels, []);
  });

  it('normalizeAppData cleans customDayLabels: trims, dedupes case-insensitively, drops junk, caps', () => {
    const raw = { version: 1, sessions: {}, customDayLabels: ['  Core & Cardio  ', 'core & cardio', 42, '', 'Delts & Arms'] };
    const data = normalizeAppData(raw)!;
    assert.deepEqual(data.customDayLabels, ['Core & Cardio', 'Delts & Arms']);
    assert.deepEqual(normalizeAppData({ version: 1, sessions: {} })!.customDayLabels, []);
  });

  it('mergeAppData unions customDayLabels, keeping the current list first and deduping case-insensitively', () => {
    const current: AppData = { ...initialData, customDayLabels: ['Delts & Arms'] };
    const incoming: AppData = { ...initialData, customDayLabels: ['delts & arms', 'Core & Cardio'] };
    assert.deepEqual(mergeAppData(current, incoming).customDayLabels, ['Delts & Arms', 'Core & Cardio']);
  });
});

describe('hiding built-in day names', () => {
  it('hides a default (case-insensitively), canonicalizing to the DAY_LABELS spelling', () => {
    let hidden = hideDefaultDayLabel([], 'push a');
    assert.deepEqual(hidden, ['Push A']);
    hidden = hideDefaultDayLabel(hidden, 'PUSH A'); // already hidden: no duplicate
    assert.deepEqual(hidden, ['Push A']);
    assert.deepEqual(hideDefaultDayLabel(hidden, 'Not A Default'), hidden); // not a real default: no-op
  });

  it('visibleDefaultDayLabels removes exactly the hidden ones, case-insensitively', () => {
    const visible = visibleDefaultDayLabels(['upper', 'Full Body']);
    assert.ok(!visible.includes('Upper'));
    assert.ok(!visible.includes('Full Body'));
    assert.ok(visible.includes('Push A'));
    assert.deepEqual(visibleDefaultDayLabels([]).length, DAY_LABELS.length);
  });

  it('reducer: hideDayLabel adds, restoreDayLabels clears, neither touches customDayLabels', () => {
    let s = reducer(initialData, { type: 'addDayLabel', label: 'Core & Cardio' });
    s = reducer(s, { type: 'hideDayLabel', label: 'Upper' });
    assert.deepEqual(s.hiddenDayLabels, ['Upper']);
    assert.deepEqual(s.customDayLabels, ['Core & Cardio']);
    s = reducer(s, { type: 'restoreDayLabels' });
    assert.deepEqual(s.hiddenDayLabels, []);
    assert.deepEqual(s.customDayLabels, ['Core & Cardio']); // untouched
  });

  it('normalizeAppData cleans hiddenDayLabels: only real defaults, deduped, DAY_LABELS order', () => {
    const raw = { version: 1, sessions: {}, hiddenDayLabels: ['full body', 'Not Real', 'UPPER', 'Upper', 42] };
    assert.deepEqual(normalizeAppData(raw)!.hiddenDayLabels, ['Upper', 'Full Body']);
    assert.deepEqual(normalizeAppData({ version: 1, sessions: {} })!.hiddenDayLabels, []);
  });

  it('mergeAppData unions hiddenDayLabels: hidden on either side stays hidden', () => {
    const current: AppData = { ...initialData, hiddenDayLabels: ['Upper'] };
    const incoming: AppData = { ...initialData, hiddenDayLabels: ['upper', 'Full Body'] };
    assert.deepEqual(mergeAppData(current, incoming).hiddenDayLabels, ['Upper', 'Full Body']);
  });
});

describe('duration formatting', () => {
  it('formats whole seconds as MM:SS, minutes unpadded, seconds always two digits', () => {
    assert.equal(formatDuration(45), '0:45');
    assert.equal(formatDuration(70), '1:10');
    assert.equal(formatDuration(125), '2:05');
    assert.equal(formatDuration(600), '10:00');
    assert.equal(formatDuration(0), '0:00');
  });

  it('clamps negatives to zero and rounds fractions', () => {
    assert.equal(formatDuration(-5), '0:00');
    assert.equal(formatDuration(45.6), '0:46');
  });

  it('parses bare seconds and MM:SS text the same way', () => {
    assert.equal(parseDurationInput('70'), 70);
    assert.equal(parseDurationInput('1:10'), 70);
    assert.equal(parseDurationInput('01:10'), 70);
    assert.equal(parseDurationInput('2:05'), 125);
    assert.equal(parseDurationInput('1:'), 60); // trailing empty seconds reads as :00
  });

  it('rejects blank, negative, zero and malformed input', () => {
    for (const bad of ['', '  ', '-5', '0', '1:60', '1:2:3', 'abc', '1:ab']) assert.equal(parseDurationInput(bad), null);
  });
});

describe('time-based sets', () => {
  const D = '2026-09-21';
  const rep = (id: string, weight: number, reps: number, at = 1) => row(id, weight, reps, true, { at });
  const hold = (id: string, weight: number, seconds: number, at = 1) => row(id, weight, seconds, true, { mode: 'time', at });

  it('setKg is 0 for a time-based set, even a weighted one — its number is seconds, not reps', () => {
    assert.equal(setKg(rep('1', 60, 8) as SetRow & { weight: number; reps: number }), 480);
    assert.equal(setKg(hold('1', 5, 45) as SetRow & { weight: number; reps: number }), 0);
    assert.equal(isTimeSet(hold('1', 0, 45)), true);
    assert.equal(isTimeSet(rep('1', 60, 8)), false);
  });

  it('buildHistory keeps rep sets and drops time sets; buildDurationHistory is the mirror image', () => {
    const gym = withSessions({ [D]: { label: 'Core', exercises: { plank: [hold('1', 0, 45), hold('2', 0, 50)], squat: [rep('1', 80, 5)] } } });
    const strength = buildHistory(gym.sessions);
    const duration = buildDurationHistory(gym.sessions);
    assert.equal(strength.plank, undefined); // a pure hold never enters the strength history
    assert.deepEqual(strength.squat[0].sets, [{ weight: 80, reps: 5 }]);
    assert.deepEqual(duration.plank[0].sets, [{ weight: 0, reps: 45 }, { weight: 0, reps: 50 }]);
    assert.equal(duration.squat, undefined);
  });

  it('exerciseVolume ignores time-based rows; exerciseTut sums only them; both skip warm-ups', () => {
    const rows: SetRow[] = [rep('1', 60, 8), hold('2', 5, 45), { ...hold('3', 0, 30), warmup: true }];
    assert.equal(exerciseVolume(rows), 480); // only the rep set
    assert.equal(exerciseTut(rows), 45); // only the non-warm-up hold
  });

  it('loggedExercises tags each exercise with its mode and time-under-tension total', () => {
    const session = { label: 'Core', exercises: { plank: [hold('1', 0, 45), hold('2', 0, 50)] } };
    const [entry] = loggedExercises(session);
    assert.equal(entry.mode, 'time');
    assert.equal(entry.tutSeconds, 95);
    assert.equal(entry.volume, 0);
  });

  it('summarizeDay volume never includes a time-based exercise, even a weighted one', () => {
    const session = { label: 'Day', exercises: { squat: [rep('1', 80, 5)], plank: [hold('1', 10, 45)] } };
    assert.deepEqual(summarizeDay(session), { exercises: 2, sets: 2, volume: 400 }); // 80*5, the plank contributes 0
  });

  it('formatSets: MM:SS for time mode, weight folded in only when non-zero', () => {
    assert.equal(formatSets([{ weight: 0, reps: 45 }, { weight: 0, reps: 50 }], 'kg', 'time'), '0:45 · 0:50');
    assert.equal(formatSets([{ weight: 5, reps: 45 }], 'kg', 'time'), '5 kg for 0:45');
    assert.equal(formatSets([{ weight: 60, reps: 8 }], 'kg'), '60 × 8'); // default mode still reps
  });

  it('bestDurationExcluding tracks the longest hold, ignoring the row being logged and other exercises', () => {
    const gym = withSessions({ [D]: { label: 'Core', exercises: { plank: [hold('1', 0, 45), hold('2', 0, 60)] } } });
    assert.equal(bestDurationExcluding(gym.sessions, 'plank', '2', D), 45);
    assert.equal(bestDurationExcluding(gym.sessions, 'plank', '1', D), 60);
    assert.equal(bestDurationExcluding(gym.sessions, 'nope', '1', D), null);
  });

  describe('reducer', () => {
    it('select seeds a time-mode exercise with 0 kg (bodyweight) rows, not blank weight', () => {
      const s = reducer(initialData, { type: 'select', id: 'plank', date: D, mode: 'time' });
      const rows = s.sessions[D].exercises.plank;
      assert.ok(rows.length >= 1);
      assert.ok(rows.every((r) => r.weight === 0 && r.mode === 'time'));
    });

    it('addSet copies the mode of the row before it, along with its weight and duration', () => {
      let s = withSessions({ [D]: { label: 'Core', exercises: { plank: [hold('1', 5, 45, 1)] } } });
      s = { ...s, activeExerciseId: 'plank' };
      s = reducer(s, { type: 'addSet', date: D });
      const added = s.sessions[D].exercises.plank.at(-1)!;
      assert.deepEqual([added.mode, added.weight, added.reps], ['time', 5, 45]);
    });

    it('toggle grants a PR for the longest hold, using duration rather than e1RM', () => {
      let s = withSessions({ [D]: { label: 'Core', exercises: { plank: [hold('1', 0, 60, 1)] } } });
      s = { ...s, activeExerciseId: 'plank', sessions: { ...s.sessions, [D]: { ...s.sessions[D], exercises: { plank: [...s.sessions[D].exercises.plank, row('2', 0, null, false, { mode: 'time' })] } } } };
      const logged = reducer(s, { type: 'toggle', date: D, rowId: '2', weight: 0, reps: 90, at: 2 });
      assert.equal(logged.sessions[D].exercises.plank[1].pr, true);
      const shorter = reducer(s, { type: 'toggle', date: D, rowId: '2', weight: 0, reps: 30, at: 2 });
      assert.equal(shorter.sessions[D].exercises.plank[1].pr, false);
    });

    it('setExerciseMode saves the preference and retags the undone rows of today only', () => {
      let s = reducer(initialData, { type: 'select', id: 'plank', date: D, mode: 'reps' }); // wrong guess, corrected below
      s = reducer(s, { type: 'toggle', date: D, rowId: '1', weight: 0, reps: 10, at: 1 }); // logged as reps
      s = { ...s, sessions: { ...s.sessions, '2026-09-20': { label: 'x', exercises: { plank: [row('1', null, null, false, { mode: 'reps' })] } } } };

      const next = reducer(s, { type: 'setExerciseMode', date: D, exerciseId: 'plank', mode: 'time' });
      assert.equal(next.exerciseModes.plank, 'time');
      const rows = next.sessions[D].exercises.plank;
      assert.equal(rows[0].mode, 'reps'); // already logged: untouched
      assert.equal(rows[1].mode, 'time'); // not yet logged: switches immediately
      assert.equal(rows[1].weight, 0); // defaults to bodyweight now that it is a hold
      assert.equal(next.sessions['2026-09-20'].exercises.plank[0].mode, 'reps'); // a different day is never touched
    });
  });
});
