import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { MonthlyPhoto } from '../types';
import { BROKEN_PHOTO, extensionOf, isImageBytes, photoError, photoMime } from './photoCheck';

const STORAGE_KEY = 'minimalist-gym-tracker/photos/v1';
const WEB_DB = 'logsetgo-photos';
const WEB_STORE = 'photos';
/** Marks a photo held in IndexedDB. Browser storage for this app is far too small for a 10 MB image. */
const WEB_PREFIX = 'idb:';

export interface PickedPhoto {
  uri: string;
  name: string;
  mimeType: string | null;
  size: number | null;
}

export type PhotoPick = { ok: true; photo: PickedPhoto } | { ok: false; cancelled: boolean; error?: string };

const sizeOf = (uri: string, reported: number | null | undefined) => {
  if (reported != null || Platform.OS === 'web') return reported ?? null;
  try {
    return new File(uri).size;
  } catch {
    return null;
  }
};

function checked(photo: PickedPhoto): PhotoPick {
  const error = photoError(photo.name, photo.mimeType, photo.size);
  return error ? { ok: false, cancelled: false, error } : { ok: true, photo };
}

/** Opens the camera. On the web the browser offers its own camera or file prompt. */
export async function takePhoto(): Promise<PhotoPick> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { ok: false, cancelled: false, error: 'Camera access is off. Allow it in your phone’s settings, or choose a file instead.' };
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    const asset = res.assets?.[0];
    if (res.canceled || !asset) return { ok: false, cancelled: true };
    return checked({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType ?? null, size: sizeOf(asset.uri, asset.fileSize) });
  } catch (e) {
    return { ok: false, cancelled: false, error: e instanceof Error ? e.message : 'Couldn’t open the camera.' };
  }
}

/** Any file can be chosen, so an unsupported one gets a clear warning instead of being greyed out. */
export async function chooseFile(): Promise<PhotoPick> {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    const asset = res.assets?.[0];
    if (res.canceled || !asset) return { ok: false, cancelled: true };
    const result = checked({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null, size: sizeOf(asset.uri, asset.size) });
    if (!result.ok) return result;
    const bytes = Platform.OS === 'web' ? new Uint8Array(await (await fetch(asset.uri)).arrayBuffer()) : await new File(asset.uri).bytes();
    return isImageBytes(bytes) ? result : { ok: false, cancelled: false, error: BROKEN_PHOTO };
  } catch (e) {
    return { ok: false, cancelled: false, error: e instanceof Error ? e.message : 'Couldn’t read that file.' };
  }
}

function webRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(WEB_DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(WEB_STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = run(open.result.transaction(WEB_STORE, mode).objectStore(WEB_STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

function saveNative(picked: PickedPhoto, date: string) {
  const dir = new Directory(Paths.document, 'monthly-photos');
  dir.create({ idempotent: true, intermediates: true });
  const extension = extensionOf(picked.name) || 'jpg';
  // A fresh name each time, or a replaced photo would keep showing from the image cache.
  const dest = new File(dir, `${date}-${Date.now()}.${extension}`);
  if (dest.exists) dest.delete();
  new File(picked.uri).copy(dest);
  return dest.uri;
}

/** One image per exercise, picked by you as its form demo. */
const FORM_KEY = 'minimalist-gym-tracker/form-images/v1';

export async function loadFormImages(): Promise<Record<string, MonthlyPhoto>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(FORM_KEY)) ?? '{}') as Record<string, MonthlyPhoto>;
  } catch {
    return {};
  }
}

const formKey = (exerciseId: string) => `form-${exerciseId.replace(/[^\w-]/g, '_')}`;

export async function saveFormImage(picked: PickedPhoto, exerciseId: string): Promise<MonthlyPhoto> {
  const date = formKey(exerciseId);
  let uri: string;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(picked.uri)).blob();
    await webRequest('readwrite', (store) => store.put(blob, date));
    uri = `${WEB_PREFIX}${date}`;
  } else {
    uri = saveNative(picked, date);
  }
  const image: MonthlyPhoto = { date, uri, mimeType: photoMime(picked.name, picked.mimeType) ?? 'image/jpeg', size: picked.size ?? 0 };
  await AsyncStorage.setItem(FORM_KEY, JSON.stringify({ ...(await loadFormImages()), [exerciseId]: image }));
  return image;
}

export async function removeFormImage(exerciseId: string) {
  const { [exerciseId]: _removed, ...rest } = await loadFormImages();
  await AsyncStorage.setItem(FORM_KEY, JSON.stringify(rest));
}

export async function loadPhotos(): Promise<Record<string, MonthlyPhoto>> {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}') as Record<string, MonthlyPhoto>;
    return Object.fromEntries(Object.entries(parsed).filter(([date, p]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof p?.uri === 'string'));
  } catch {
    return {};
  }
}

/** Stores the photo on this device under the given calendar date. */
export async function savePhoto(picked: PickedPhoto, date: string): Promise<MonthlyPhoto> {
  let uri: string;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(picked.uri)).blob();
    await webRequest('readwrite', (store) => store.put(blob, date));
    uri = `${WEB_PREFIX}${date}`;
  } else {
    uri = saveNative(picked, date);
  }
  const photo: MonthlyPhoto = { date, uri, mimeType: photoMime(picked.name, picked.mimeType) ?? 'image/jpeg', size: picked.size ?? 0 };
  // One photo per month: saving again replaces that month's photo.
  const stored = await loadPhotos();
  const kept = Object.fromEntries(Object.entries(stored).filter(([d]) => d.slice(0, 7) !== date.slice(0, 7)));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...kept, [date]: photo }));
  if (Platform.OS !== 'web') {
    for (const [d, old] of Object.entries(stored)) {
      if (d.slice(0, 7) !== date.slice(0, 7) || old.uri === uri) continue;
      try {
        new File(old.uri).delete();
      } catch {
        // The old file may already be gone; the record is what matters.
      }
    }
  }
  return photo;
}

/** A URI an Image can show. Web photos need a fresh object URL each session. */
export async function photoDisplayUri(photo: MonthlyPhoto): Promise<string | null> {
  if (!photo.uri.startsWith(WEB_PREFIX)) return photo.uri;
  try {
    const blob = await webRequest<Blob | undefined>('readonly', (store) => store.get(photo.date));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}
