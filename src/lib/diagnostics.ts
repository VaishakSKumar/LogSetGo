import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { pushError, type ErrorEntry } from './errorlog';

export { MAX_ERRORS, formatErrorReport, pushError, type ErrorEntry } from './errorlog';

/**
 * Local crash log. There is no server, so errors are kept on the device (last 20) and can be shared
 * from Settings → Diagnostics. Nothing is ever sent anywhere automatically.
 */
const KEY = 'minimalist-gym-tracker/errors/v1';
export async function readErrors(): Promise<ErrorEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function logError(error: unknown, context?: string) {
  try {
    const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
    const next = pushError(await readErrors(), { at: Date.now(), message: e.message, stack: e.stack, context });
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* logging must never throw */
  }
}

export async function clearErrors() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

type Handler = (e: Error, fatal?: boolean) => void;
let installed = false;

/** Records uncaught errors and unhandled promise rejections. Call once at startup. */
export function installGlobalHandlers() {
  if (installed) return;
  installed = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (ev) => void logError(ev.error ?? ev.message, 'window.onerror'));
    window.addEventListener('unhandledrejection', (ev) => void logError(ev.reason, 'unhandledrejection'));
    return;
  }
  const utils = (globalThis as { ErrorUtils?: { getGlobalHandler(): Handler; setGlobalHandler(h: Handler): void } }).ErrorUtils;
  if (utils) {
    const previous = utils.getGlobalHandler();
    utils.setGlobalHandler((e, fatal) => {
      void logError(e, fatal ? 'fatal' : 'error');
      previous(e, fatal);
    });
  }
}
