import { Pressable, Text, View } from 'react-native';

import { STATUS_META, STATUSES, type Status } from '../../lib/attendance';
import { longDate } from '../../lib/calendar';
import { colors } from '../../theme';
import { Sheet } from '../Sheet';
import { Caption } from '../ui';

interface StatusSheetProps {
  visible: boolean;
  /** the date being edited */
  date: string | null;
  current: Status | undefined;
  /** true only if you tapped a status yourself. Days that are Present purely from logged sets have nothing to clear. */
  canClear: boolean;
  isToday: boolean;
  isFuture: boolean;
  onSelect: (status: Status) => void;
  onClear: () => void;
  onClose: () => void;
}

const SUBTITLE: Record<Status, string> = {
  present: 'Open the workout logger',
  absent: 'Missed the gym',
  holiday: 'Planned rest, keeps your streak',
};

/** The three choices for a date. Future dates can only be a Holiday. */
export function StatusSheet({ visible, date, current, canClear, isToday, isFuture, onSelect, onClear, onClose }: StatusSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={date ? longDate(date) : ''}>
      <View className="px-4 pb-2">
        <Caption className="mb-3">
          {isToday ? 'Today · ' : ''}
          {current ? `Currently ${STATUS_META[current].label}` : 'Not logged yet'}
        </Caption>

        <View className="gap-2">
          {STATUSES.map((s) => {
            const meta = STATUS_META[s];
            const locked = isFuture && s !== 'holiday';
            const selected = current === s;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ disabled: locked, selected }}
                accessibilityLabel={`${meta.label}. ${locked ? 'Not available for future dates' : SUBTITLE[s]}`}
                disabled={locked}
                onPress={() => onSelect(s)}
                className="h-16 flex-row items-center rounded-2xl px-4 active:opacity-80"
                style={{
                  backgroundColor: meta.color,
                  opacity: locked ? 0.28 : 1,
                  borderWidth: selected ? 2 : 0,
                  borderColor: colors.label,
                }}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.16)' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#000' }}>{meta.letter}</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-h2" style={{ color: '#000' }}>
                    {meta.label}
                  </Text>
                  <Text className="text-caption" style={{ color: 'rgba(0,0,0,0.62)' }}>
                    {locked ? 'Not available for future dates' : SUBTITLE[s]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {canClear ? (
          <Pressable
            accessibilityRole="button"
            onPress={onClear}
            className="mt-2 h-11 items-center justify-center rounded-full bg-fill active:opacity-70"
          >
            <Text className="text-body text-label">Clear status</Text>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}
