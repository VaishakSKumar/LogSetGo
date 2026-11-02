import { unzipSync, strFromU8 } from 'fflate';

import type { Exercise, Routine, RoutineItem } from '../types';
import { scoreExercise } from './search';

export const MAX_PLAN_MB = 2;
export const MAX_PLAN_BYTES = MAX_PLAN_MB * 1024 * 1024;
export const MAX_PLAN_ROWS = 50;
export const MIN_PLAN_SETS = 1;
export const MAX_PLAN_SETS = 10;
export const DEFAULT_PLAN_SETS = 3;
const MAX_NAME = 60;

export const PLAN_FORMATS = 'Excel (.xlsx), CSV or .txt';

export interface PlanRow {
  name: string;
  sets: number;
  reps: number | null;
}

export type PlanFileKind = 'text' | 'xlsx' | 'xls' | null;

export const planFileKind = (name: string): PlanFileKind => {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase();
  if (ext === 'csv' || ext === 'txt') return 'text';
  if (ext === 'xlsx') return 'xlsx';
  return ext === 'xls' ? 'xls' : null;
};

/** The on-screen warning for a chosen file, or null when it can be read. */
export function planFileError(name: string, size: number | null | undefined): string | null {
  const kind = planFileKind(name);
  if (kind === 'xls') return 'Old .xls files can’t be read. Save it as .xlsx in Excel and try again.';
  if (!kind) return `That file can’t be used. Use ${PLAN_FORMATS}.`;
  if (size != null && size > MAX_PLAN_BYTES) return `That file is too big. The limit is ${MAX_PLAN_MB} MB.`;
  if (size === 0) return 'That file is empty.';
  return null;
}

/** "push-day.xlsx" → "Push Day" */
export function planNameFromFile(file: string): string {
  return file
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .slice(0, MAX_NAME);
}

/** One line of a CSV or .txt file. Commas, tabs or semicolons all work, and quotes keep a comma inside a name. */
function splitLine(line: string): string[] {
  const delimiter = line.includes('\t') ? '\t' : line.includes(',') ? ',' : ';';
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && quoted && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (c === '"') quoted = !quoted;
    else if (c === delimiter && !quoted) {
      cells.push(cell);
      cell = '';
    } else cell += c;
  }
  cells.push(cell);
  return cells.map((v) => v.trim());
}

export const textToGrid = (text: string): string[][] =>
  text
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim())
    .map(splitLine);

const wholeNumber = (raw: string | undefined): number | null => {
  const n = Number(raw);
  return raw && Number.isInteger(n) ? n : null;
};

/** Turns a table into plan rows. A header row can put the columns in any order; without one they are Exercise, Sets, Reps. */
export function gridToRows(grid: string[][]): PlanRow[] {
  const head = (grid[0] ?? []).map((c) => c.toLowerCase());
  const exerciseAt = head.findIndex((c) => c === 'exercise' || c === 'exercises' || c === 'name');
  const hasHeader = exerciseAt >= 0;
  const nameAt = hasHeader ? exerciseAt : 0;
  const setsAt = hasHeader ? head.indexOf('sets') : 1;
  const repsAt = hasHeader ? head.indexOf('reps') : 2;

  const rows = new Map<string, PlanRow>();
  for (const cells of hasHeader ? grid.slice(1) : grid) {
    const name = (cells[nameAt] ?? '').trim();
    if (!/\p{L}/u.test(name) || name.length > MAX_NAME) continue;
    const sets = wholeNumber(cells[setsAt]);
    const reps = wholeNumber(cells[repsAt]);
    const key = name.toLowerCase();
    if (rows.has(key)) continue;
    rows.set(key, {
      name,
      sets: Math.min(MAX_PLAN_SETS, Math.max(MIN_PLAN_SETS, sets ?? DEFAULT_PLAN_SETS)),
      reps: reps != null && reps > 0 ? Math.min(100, reps) : null,
    });
  }
  return [...rows.values()];
}

const xmlText = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

const columnOf = (ref: string) => {
  let n = 0;
  for (const c of /^[A-Z]+/.exec(ref)?.[0] ?? 'A') n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
};

const textsIn = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((m) => xmlText(m[1])).join('');

/** Reads the first sheet of an .xlsx file into a table. Throws when it isn't one. */
export function xlsxToGrid(bytes: Uint8Array): string[][] {
  const files = unzipSync(bytes, { filter: (f) => /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(f.name) });
  const sheetName = Object.keys(files)
    .filter((n) => n.startsWith('xl/worksheets/'))
    .sort((a, b) => parseInt(a.slice(19), 10) - parseInt(b.slice(19), 10))[0];
  if (!sheetName) throw new Error('No worksheet');

  const shared = files['xl/sharedStrings.xml']
    ? [...strFromU8(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textsIn(m[1]))
    : [];

  const grid: string[][] = [];
  for (const row of strFromU8(files[sheetName]).matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const cells: string[] = [];
    for (const cell of (row[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1];
      const body = cell[2] ?? '';
      const at = columnOf(/\br="([A-Z]+)/.exec(attrs)?.[1] ?? 'A');
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      const raw = /<v>([^<]*)<\/v>/.exec(body)?.[1] ?? '';
      const value = type === 's' ? (shared[Number(raw)] ?? '') : type === 'inlineStr' ? textsIn(body) : xmlText(raw);
      while (cells.length < at) cells.push('');
      cells[at] = value.trim();
    }
    if (cells.some(Boolean)) grid.push(cells);
  }
  return grid;
}

export type MatchedRow = PlanRow & { exercise: Exercise | null; addNew: boolean };

/** Finds the exercise a typed name means: its exact name or alias, else a name containing every word typed. */
export function matchExercise(name: string, all: Exercise[]): Exercise | null {
  const wanted = name.trim().toLowerCase();
  const exact = all.find((e) => e.name.toLowerCase() === wanted || e.aliases?.some((a) => a.toLowerCase() === wanted));
  if (exact) return exact;
  if (wanted.split(/\s+/).length < 2) return null;
  let best: Exercise | null = null;
  let top = 0;
  for (const e of all) {
    const score = scoreExercise(e, name);
    if (score >= 80 && (score > top || (score === top && best && e.name.length < best.name.length))) {
      best = e;
      top = score;
    }
  }
  return best;
}

export const matchRows = (rows: PlanRow[], all: Exercise[]): MatchedRow[] =>
  rows.map((row) => ({ ...row, exercise: matchExercise(row.name, all), addNew: false }));

export const planDetail = (sets: number, reps: number | null | undefined) =>
  `${sets} ${sets === 1 ? 'set' : 'sets'}${reps ? ` × ${reps} reps` : ''}`;

export const exerciseCount = (n: number) => `${n} ${n === 1 ? 'exercise' : 'exercises'}`;

export function newPlan(name: string, items: RoutineItem[]): Routine {
  return { id: `plan${Date.now().toString(36)}`, name: name.trim(), items };
}
