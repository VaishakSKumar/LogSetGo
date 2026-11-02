import type { ReactNode } from 'react';
import { View } from 'react-native';

import { needsMonthlyPhoto } from '../../lib/photoCheck';
import { useGym } from '../../store/gym';
import { usePhotos } from '../../store/photos';
import { MonthlyCheckin } from './MonthlyCheckin';

/** The first workout of each month offers the check-in. Skipping it stops it asking until next month. */
export function MonthlyPhotoGate({ children }: { children: ReactNode }) {
  const { today, realToday, data, actions } = useGym();
  const { photos } = usePhotos();
  const month = realToday.slice(0, 7);

  if (today !== realToday) return <>{children}</>;
  if (!photos) return <View className="flex-1 bg-base" />;
  if (!needsMonthlyPhoto(photos, realToday) || data.prefs.skippedPhotoMonth === month) return <>{children}</>;

  return <MonthlyCheckin intro="Track how you are changing. Skip it today and add it any time from Account." onSkip={() => actions.setPrefs({ skippedPhotoMonth: month })} onSaved={() => {}} />;
}
