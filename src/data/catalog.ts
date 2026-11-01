import type { Equipment, Exercise, MuscleGroup, SetMode, Split } from '../types';
import { IMPORTED } from './exercises.generated';

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
  ['Crunch', 'Core', 'other', ['abs']],
  ['Russian Twist', 'Core', 'other', ['abs']],
  ['Hanging Knee Raise', 'Core', 'other', ['knee tuck', 'abs']],
  ['Hanging Oblique Tuck', 'Core', 'other', ['obliques']],
  ['Side Plank with Rotation', 'Core', 'other', ['obliques']],
  ['Dumbbell Wood Chopper', 'Core', 'other', ['db wood chop', 'obliques']],
  ['Pallof Press', 'Core', 'other', ['anti rotation press']],
  // More push
  ['Close-Grip Bench Press', 'Arms', 'push', ['cgbp']],
  ['Incline Chest Fly', 'Chest', 'push'],
  ['Weighted Dip', 'Chest', 'push'],
  ['Diamond Push-Up', 'Arms', 'push', ['diamond pushup']],
  ['Bench Dip', 'Arms', 'push'],
  ['Arnold Press', 'Shoulders', 'push'],
  ['Elevated Pike Press', 'Shoulders', 'push', ['pike push-up']],
  ['Elevated Pike Shrug', 'Shoulders', 'push'],
  ['Seated Triceps Extension', 'Arms', 'push', ['tricep extension']],
  ['Dumbbell Skull Crusher', 'Arms', 'push', ['db skull crusher']],
  // More pull
  ['Chin-Up', 'Back', 'pull', ['chinup']],
  ['Inverted Row', 'Back', 'pull', ['body row']],
  ['Neutral-Grip Pulldown', 'Back', 'pull'],
  ['Good Morning', 'Back', 'pull'],
  ['45-Degree Back Extension', 'Back', 'pull', ['back extension', 'hyperextension']],
  ['Superman', 'Back', 'pull'],
  ['Standing Dumbbell Shrug', 'Back', 'pull', ['db shrug']],
  ['Seated Dumbbell Shrug', 'Back', 'pull', ['db shrug']],
  ['Smith Machine Shrug', 'Back', 'pull'],
  ['Silverback Shrug', 'Back', 'pull'],
  ['Reverse Pec Deck', 'Shoulders', 'pull', ['reverse fly machine']],
  ['Twisting Curl', 'Arms', 'pull'],
  ['Bayesian Curl', 'Arms', 'pull', ['cable curl']],
  ['Reverse Curl', 'Arms', 'pull'],
  ['Barbell Wrist Curl', 'Arms', 'pull', ['forearms']],
  ['Behind-the-Back Barbell Wrist Curl', 'Arms', 'pull', ['forearms']],
  // More legs
  ['Bodyweight Squat', 'Legs', 'legs', ['air squat']],
  ['Goblet Squat', 'Legs', 'legs'],
  ['Squat Jump', 'Legs', 'legs', ['jump squat']],
  ['Forward Lunge', 'Legs', 'legs', ['lunge']],
  ['Lateral Lunge', 'Legs', 'legs', ['side lunge']],
  ['Bench Lunge', 'Legs', 'legs'],
  ['Step-Up', 'Legs', 'legs', ['stepup']],
  ['Stiff-Leg Deadlift', 'Legs', 'legs', ['sldl']],
  ['Single-Leg Romanian Deadlift', 'Legs', 'legs', ['1 leg rdl', 'single leg rdl']],
  ['Ball Hamstring Curl', 'Legs', 'legs', ['stability ball curl']],
  ['Glute Bridge', 'Legs', 'legs'],
  ['Donkey Kick', 'Legs', 'legs', ['glutes']],
  ['Kettlebell Swing', 'Legs', 'legs', ['kb swing']],
  // Time-based holds & cardio — smart-detected into Time mode the first time you pick one.
  ['Tip Toe Walk', 'Legs', 'legs', ['calf walk'], 'time'],
  ['Farmer Carry', 'Arms', 'pull', ['farmers walk', 'grip'], 'time'],
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

/** Seeded exercises done with no added kg. */
const NO_WEIGHT = new Set([
  'Push-Up', 'Dip', 'Pull-Up', 'Chin-Up', 'Diamond Push-Up', 'Bench Dip', 'Elevated Pike Press', 'Elevated Pike Shrug',
  'Inverted Row', 'Superman', '45-Degree Back Extension', 'Crunch', 'Hanging Leg Raise', 'Hanging Knee Raise',
  'Hanging Oblique Tuck', 'Side Plank with Rotation', 'Russian Twist', 'Ab Wheel Rollout', 'Bodyweight Squat', 'Squat Jump',
  'Forward Lunge', 'Lateral Lunge', 'Bench Lunge', 'Walking Lunge', 'Step-Up', 'Glute Bridge', 'Donkey Kick',
  'Ball Hamstring Curl', 'Tip Toe Walk', 'Plank', 'Side Plank', 'Hanging Leg Hold', 'Mountain Climbers', 'Wall Sit',
  'Dead Hang', 'Treadmill Run', 'Jump Rope',
]);

const seedEquipment = (name: string, group: MuscleGroup): Equipment | undefined => {
  if (group === 'Cardio') return 'Cardio';
  if (NO_WEIGHT.has(name)) return 'Bodyweight';
  if (/cable|pushdown|pulldown|face pull|pallof/i.test(name)) return 'Cable';
  if (/dumbbell|hammer curl|arnold|lateral raise/i.test(name)) return 'Dumbbell';
  if (/machine|leg press|pec deck|leg extension|leg curl|hack squat|calf raise/i.test(name)) return 'Machine';
  if (/barbell|deadlift|overhead press|skull crusher|front squat|good morning/i.test(name)) return 'Barbell';
  return undefined;
};

export const CATALOG: Exercise[] = [
  ...SEEDS.map(([name, group, split, aliases, defaultMode]) => ({
    id: slug(name),
    name,
    group,
    split,
    aliases,
    defaultMode,
    equipment: seedEquipment(name, group),
    noWeight: NO_WEIGHT.has(name),
  })),
  ...IMPORTED.map(([name, group, split, equipment, noWeight, defaultMode]) => ({
    id: slug(name),
    name,
    group,
    split,
    equipment,
    noWeight,
    defaultMode,
  })),
];

/** Which training split a muscle group belongs to (used to suggest exercises for "Push A", "Legs B", …). */
export const splitOfGroup = (group: MuscleGroup): Split =>
  group === 'Chest' || group === 'Shoulders' ? 'push' : group === 'Back' ? 'pull' : group === 'Legs' ? 'legs' : 'other';
