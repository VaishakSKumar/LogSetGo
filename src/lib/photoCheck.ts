import type { MonthlyPhoto } from '../types';

export const MAX_PHOTO_MB = 10;
export const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;
export const PHOTO_FORMATS = 'GIF, JPG, PNG or WebP';

const TYPES: Record<string, string> = { gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const MIMES = new Set(Object.values(TYPES));

export const extensionOf = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase() ?? '';

/** The real type of a file: its MIME type, or its extension when the picker only reports a generic one. */
export function photoMime(name: string, mimeType: string | null | undefined): string | null {
  const mime = mimeType?.toLowerCase().split(';')[0].trim();
  if (mime && mime !== 'application/octet-stream') return MIMES.has(mime) ? mime : null;
  return TYPES[extensionOf(name)] ?? null;
}

/** The on-screen warning for a file, or null when it is allowed. */
export function photoError(name: string, mimeType: string | null | undefined, size: number | null | undefined): string | null {
  if (!photoMime(name, mimeType)) return `That file can’t be used. Only ${PHOTO_FORMATS} files are allowed.`;
  if (size == null) return 'Couldn’t read the size of that file. Try another one.';
  if (size > MAX_PHOTO_BYTES) return `That file is too big. The limit is ${MAX_PHOTO_MB} MB.`;
  return null;
}

const startsWith = (bytes: Uint8Array, start: number[], at = 0) => start.every((b, i) => bytes[at + i] === b);

/** A renamed or damaged file can pass the name and type checks, so look at how it really starts. */
export function isImageBytes(bytes: Uint8Array) {
  return (
    startsWith(bytes, [0xff, 0xd8, 0xff]) || // JPG
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) || // PNG
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) || // GIF
    (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) // WebP
  );
}

export const BROKEN_PHOTO = 'That image can’t be opened. It may be damaged. Try another one.';

/** Photo check-ins are due once per calendar month. */
export const needsMonthlyPhoto = (photos: Record<string, MonthlyPhoto>, today: string) =>
  !Object.keys(photos).some((date) => date.slice(0, 7) === today.slice(0, 7));

/** This calendar month's check-in, if there is one. */
export function monthPhoto(photos: Record<string, MonthlyPhoto>, month: string): MonthlyPhoto | null {
  const dates = Object.keys(photos).filter((date) => date.slice(0, 7) === month.slice(0, 7)).sort();
  return dates.length ? photos[dates[dates.length - 1]] : null;
}

/** The most recent check-in from before this calendar month. */
export function previousPhoto(photos: Record<string, MonthlyPhoto>, today: string): MonthlyPhoto | null {
  const earlier = Object.keys(photos).filter((date) => date.slice(0, 7) < today.slice(0, 7)).sort();
  return earlier.length ? photos[earlier[earlier.length - 1]] : null;
}
