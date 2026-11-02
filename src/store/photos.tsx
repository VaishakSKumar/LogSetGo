import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loadPhotos, photoDisplayUri, savePhoto, type PickedPhoto } from '../lib/photos';
import type { MonthlyPhoto } from '../types';

interface PhotosContextValue {
  /** keyed by date; null until loaded */
  photos: Record<string, MonthlyPhoto> | null;
  /** Saves the photo for that date's month, replacing any photo already there. */
  save(picked: PickedPhoto, date: string): Promise<void>;
}

const PhotosContext = createContext<PhotosContextValue | null>(null);

export function usePhotos() {
  const ctx = useContext(PhotosContext);
  if (!ctx) throw new Error('usePhotos must be used inside <PhotosProvider>');
  return ctx;
}

/** Monthly check-in photos, shared by the Gym Progress check-in and the Account tab. */
export function PhotosProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<Record<string, MonthlyPhoto> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadPhotos().then((stored) => {
      if (!cancelled) setPhotos(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<PhotosContextValue>(
    () => ({
      photos,
      save: async (picked, date) => {
        await savePhoto(picked, date);
        setPhotos(await loadPhotos());
      },
    }),
    [photos],
  );

  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

/** A URI an Image can show for a stored photo, or null while it loads. */
export function usePhotoUri(photo: MonthlyPhoto | null | undefined) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUri(null);
    if (photo) {
      void photoDisplayUri(photo).then((shown) => {
        if (!cancelled) setUri(shown);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [photo]);

  return uri;
}
