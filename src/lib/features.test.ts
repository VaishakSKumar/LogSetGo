import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CATALOG } from '../data/catalog';
import { initialData, reducer } from '../store/reducer';
import { DEFAULT_PREFS, type AppData, type HistoryEntry, type SetRow } from '../types';
import { EMPTY_APP_DATA, mergeAppData, normalizeAppData } from './appdata';
import { backupFileName, buildBackup, describeBackup, mergeBackups, parseBackup, setsToCsv, weightsToCsv } from './backup';
import { emptyBody } from './body';
import { DEFAULT_BAR, oneRepMax, percentTable, platesPerSide, PLATES, warmupSets } from './calc';
import { buildDemoData } from './demo';
import { buildHistory, isLogged, suggestNext, weekTotals } from './progress';
import { PLAN_EXERCISE_IDS, buildPlan, routineFromSession, type PlanDays } from './routines';
import { e1rmSeries, goalProgress, muscleSplit, recordsList, weeklyBuckets, workoutSummary } from './stats';
import { defaultTimerSettings } from './timer';
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
    assert.equal(lines[0], 'date,workout,exercise,set,weight_kg,reps,warmup,rpe,note');
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
    let s = reducer(initialData, { type: 'select', id: 'a', date: TODAY });
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
    let s = reducer(initialData, { type: 'select', id: 'barbell-bench-press', date: TODAY });
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '1', weight: 60, reps: 8, at: 1 });
    const routine = { id: 'r', name: 'Push A', items: [{ exerciseId: 'overhead-press', sets: 4 }, { exerciseId: 'barbell-bench-press', sets: 5 }] };
    s = reducer(s, { type: 'startRoutine', date: TODAY, routine });
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
    let s = reducer(initialData, { type: 'select', id: 'a', date: TODAY });
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
