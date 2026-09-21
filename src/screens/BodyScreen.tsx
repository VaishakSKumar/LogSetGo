import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeightCard } from '../components/body/HeightCard';
import { HeightSheet } from '../components/body/HeightSheet';
import { HeroCard } from '../components/body/HeroCard';
import { ProgressCard } from '../components/body/ProgressCard';
import { UpdateWeightSheet } from '../components/body/UpdateWeightSheet';
import { WeightHistory } from '../components/body/WeightHistory';
import { headerDate } from '../lib/dates';
import { useGym } from '../store/gym';
import { useTimer } from '../store/timer';

/** Room for the docked rest-timer banner when one is running. */
const TIMER_SPACE = 150;

/** BMI & Weight tab: hero metrics, height setup, progress trend, and the full log. */
export function BodyScreen() {
  const { realToday } = useGym();
  const { timer } = useTimer();
  const insets = useSafeAreaInsets();
  const [weightOpen, setWeightOpen] = useState(false);
  const [heightOpen, setHeightOpen] = useState(false);

  return (
    <View className="flex-1 bg-base">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: timer.status !== 'idle' ? TIMER_SPACE : insets.bottom + 32 }}
      >
        <View>
          <Text className="text-caption uppercase tracking-wider text-muted/60">{headerDate(realToday)}</Text>
          <Text className="py-1 text-h1 text-label">BMI & Weight</Text>
        </View>

        <HeroCard onUpdate={() => setWeightOpen(true)} onEditHeight={() => setHeightOpen(true)} />
        <HeightCard onEdit={() => setHeightOpen(true)} />
        <ProgressCard />
        <WeightHistory />
      </ScrollView>

      <UpdateWeightSheet visible={weightOpen} onClose={() => setWeightOpen(false)} />
      <HeightSheet visible={heightOpen} onClose={() => setHeightOpen(false)} />
    </View>
  );
}
