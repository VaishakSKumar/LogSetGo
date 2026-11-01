import type { Exercise, MuscleGroup } from '../types';

/** Cues for movement patterns, checked in order against the exercise name. */
const BY_NAME: [RegExp, string[]][] = [
  [/bench press|chest press|push-?up/i, ['Keep elbows tucked', 'Squeeze your shoulder blades together', 'Lower with control']],
  [/squat/i, ['Brace your core', 'Keep knees in line with your toes', 'Drive up through your whole foot']],
  [/deadlift|good morning/i, ['Keep your back flat', 'Hinge at the hips', 'Keep the weight close to your body']],
  [/row|pull-?up|chin-?up|pulldown/i, ['Pull with your elbows', 'Squeeze your shoulder blades', 'Avoid swinging']],
  [/overhead press|shoulder press|arnold/i, ['Brace your core', 'Press straight up', 'Don’t arch your lower back']],
  [/curl/i, ['Keep elbows by your sides', 'Avoid swinging', 'Lower slowly']],
  [/pushdown|triceps|skull/i, ['Keep upper arms still', 'Fully straighten your arms', 'Lower with control']],
  [/plank|hold/i, ['Brace your core', 'Keep your body in a straight line', 'Breathe steadily']],
  [/lunge|step-?up/i, ['Keep your chest up', 'Keep your front knee stable', 'Push through your front foot']],
];

const BY_GROUP: Record<MuscleGroup, string[]> = {
  Chest: ['Keep shoulders down and back', 'Lower with control'],
  Back: ['Keep your chest up', 'Squeeze at the end of each rep'],
  Shoulders: ['Brace your core', 'Keep the movement smooth'],
  Legs: ['Keep knees in line with your toes', 'Move through a full range'],
  Arms: ['Keep elbows steady', 'Lower slowly'],
  Core: ['Brace your core', 'Breathe steadily'],
  Cardio: ['Start at an easy pace', 'Breathe steadily'],
  Other: ['Move with control', 'Stop if you feel pain'],
};

export const cuesFor = (exercise: Pick<Exercise, 'name' | 'group' | 'cues'>): string[] =>
  exercise.cues ?? BY_NAME.find(([pattern]) => pattern.test(exercise.name))?.[1] ?? BY_GROUP[exercise.group];
