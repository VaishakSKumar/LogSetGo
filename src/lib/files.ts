import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type SaveResult = { ok: true; how: 'download' | 'share' } | { ok: false; error: string };

/**
 * Saves text as a file.
 *  · web: triggers a normal browser download
 *  · iOS / Android: writes a temp file and opens the system share sheet (Save to Files, Drive, email…)
 */
export async function saveTextFile(name: string, text: string, mime: string): Promise<SaveResult> {
  try {
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return { ok: true, how: 'download' };
    }
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    file.write(text);
    if (!(await Sharing.isAvailableAsync())) return { ok: false, error: 'Sharing isn’t available on this device.' };
    await Sharing.shareAsync(file.uri, {
      mimeType: mime,
      dialogTitle: name,
      UTI: mime === 'application/json' ? 'public.json' : 'public.comma-separated-values-text',
    });
    return { ok: true, how: 'share' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Couldn’t save the file.' };
  }
}

export type PickResult = { ok: true; text: string; name: string } | { ok: false; cancelled: boolean; error?: string };

/** Lets the user choose a file and returns its text. Cancelling is not an error. */
export async function pickTextFile(): Promise<PickResult> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return { ok: false, cancelled: true };
    const asset = res.assets[0];
    const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
    return { ok: true, text, name: asset.name };
  } catch (e) {
    return { ok: false, cancelled: false, error: e instanceof Error ? e.message : 'Couldn’t read that file.' };
  }
}
