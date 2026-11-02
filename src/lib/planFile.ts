import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { MAX_PLAN_ROWS, PLAN_FORMATS, gridToRows, planFileError, planFileKind, textToGrid, xlsxToGrid, type PlanRow } from './plans';

export type PlanPick = { ok: true; name: string; rows: PlanRow[] } | { ok: false; cancelled: boolean; error?: string };

async function readBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  return new File(uri).bytes();
}

async function readText(uri: string): Promise<string> {
  if (Platform.OS === 'web') return (await fetch(uri)).text();
  return new File(uri).text();
}

/** Lets the user pick a plan file and reads its rows. Every failure comes back as a message for the screen. */
export async function pickPlanFile(): Promise<PlanPick> {
  let asset: DocumentPicker.DocumentPickerAsset;
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return { ok: false, cancelled: true };
    asset = res.assets[0];
  } catch {
    return { ok: false, cancelled: false, error: 'Couldn’t open that file. Try again.' };
  }

  const problem = planFileError(asset.name, asset.size);
  if (problem) return { ok: false, cancelled: false, error: problem };

  try {
    const grid = planFileKind(asset.name) === 'xlsx' ? xlsxToGrid(await readBytes(asset.uri)) : textToGrid(await readText(asset.uri));
    const rows = gridToRows(grid);
    if (!rows.length) return { ok: false, cancelled: false, error: 'We found no exercises in that file. Check it matches the example.' };
    if (rows.length > MAX_PLAN_ROWS) return { ok: false, cancelled: false, error: `That file has too many exercises. The limit is ${MAX_PLAN_ROWS}.` };
    return { ok: true, name: asset.name, rows };
  } catch {
    return { ok: false, cancelled: false, error: `We couldn’t read that file. Use ${PLAN_FORMATS}.` };
  }
}
