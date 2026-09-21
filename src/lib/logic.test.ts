import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CATALOG } from '../data/catalog';
import { initialData, reducer } from '../store/reducer';
import type { AppData, SetRow, Session } from '../types';
import { addDays, weekStartKey } from './dates';
import { buildDemoAttendance, buildDemoData } from './demo';
import { attendanceStats, resolveStatuses, streakOf, type StatusMap } from './attendance';
import { daysInMonth, monthGrid, monthTitle, shiftMonth } from './calendar';
import {
  bmiOf, categoryOf, clampHeightCm, cmToFtIn, deltaTone, fmtHeight, fmtTime, ftInToCm, gaugeSegments, markerX,
  normalRangeKg, parseBody, withDeltas,
} from './body';
import { buildHistory, buildRecents, ghostFor, previousEntry, resolveSet, streakWeeks, suggestNext, weekTotals } from './progress';
import { ghostSuffix, searchExercises, shouldOfferCreate } from './search';
import {
  addSeconds, defaultTimerSettings, finishTimer, fmt, idleTimer, isWarning, parseTimerSettings, pauseTimer, progressOf,
  remainingMs, resumeTimer, skipTimer, startTimer, tidyTimerLabel,
} from './timer';
import { fmtDelta, fmtWeight, fromDisplay, toDisplay } from './units';

const row = (id: string, weight: number | null, reps: number | null, done = false): SetRow => ({ id, weight, reps, done });
const TODAY = '2026-09-21'; // a Monday

describe('search', () => {
  it('"in" ghost-completes to your most recent Incline lift', () => {
    const rank = new Map([['incline-dumbbell-press', 0]]);
    const results = searchExercises('in', CATALOG, rank);
    assert.equal(results[0].name, 'Incline Dumbbell Press');
    assert.equal(ghostSuffix('in', results[0]), 'cline Dumbbell Press');
  });

  it('matches aliases and later words', () => {
    assert.equal(searchExercises('ohp', CATALOG, new Map())[0].name, 'Overhead Press');
    assert.ok(searchExercises('db press', CATALOG, new Map()).some((e) => e.name === 'Incline Dumbbell Press'));
  });

  it('short queries stay precise: no mid-word or alias-substring noise', () => {
    const names = searchExercises('in', CATALOG, new Map()).map((e) => e.name);
    assert.ok(names.length > 0 && names.every((n) => /\bin/i.test(n)), names.join(', '));
    assert.ok(!names.includes('Lying Leg Curl'));
    assert.ok(!names.includes('Pull-Up'));
  });

  it('offers "Add" only when the query is not heading toward an existing lift', () => {
    const r = (q: string) => searchExercises(q, CATALOG, new Map());
    assert.equal(shouldOfferCreate('in', CATALOG, r('in')), false);
    assert.equal(shouldOfferCreate('incline dumbbell', CATALOG, r('incline dumbbell')), false);
    assert.equal(shouldOfferCreate('Barbell Bench Press', CATALOG, r('Barbell Bench Press')), false);
    assert.equal(shouldOfferCreate('Zercher Squat', CATALOG, r('Zercher Squat')), true);
  });

  it('no ghost when the top hit is not a literal continuation', () => {
    const top = searchExercises('ohp', CATALOG, new Map())[0];
    assert.equal(ghostSuffix('ohp', top), '');
  });
});

describe('ghost autofill', () => {
  const prev = [
    { weight: 80, reps: 8 },
    { weight: 80, reps: 8 },
    { weight: 80, reps: 7 },
  ];

  it('mirrors the same set from last session', () => {
    const rows = [row('1', null, null), row('2', null, null), row('3', null, null)];
    assert.deepEqual(ghostFor(2, rows, prev), { weight: 80, reps: 7 });
  });

  it('extra sets repeat the last previous set', () => {
    const rows = [row('1', null, null), row('2', null, null), row('3', null, null), row('4', null, null)];
    assert.deepEqual(ghostFor(3, rows, prev), { weight: 80, reps: 7 });
  });

  it('carries a heavier weight forward if you deviated from history', () => {
    const rows = [row('1', 82.5, 8, true), row('2', null, null)];
    assert.deepEqual(ghostFor(1, rows, prev), { weight: 82.5, reps: 8 });
  });

  it('with no history, repeats the set you just logged', () => {
    const rows = [row('1', 50, 10, true), row('2', null, null)];
    assert.deepEqual(ghostFor(1, rows, undefined), { weight: 50, reps: 10 });
    assert.deepEqual(ghostFor(0, [row('1', null, null)], undefined), { weight: null, reps: null });
  });

  it('resolveSet falls back to ghost per field, and refuses when incomplete', () => {
    assert.deepEqual(resolveSet(row('1', null, 6), { weight: 80, reps: 8 }), { weight: 80, reps: 6 });
    assert.equal(resolveSet(row('1', null, null), { weight: null, reps: null }), null);
  });
});

describe('progressive overload', () => {
  it('adds a rep per set in the 7–11 range', () => {
    const s = suggestNext([{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 8 }], 'kg')!;
    assert.equal(s.kind, 'reps');
    assert.deepEqual(s.sets, [{ weight: 80, reps: 9 }, { weight: 80, reps: 9 }, { weight: 80, reps: 9 }]);
  });

  it('adds weight at the top of the range and restarts at 8', () => {
    const s = suggestNext([{ weight: 30, reps: 12 }, { weight: 30, reps: 12 }], 'kg')!;
    assert.equal(s.kind, 'weight');
    assert.equal(s.headline, '32.5 kg × 8');
  });

  it('adds weight for strength sets that all landed', () => {
    const s = suggestNext([{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }], 'kg')!;
    assert.equal(s.headline, '102.5 kg × 5');
  });

  it('asks you to match your best set when sets are uneven', () => {
    const s = suggestNext([{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 6 }], 'kg')!;
    assert.equal(s.kind, 'match');
    assert.equal(s.headline, '80 kg × 8');
  });

  it('uses a 5 lb jump in lb', () => {
    const kg = fromDisplay(135, 'lb');
    const s = suggestNext([{ weight: kg, reps: 5 }, { weight: kg, reps: 5 }], 'lb')!;
    assert.equal(s.headline, '140 lb × 5');
  });

  it('keeps warm-up sets untouched', () => {
    const s = suggestNext([{ weight: 40, reps: 10 }, { weight: 80, reps: 6 }, { weight: 80, reps: 6 }], 'kg')!;
    assert.deepEqual(s.sets[0], { weight: 40, reps: 10 });
  });
});

describe('units', () => {
  it('lb round-trips through kg without drift', () => {
    assert.equal(fmtWeight(fromDisplay(135, 'lb'), 'lb'), '135');
    assert.equal(fmtWeight(fromDisplay(222.5, 'lb'), 'lb'), '222.5');
    assert.ok(Math.abs(toDisplay(fromDisplay(100, 'lb'), 'lb') - 100) < 1e-9);
  });
  it('formats deltas with a real minus', () => {
    assert.equal(fmtDelta(2.5, 'kg'), '+2.5');
    assert.equal(fmtDelta(-5, 'kg'), '−5');
  });
});

describe('weekly rollups (demo history)', () => {
  const data = buildDemoData(TODAY);
  const start = weekStartKey(TODAY);

  it('anchors weeks on Monday', () => {
    assert.equal(start, TODAY);
    assert.equal(addDays(start, -7), '2026-09-14');
  });

  it('sums volume = weight × reps over completed sets only', () => {
    const last = weekTotals(data.sessions, addDays(start, -7));
    assert.equal(last.workouts, 3);
    assert.ok(last.volume > 0 && last.sets > 0);
    const sessions: Record<string, Session> = {
      [TODAY]: { label: 'Push A', exercises: { x: [row('1', 100, 5, true), row('2', 100, 5, false)] } },
    };
    assert.equal(weekTotals(sessions, start).volume, 500);
  });

  it('"through weekday" excludes later days', () => {
    const wed = weekTotals(data.sessions, addDays(start, -7), 2).workouts;
    assert.equal(wed, 2); // Mon + Wed
  });

  it('counts a streak of consecutive 3-workout weeks', () => {
    assert.equal(streakWeeks(data.sessions, TODAY), 5);
  });

  it('history is newest first and recents follow it', () => {
    const hist = buildHistory(data.sessions);
    assert.equal(hist['barbell-bench-press'].length, 5);
    assert.ok(hist['barbell-bench-press'][0].date > hist['barbell-bench-press'][4].date);
    assert.equal(previousEntry(hist['barbell-bench-press'], TODAY)?.date, '2026-09-14');
    assert.equal(buildRecents(data.sessions)[0].lastDate, '2026-09-18'); // Legs Friday
  });
});

describe('reducer', () => {
  const at = 1_000;
  const base = (): AppData => reducer(initialData, { type: 'select', id: 'barbell-bench-press', date: TODAY });
  const ids = (s: AppData) => s.sessions[TODAY].exercises['barbell-bench-press'].map((r) => r.id);

  it('select seeds 3 empty rows for a brand-new exercise, and a row per previous set otherwise', () => {
    assert.equal(ids(base()).length, 3);

    const demo = buildDemoData(TODAY);
    const s = reducer({ ...demo, activeExerciseId: null }, { type: 'select', id: 'lat-pulldown', date: TODAY });
    assert.equal(s.sessions[TODAY].exercises['lat-pulldown'].length, 3);
    const four = reducer(
      { ...initialData, sessions: { '2026-09-14': { label: 'Push A', exercises: { x: [1, 2, 3, 4].map((n) => ({ ...row(String(n), 50, 10, true) })) } } } },
      { type: 'select', id: 'x', date: TODAY },
    );
    assert.equal(four.sessions[TODAY].exercises.x.length, 4);
  });

  it('selecting again keeps rows that already exist', () => {
    let s = base();
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '1', weight: 60, reps: 8, at });
    s = reducer(s, { type: 'select', id: 'barbell-bench-press', date: TODAY });
    assert.equal(s.sessions[TODAY].exercises['barbell-bench-press'][0].done, true);
  });

  it('logging locks a row; typed fields on a logged row are ignored; tapping again undoes', () => {
    let s = base();
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '1', weight: 60, reps: 8, at });
    s = reducer(s, { type: 'setField', date: TODAY, rowId: '1', field: 'weight', value: 999 });
    assert.equal(s.sessions[TODAY].exercises['barbell-bench-press'][0].weight, 60);
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '1', weight: 60, reps: 8, at });
    const r = s.sessions[TODAY].exercises['barbell-bench-press'][0];
    assert.equal(r.done, false);
    assert.equal(r.at, undefined);
  });

  it('flags a PR only when est. 1RM beats everything logged before — never the first ever set', () => {
    let s = base();
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '1', weight: 60, reps: 8, at });
    assert.equal(s.sessions[TODAY].exercises['barbell-bench-press'][0].pr, false); // baseline
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '2', weight: 60, reps: 8, at });
    assert.equal(s.sessions[TODAY].exercises['barbell-bench-press'][1].pr, false); // equal isn't a PR
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '3', weight: 62.5, reps: 8, at });
    assert.equal(s.sessions[TODAY].exercises['barbell-bench-press'][2].pr, true);
  });

  it('fill only touches unlogged rows and adds rows if the target has more sets', () => {
    let s = base();
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '1', weight: 60, reps: 8, at });
    const target = [1, 2, 3, 4].map(() => ({ weight: 65, reps: 6 }));
    s = reducer(s, { type: 'fill', date: TODAY, values: target });
    const rows = s.sessions[TODAY].exercises['barbell-bench-press'];
    assert.equal(rows.length, 4);
    assert.equal(rows[0].weight, 60); // logged row untouched
    assert.deepEqual([rows[1].weight, rows[3].reps], [65, 6]);
  });

  it('remove drops only an unlogged last row and never the final row', () => {
    let s = base();
    s = reducer(s, { type: 'removeSet', date: TODAY });
    assert.equal(ids(s).length, 2);
    s = reducer(s, { type: 'toggle', date: TODAY, rowId: '2', weight: 60, reps: 8, at });
    s = reducer(s, { type: 'removeSet', date: TODAY });
    assert.equal(ids(s).length, 2); // last row is logged
    let one = reducer(initialData, { type: 'select', id: 'y', date: TODAY });
    for (let i = 0; i < 5; i++) one = reducer(one, { type: 'removeSet', date: TODAY });
    assert.equal(one.sessions[TODAY].exercises.y.length, 1); // 3 → 1, then it stops
  });

  it('new rows get unique ids even after removals', () => {
    let s = base();
    s = reducer(s, { type: 'removeSet', date: TODAY });
    s = reducer(s, { type: 'addSet', date: TODAY });
    assert.equal(new Set(ids(s)).size, ids(s).length);
  });
});

describe('rest timer engine', () => {
  const T0 = 1_000_000;

  it('formats mm:ss', () => {
    assert.equal(fmt(30), '0:30');
    assert.equal(fmt(105), '1:45');
    assert.equal(fmt(600), '10:00');
    assert.equal(fmt(-5), '0:00');
  });

  it('counts down from a timestamp and finishes only at zero', () => {
    const s = startTimer(idleTimer, 60, 'Rest', T0);
    assert.equal(remainingMs(s, T0 + 15_000), 45_000);
    assert.equal(finishTimer(s, T0 + 59_000), s); // not yet
    assert.equal(finishTimer(s, T0 + 60_000).status, 'done');
    assert.equal(remainingMs(finishTimer(s, T0 + 61_000), T0 + 61_000), 0);
  });

  it('warns only during the final 10 seconds of a running timer', () => {
    const s = startTimer(idleTimer, 30, null, T0);
    assert.equal(isWarning(s, T0 + 19_000), false);
    assert.equal(isWarning(s, T0 + 20_000), true);
    assert.equal(isWarning(s, T0 + 30_000), false); // at zero it's done, not warning
    assert.equal(isWarning(pauseTimer(s, T0 + 25_000), T0 + 26_000), false);
  });

  it('pause freezes the clock and resume continues from where it stopped', () => {
    const s = startTimer(idleTimer, 60, null, T0);
    const p = pauseTimer(s, T0 + 20_000);
    assert.equal(remainingMs(p, T0 + 500_000), 40_000);
    const r = resumeTimer(p, T0 + 500_000);
    assert.equal(remainingMs(r, T0 + 510_000), 30_000);
  });

  it('+15s extends both the countdown and the bar, while running or paused', () => {
    const s = startTimer(idleTimer, 30, null, T0);
    const plus = addSeconds(s, 15, T0 + 10_000);
    assert.equal(remainingMs(plus, T0 + 10_000), 35_000);
    assert.equal(plus.total, 45_000);
    const p = addSeconds(pauseTimer(s, T0 + 10_000), 15, T0 + 10_000);
    assert.equal(remainingMs(p, T0 + 99_000), 35_000);
    assert.equal(addSeconds(finishTimer(s, T0 + 30_000), 15, T0 + 30_000).status, 'done');
  });

  it('starting again replaces the run and bumps runId; skip returns to idle', () => {
    const a = startTimer(idleTimer, 60, 'A', T0);
    const b = startTimer(a, 90, 'B', T0 + 5_000);
    assert.equal(b.runId, a.runId + 1);
    assert.equal(remainingMs(b, T0 + 5_000), 90_000);
    assert.equal(skipTimer(b).status, 'idle');
  });

  it('progress runs 1 → 0', () => {
    const s = startTimer(idleTimer, 60, null, T0);
    assert.equal(progressOf(s, T0), 1);
    assert.equal(progressOf(s, T0 + 30_000), 0.5);
    assert.equal(progressOf(finishTimer(s, T0 + 60_000), T0 + 60_000), 0);
  });

  it('settings loader survives garbage', () => {
    assert.deepEqual(parseTimerSettings(null), defaultTimerSettings);
    assert.deepEqual(parseTimerSettings('{nope'), defaultTimerSettings);
    const s = parseTimerSettings(JSON.stringify({ saved: [{ id: 'a', label: 'Squat', seconds: 105 }, { id: 5 }, null], defaultSeconds: -1, autoStart: 'yes' }));
    assert.equal(s.saved.length, 1);
    assert.equal(s.defaultSeconds, 90);
    assert.equal(s.autoStart, true);
  });

  it('names unnamed timers after their length', () => {
    assert.equal(tidyTimerLabel('  ', 105), 'Rest 1:45');
    assert.equal(tidyTimerLabel('  Heavy   Squats ', 105), 'Heavy Squats');
  });
});

describe('calendar grid', () => {
  it('is Monday-first and always 6 weeks tall', () => {
    const g = monthGrid('2026-09-15'); // Sep 1 2026 is a Tuesday
    assert.equal(g.length, 6);
    assert.ok(g.every((w) => w.length === 7));
    assert.deepEqual(g[0].slice(0, 3), [null, '2026-09-01', '2026-09-02']);
    assert.equal(g.flat().filter(Boolean).length, 30);
    assert.equal(g[4][2], '2026-09-30'); // Wed
    assert.equal(g[5].every((c) => c === null), true);
  });

  it('handles a month that starts on Monday and shifts across year ends', () => {
    assert.equal(monthGrid('2026-06-10')[0][0], '2026-06-01'); // Jun 1 2026 is Monday
    assert.equal(shiftMonth('2026-12-20', 1), '2027-01-01');
    assert.equal(shiftMonth('2026-01-31', -1), '2025-12-01');
    assert.equal(daysInMonth('2028-02-10'), 29);
    assert.equal(monthTitle('2026-09-21'), 'September 2026');
  });
});

describe('attendance', () => {
  const D = (n: number) => addDays(TODAY, n); // TODAY is a Monday

  it('explicit marks win; days with logged sets are derived Present', () => {
    const sessions: Record<string, Session> = {
      [D(-1)]: { label: 'x', exercises: { a: [row('1', 50, 5, true)] } },
      [D(-2)]: { label: 'x', exercises: { a: [row('1', 50, 5, true)] } },
      [D(-3)]: { label: 'x', exercises: { a: [row('1', 50, 5, false)] } }, // nothing logged
    };
    const map = resolveStatuses({ [D(-2)]: 'absent', [D(-5)]: 'holiday' }, sessions);
    assert.equal(map[D(-1)], 'present');
    assert.equal(map[D(-2)], 'absent');
    assert.equal(map[D(-3)], undefined);
    assert.equal(map[D(-5)], 'holiday');
  });

  it('rate = present / (present + absent); holidays are excused', () => {
    const map: StatusMap = { [D(-1)]: 'present', [D(-2)]: 'present', [D(-3)]: 'present', [D(-4)]: 'absent', [D(-5)]: 'holiday' };
    const s = attendanceStats(map, TODAY);
    assert.deepEqual([s.present, s.absent, s.holiday, s.logged, s.rate], [3, 1, 1, 4, 75]);
    assert.equal(attendanceStats({}, TODAY).rate, null);
  });

  it('streak: present adds, holiday pauses, absent or a missed day breaks', () => {
    const p = (...offs: number[]) => Object.fromEntries(offs.map((o) => [D(o), 'present' as const]));
    assert.equal(streakOf(p(-1, -2, -3), TODAY), 3); // today still in progress
    assert.equal(streakOf(p(0, -1, -2), TODAY), 3); // today counts once present
    assert.equal(streakOf({ ...p(-1, -3, -4), [D(-2)]: 'holiday' }, TODAY), 3); // holiday pauses
    assert.equal(streakOf({ ...p(-1, -3), [D(-2)]: 'absent' }, TODAY), 1); // absent breaks
    assert.equal(streakOf(p(-1, -3), TODAY), 1); // unmarked gap breaks
    assert.equal(streakOf({ ...p(-1, -2), [D(0)]: 'absent' }, TODAY), 0); // absent today
    assert.equal(streakOf({}, TODAY), 0);
    assert.equal(streakOf({ [D(-1)]: 'holiday' }, TODAY), 0);
  });

  it('a long run stops at the first record and never loops forever', () => {
    const map = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [D(-i - 1), 'present' as const]));
    assert.equal(streakOf(map, TODAY), 30);
  });

  it('demo attendance never overrides real training days', () => {
    const demo = buildDemoData(TODAY);
    const marks = buildDemoAttendance(TODAY, demo.sessions);
    assert.ok(Object.keys(marks).every((d) => !demo.sessions[d]));
    assert.ok(Object.values(marks).includes('absent') && Object.values(marks).includes('holiday'));
  });
});

describe('BMI engine', () => {
  it('BMI = kg ÷ m²', () => {
    assert.ok(Math.abs(bmiOf(70, 175) - 22.857) < 0.001);
    assert.ok(Math.abs(bmiOf(100, 200) - 25) < 1e-9);
  });

  it('classifies on the displayed one-decimal value at every boundary', () => {
    assert.equal(categoryOf(18.44), 'underweight');
    assert.equal(categoryOf(18.5), 'normal');
    assert.equal(categoryOf(24.9), 'normal');
    assert.equal(categoryOf(24.96), 'overweight'); // displays as 25.0
    assert.equal(categoryOf(29.9), 'overweight');
    assert.equal(categoryOf(30), 'obese');
    assert.equal(categoryOf(45), 'obese');
  });

  it('normal-range weight span brackets a healthy BMI at that height', () => {
    const r = normalRangeKg(178);
    assert.equal(categoryOf(bmiOf(r.min + 0.01, 178)), 'normal');
    assert.equal(categoryOf(bmiOf(r.max, 178)), 'normal');
    assert.equal(categoryOf(bmiOf(r.max + 1, 178)), 'overweight');
    assert.ok(r.min > 58 && r.min < 59.5);
  });

  it('colors a change by what it does to your band, not by direction', () => {
    // 178 cm: 85 kg is overweight (26.8), 80 kg is 25.2, 75 kg is normal
    assert.equal(deltaTone(85, 80, 178), 'toward');
    assert.equal(deltaTone(80, 85, 178), 'away');
    assert.equal(deltaTone(70, 71, 178), 'neutral'); // inside normal both times
    assert.equal(deltaTone(50, 55, 178), 'toward'); // underweight, gaining
    assert.equal(deltaTone(60, 70, 178), 'neutral'); // both in normal
    assert.equal(deltaTone(85, 80, null), 'neutral'); // no height, no opinion
  });

  it('height conversions round-trip', () => {
    assert.deepEqual(cmToFtIn(177.8), { ft: 5, inch: 10 });
    assert.deepEqual(cmToFtIn(182.88), { ft: 6, inch: 0 });
    assert.deepEqual(cmToFtIn(182), { ft: 6, inch: 0 }); // 11.65″ carries to the next foot
    assert.ok(Math.abs(ftInToCm(5, 10) - 177.8) < 1e-9);
    assert.equal(fmtHeight(177.8, 'ftin'), '5′ 10″');
    assert.equal(fmtHeight(177.8, 'cm'), '178 cm');
    assert.equal(clampHeightCm(50), 100);
    assert.equal(clampHeightCm(300), 250);
  });

  it('deltas compare each entry with the one before it', () => {
    const e = (id: string, at: number, kg: number) => ({ id, date: '2026-09-01', at, kg });
    const v = withDeltas([e('a', 1, 80), e('b', 2, 79.2), e('c', 3, 79.6)]);
    assert.equal(v[0].delta, null);
    assert.ok(Math.abs(v[1].delta! + 0.8) < 1e-9);
    assert.ok(Math.abs(v[2].delta! - 0.4) < 1e-9);
    assert.equal(v[2].prevKg, 79.2);
  });

  it('loader keeps valid rows, sorts them, and survives garbage', () => {
    assert.equal(parseBody(null), null);
    assert.equal(parseBody('{nope'), null);
    const b = parseBody(JSON.stringify({
      heightCm: 999, heightUnit: 'ftin',
      entries: [{ id: 'b', date: '2026-09-02', at: 2, kg: 71 }, { id: 'a', date: '2026-09-01', at: 1, kg: 72 }, { id: 'x', date: 'd', at: 3, kg: 5 }, null],
    }))!;
    assert.deepEqual(b.entries.map((x) => x.id), ['a', 'b']);
    assert.equal(b.heightCm, null); // out of range
    assert.equal(b.heightUnit, 'ftin');
  });

  it('formats 12-hour time', () => {
    const at = (h: number, m: number) => new Date(2026, 8, 21, h, m).getTime();
    assert.equal(fmtTime(at(0, 5)), '12:05 AM');
    assert.equal(fmtTime(at(13, 30)), '1:30 PM');
    assert.equal(fmtTime(at(12, 0)), '12:00 PM');
  });
});

describe('BMI gauge geometry', () => {
  const W = 300;
  it('segments span the full width with 4pt gaps and proportional sizes', () => {
    const segs = gaugeSegments(W);
    assert.equal(segs.length, 4);
    const last = segs[3];
    assert.ok(Math.abs(last.x + last.w - W) < 1e-9);
    assert.ok(segs[3].w > segs[1].w && segs[1].w > segs[0].w); // obese (15 span → 10) > normal (6.5) > under (3.5)
  });

  it('marker sits at the edges, on segment boundaries, and never leaves the bar', () => {
    const segs = gaugeSegments(W);
    assert.equal(markerX(15, W), 0);
    assert.ok(Math.abs(markerX(40, W) - W) < 1e-9);
    assert.equal(markerX(-5, W), 0); // clamped
    assert.ok(Math.abs(markerX(999, W) - W) < 1e-9);
    assert.ok(Math.abs(markerX(18.5, W) - segs[1].x) < 1e-9); // start of Normal
    assert.ok(Math.abs(markerX(25, W) - segs[2].x) < 1e-9);
    assert.ok(Math.abs(markerX(30, W) - segs[3].x) < 1e-9);
  });

  it('marker is monotonic in BMI', () => {
    let prev = -1;
    for (let b = 15; b <= 40; b += 0.5) {
      const x = markerX(b, W);
      assert.ok(x >= prev, `x(${b}) went backwards`);
      prev = x;
    }
  });
});
