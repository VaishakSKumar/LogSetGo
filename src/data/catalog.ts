import type { Exercise, MuscleGroup, SetMode, Split } from '../types';

export const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

type Seed = [name: string, group: MuscleGroup, split: Split, aliases?: string[], defaultMode?: SetMode];

const SEEDS: Seed[] = [
  // Push
  ['Barbell Bench Press', 'Chest', 'push', ['bench', 'flat bench']],
  ['Incline Dumbbell Press', 'Chest', 'push', ['incline db press']],
  ['Incline Barbell Press', 'Chest', 'push'],
  ['Dumbbell Bench Press', 'Chest', 'push', ['db bench']],
  ['Machine Chest Press', 'Chest', 'push'],
  ['Cable Fly', 'Chest', 'push', ['cable crossover', 'pec fly']],
  ['Pec Deck', 'Chest', 'push', ['machine fly']],
  ['Push-Up', 'Chest', 'push', ['pushup']],
  ['Dip', 'Chest', 'push', ['dips', 'chest dip']],
  ['Overhead Press', 'Shoulders', 'push', ['ohp', 'military press', 'shoulder press']],
  ['Seated Dumbbell Shoulder Press', 'Shoulders', 'push', ['db shoulder press']],
  ['Dumbbell Lateral Raise', 'Shoulders', 'push', ['side raise', 'lateral raise']],
  ['Cable Lateral Raise', 'Shoulders', 'push'],
  ['Rear Delt Fly', 'Shoulders', 'pull', ['reverse fly', 'rear delt']],
  ['Face Pull', 'Shoulders', 'pull'],
  ['Triceps Pushdown', 'Arms', 'push', ['tricep pushdown', 'pressdown']],
  ['Overhead Triceps Extension', 'Arms', 'push', ['tricep extension']],
  ['Skull Crusher', 'Arms', 'push', ['lying triceps extension']],
  // Pull
  ['Pull-Up', 'Back', 'pull', ['pullup', 'chin up']],
  ['Lat Pulldown', 'Back', 'pull', ['pulldown']],
  ['Barbell Row', 'Back', 'pull', ['bent over row']],
  ['Seated Cable Row', 'Back', 'pull', ['cable row']],
  ['One-Arm Dumbbell Row', 'Back', 'pull', ['db row']],
  ['Chest-Supported Row', 'Back', 'pull', ['t-bar row']],
  ['Straight-Arm Pulldown', 'Back', 'pull'],
  ['Barbell Shrug', 'Back', 'pull', ['shrugs']],
  ['Barbell Curl', 'Arms', 'pull', ['bicep curl']],
  ['Dumbbell Curl', 'Arms', 'pull', ['db curl', 'bicep curl']],
  ['Incline Dumbbell Curl', 'Arms', 'pull'],
  ['Hammer Curl', 'Arms', 'pull'],
  ['Preacher Curl', 'Arms', 'pull'],
  ['Cable Curl', 'Arms', 'pull'],
  // Legs
  ['Barbell Back Squat', 'Legs', 'legs', ['squat']],
  ['Front Squat', 'Legs', 'legs'],
  ['Leg Press', 'Legs', 'legs'],
  ['Hack Squat', 'Legs', 'legs'],
  ['Bulgarian Split Squat', 'Legs', 'legs', ['split squat']],
  ['Walking Lunge', 'Legs', 'legs', ['lunge']],
  ['Romanian Deadlift', 'Legs', 'legs', ['rdl']],
  ['Conventional Deadlift', 'Legs', 'legs', ['deadlift']],
  ['Hip Thrust', 'Legs', 'legs', ['glute bridge']],
  ['Leg Extension', 'Legs', 'legs'],
  ['Lying Leg Curl', 'Legs', 'legs', ['hamstring curl']],
  ['Seated Leg Curl', 'Legs', 'legs', ['hamstring curl']],
  ['Standing Calf Raise', 'Legs', 'legs', ['calf raise']],
  ['Seated Calf Raise', 'Legs', 'legs'],
  // Core
  ['Cable Crunch', 'Core', 'other', ['abs']],
  ['Hanging Leg Raise', 'Core', 'other', ['abs']],
  ['Ab Wheel Rollout', 'Core', 'other', ['abs']],
  // Time-based holds & cardio — smart-detected into Time mode the first time you pick one.
  ['Plank', 'Core', 'other', undefined, 'time'],
  ['Weighted Plank', 'Core', 'other', undefined, 'time'],
  ['Side Plank', 'Core', 'other', undefined, 'time'],
  ['Hanging Leg Hold', 'Core', 'other', ['hanging hold'], 'time'],
  ['Mountain Climbers', 'Core', 'other', undefined, 'time'],
  ['Wall Sit', 'Legs', 'legs', undefined, 'time'],
  ['Dead Hang', 'Back', 'pull', undefined, 'time'],
  ['Treadmill Run', 'Cardio', 'other', ['treadmill', 'running'], 'time'],
  ['Jump Rope', 'Cardio', 'other', ['skipping'], 'time'],
];

export const CATALOG: Exercise[] = SEEDS.map(([name, group, split, aliases, defaultMode]) => ({
  id: slug(name),
  name,
  group,
  split,
  aliases,
  defaultMode,
}));

/** Which training split a muscle group belongs to (used to suggest exercises for "Push A", "Legs B", …). */
export const splitOfGroup = (group: MuscleGroup): Split =>
  group === 'Chest' || group === 'Shoulders' ? 'push' : group === 'Back' ? 'pull' : group === 'Legs' ? 'legs' : 'other';
