import { zipSync, strToU8 } from 'fflate';

import { addDays } from '../lib/dates';
import { bestStreak, goalProgress, monthProgress, recentRate, weekBests, weekProgress, weightsInRange } from '../lib/insights';
import { gridToRows, matchExercise, planFileError, planNameFromFile, textToGrid, xlsxToGrid } from '../lib/plans';
import type { StatusMap } from '../lib/attendance';
import type { Exercise } from '../types';
import { reducer, initialData } from '../store/reducer';

/** 2026-11-02 is a Monday. */
const TODAY = '2026-11-04';

describe('attendance stats', () => {
  const marks: StatusMap = {
    '2026-10-26': 'present',
    '2026-11-02': 'present',
    '2026-11-03': 'present',
    '2026-11-04': 'present',
    '2026-10-20': 'absent',
    '2026-10-21': 'holiday',
  };

  it('counts this week against the goal and last week', () => {
    expect(weekProgress(marks, TODAY, 5)).toEqual({ done: 3, goal: 5, change: 2, percent: 60 });
    expect(weekProgress(marks, TODAY, 2).percent).toBe(100);
  });

  it('scores a month out of 100 and leaves holidays out', () => {
    expect(monthProgress(marks, '2026-10-01')).toEqual({ present: 1, absent: 1, holiday: 1, counted: 2, rate: 50 });
    expect(monthProgress(marks, '2026-08-01').rate).toBeNull();
  });

  it('best streak survives a holiday and ends on a gap or an absence', () => {
    expect(bestStreak({ '2026-01-01': 'present', '2026-01-02': 'holiday', '2026-01-03': 'present', '2026-01-05': 'present' })).toBe(2);
    expect(bestStreak({})).toBe(0);
  });

  it('recent rate needs a marked day', () => {
    expect(recentRate({}, TODAY)).toBeNull();
    expect(recentRate(marks, TODAY)).toBe(80);
  });
});

describe('weight', () => {
  it('range keeps only recent entries', () => {
    const entry = (date: string) => ({ id: date, date, at: 0, kg: 70 });
    const all = [entry('2026-01-01'), entry('2026-09-01'), entry('2026-11-01')];
    expect(weightsInRange(all, TODAY, 'm1')).toHaveLength(1);
    expect(weightsInRange(all, TODAY, 'm3')).toHaveLength(2);
    expect(weightsInRange(all, TODAY, 'all')).toHaveLength(3);
  });

  it('goal progress runs from the first weight to the goal', () => {
    expect(goalProgress(76.4, 72.5, 70)).toMatchObject({ percent: 61, direction: 'lose' });
    expect(goalProgress(60, 62, 70).direction).toBe('gain');
    expect(goalProgress(76, 70, 70)).toEqual({ percent: 100, left: 0, direction: 'reached' });
    expect(goalProgress(70, 75, 72).percent).toBe(0); // a goal behind the start is not progress
  });
});

describe('week by week', () => {
  const session = (date: string, weight: number, reps: number) => ({ date, sets: [{ weight, reps }] });

  it('marks a week PR only when it beats every earlier week, and never the first', () => {
    const { metric, weeks } = weekBests([session('2026-11-02', 30, 5), session('2026-10-26', 27.5, 6), session('2026-10-19', 27.5, 8), session('2026-10-12', 25, 8)], TODAY, 'reps');
    expect(metric).toBe('kg');
    expect(weeks.map((w) => [w.value, w.pr])).toEqual([[25, false], [27.5, true], [27.5, false], [30, true]]);
    expect(weeks[3].weeksAgo).toBe(0);
    expect(weeks[0].weeksAgo).toBe(3);
  });

  it('keeps the best set of a week and shows the last six weeks, with PRs judged on all of history', () => {
    const history = [100, 10, 20, 30, 40, 50, 60, 70].map((kg, i) => session(addDays('2026-09-14', i * 7), kg, 5));
    const { weeks } = weekBests(history, TODAY, 'reps');
    expect(weeks).toHaveLength(6);
    expect(weeks.some((w) => w.pr)).toBe(false); // nothing beats the 100 kg week before the window
  });

  it('uses reps with no weight and time for holds, and copes with nothing logged', () => {
    expect(weekBests([session('2026-11-02', 0, 12), session('2026-10-26', 0, 10)], TODAY, 'reps').metric).toBe('reps');
    expect(weekBests([session('2026-11-02', 0, 60)], TODAY, 'time').metric).toBe('time');
    expect(weekBests(undefined, TODAY, 'reps').weeks).toEqual([]);
  });
});

describe('plan files', () => {
  it('rejects the wrong type, old .xls, and files that are too big or empty', () => {
    expect(planFileError('plan.pdf', 10)).toMatch(/can’t be used/);
    expect(planFileError('plan.xls', 10)).toMatch(/\.xlsx/);
    expect(planFileError('plan.csv', 3 * 1024 * 1024)).toMatch(/too big/);
    expect(planFileError('plan.txt', 0)).toMatch(/empty/);
    expect(planFileError('plan.xlsx', 100)).toBeNull();
  });

  it('reads .txt lines without a header', () => {
    expect(gridToRows(textToGrid('Barbell Bench Press, 4, 10\r\nCable Fly, 3, 12\n\n'))).toEqual([
      { name: 'Barbell Bench Press', sets: 4, reps: 10 },
      { name: 'Cable Fly', sets: 3, reps: 12 },
    ]);
  });

  it('reads CSV headers in any order, quotes, a BOM, and fills or limits bad numbers', () => {
    const rows = gridToRows(textToGrid('﻿Reps,Exercise,Sets\n10,"Press, Machine",40\nabc,Row,x\n5,123,3\nRow,row,row'));
    expect(rows).toEqual([
      { name: 'Press, Machine', sets: 10, reps: 10 },
      { name: 'Row', sets: 3, reps: null },
    ]);
  });

  it('reads the first sheet of an .xlsx, shared and inline strings alike', () => {
    const sheet =
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>Reps</t></is></c></row>' +
      '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>4</v></c><c r="C2"><v>10</v></c></row></sheetData></worksheet>';
    const strings = '<sst><si><t>Exercise</t></si><si><t>Sets</t></si><si><t>Curl &amp; Press</t></si></sst>';
    const bytes = zipSync({ 'xl/worksheets/sheet1.xml': strToU8(sheet), 'xl/sharedStrings.xml': strToU8(strings) });
    expect(gridToRows(xlsxToGrid(bytes))).toEqual([{ name: 'Curl & Press', sets: 4, reps: 10 }]);
  });

  it('throws on a file that is not really a workbook', () => {
    expect(() => xlsxToGrid(strToU8('not a zip'))).toThrow();
  });

  it('turns a file name into a plan name', () => {
    expect(planNameFromFile('push-day_v2.xlsx')).toBe('Push Day V2');
  });

  it('matches exact names and aliases, never a one-word guess', () => {
    const all = [
      { id: 'a', name: 'Barbell Bench Press', group: 'Chest', split: 'Push', aliases: ['BB Bench'] },
      { id: 'b', name: 'Cable Fly', group: 'Chest', split: 'Push' },
    ] as unknown as Exercise[];
    expect(matchExercise('barbell bench press', all)?.id).toBe('a');
    expect(matchExercise('bb bench', all)?.id).toBe('a');
    expect(matchExercise('Bench Press', all)?.id).toBe('a');
    expect(matchExercise('Bench', all)).toBeNull();
    expect(matchExercise('Pec Fly Machine', all)).toBeNull();
  });
});

describe('starting a plan', () => {
  it('prefills reps, leaves weight empty, and logs nothing', () => {
    const routine = { id: 'p', name: 'Push Day', items: [{ exerciseId: 'bench', sets: 2, reps: 10 }, { exerciseId: 'plank', sets: 1, reps: 30 }] };
    const next = reducer(initialData, { type: 'startRoutine', date: TODAY, routine, modes: { plank: 'time' } });
    const session = next.sessions[TODAY];
    expect(session.label).toBe('Push Day');
    expect(session.exercises.bench.map((r) => [r.weight, r.reps, r.done])).toEqual([[null, 10, false], [null, 10, false]]);
    expect(session.exercises.plank[0].reps).toBeNull(); // a rep count isn't a duration
  });
});
