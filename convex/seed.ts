import { internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

type ExerciseType = "compound_heavy" | "compound_pump" | "isolation";

interface ExerciseData {
  name: string;
  muscleGroup: string;
  primaryMuscle: string;
  type: ExerciseType;
  equipmentRequired: string[];
}

interface TemplateExercise {
  exerciseName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  isPriority?: boolean;
}

interface DayTemplate {
  dayIndex: number;
  totalDays: number;
  dayName: string;
  exercises: TemplateExercise[];
}

interface FoodItemData {
  name: string;
  group: "lean_protein" | "fattier_protein" | "starchy_carb" | "fat_source";
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

interface ExerciseAlternativeData {
  primaryExerciseName: string;
  alternativeExerciseName: string;
  reason: string;
}

// Exercise data with primaryMuscle and equipmentRequired
const EXERCISES: ExerciseData[] = [
  // Chest
  { name: "Flat Barbell Bench Press", muscleGroup: "Chest", primaryMuscle: "chest_mid", type: "compound_heavy", equipmentRequired: ["barbell", "bench"] },
  { name: "Incline Barbell Press", muscleGroup: "Chest", primaryMuscle: "chest_upper", type: "compound_heavy", equipmentRequired: ["barbell", "incline_bench"] },
  { name: "Dumbbell Bench Press", muscleGroup: "Chest", primaryMuscle: "chest_mid", type: "compound_heavy", equipmentRequired: ["dumbbells", "bench"] },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest", primaryMuscle: "chest_upper", type: "compound_heavy", equipmentRequired: ["dumbbells", "incline_bench"] },
  { name: "Incline DB Fly", muscleGroup: "Chest", primaryMuscle: "chest_upper", type: "compound_pump", equipmentRequired: ["dumbbells", "incline_bench"] },
  { name: "Cable Crossover", muscleGroup: "Chest", primaryMuscle: "chest_inner", type: "compound_pump", equipmentRequired: ["cable"] },
  { name: "Weighted Dips", muscleGroup: "Triceps", primaryMuscle: "triceps_all", type: "compound_pump", equipmentRequired: ["dip_station", "weight_belt"] },
  { name: "Machine Chest Press", muscleGroup: "Chest", primaryMuscle: "chest_mid", type: "compound_pump", equipmentRequired: ["chest_press_machine"] },
  { name: "Pec Deck Fly", muscleGroup: "Chest", primaryMuscle: "chest_inner", type: "isolation", equipmentRequired: ["pec_deck"] },

  // Shoulders
  { name: "DB Shoulder Press", muscleGroup: "Shoulders", primaryMuscle: "delts_front", type: "compound_heavy", equipmentRequired: ["dumbbells"] },
  { name: "Barbell Overhead Press", muscleGroup: "Shoulders", primaryMuscle: "delts_front", type: "compound_heavy", equipmentRequired: ["barbell"] },
  { name: "Lateral Raises", muscleGroup: "Shoulders", primaryMuscle: "delts_side", type: "isolation", equipmentRequired: ["dumbbells"] },
  { name: "Cable Lateral Raises", muscleGroup: "Shoulders", primaryMuscle: "delts_side", type: "isolation", equipmentRequired: ["cable"] },
  { name: "Face Pulls", muscleGroup: "Rear Delts", primaryMuscle: "delts_rear", type: "isolation", equipmentRequired: ["cable"] },
  { name: "Rear Delt Fly", muscleGroup: "Rear Delts", primaryMuscle: "delts_rear", type: "isolation", equipmentRequired: ["dumbbells"] },
  { name: "Machine Shoulder Press", muscleGroup: "Shoulders", primaryMuscle: "delts_front", type: "compound_pump", equipmentRequired: ["shoulder_press_machine"] },

  // Back
  { name: "Lat Pulldown", muscleGroup: "Back", primaryMuscle: "lats", type: "compound_pump", equipmentRequired: ["cable"] },
  { name: "Pullups", muscleGroup: "Back", primaryMuscle: "lats", type: "compound_pump", equipmentRequired: ["pullup_bar"] },
  { name: "Seated Cable Row", muscleGroup: "Back", primaryMuscle: "mid_back", type: "compound_pump", equipmentRequired: ["cable"] },
  { name: "Single Arm DB Row", muscleGroup: "Back", primaryMuscle: "lats", type: "compound_pump", equipmentRequired: ["dumbbells", "bench"] },
  { name: "Barbell Row", muscleGroup: "Back", primaryMuscle: "mid_back", type: "compound_heavy", equipmentRequired: ["barbell"] },
  { name: "Deadlift", muscleGroup: "Back", primaryMuscle: "lower_back", type: "compound_heavy", equipmentRequired: ["barbell"] },
  { name: "T-Bar Row", muscleGroup: "Back", primaryMuscle: "mid_back", type: "compound_heavy", equipmentRequired: ["t_bar", "barbell"] },
  { name: "Machine Row", muscleGroup: "Back", primaryMuscle: "mid_back", type: "compound_pump", equipmentRequired: ["row_machine"] },

  // Arms
  { name: "Barbell Curl", muscleGroup: "Biceps", primaryMuscle: "biceps", type: "isolation", equipmentRequired: ["barbell"] },
  { name: "Dumbbell Curl", muscleGroup: "Biceps", primaryMuscle: "biceps", type: "isolation", equipmentRequired: ["dumbbells"] },
  { name: "Hammer Curl", muscleGroup: "Biceps", primaryMuscle: "brachialis", type: "isolation", equipmentRequired: ["dumbbells"] },
  { name: "Preacher Curl", muscleGroup: "Biceps", primaryMuscle: "biceps_short_head", type: "isolation", equipmentRequired: ["preacher_bench", "barbell"] },
  { name: "Cable Curl", muscleGroup: "Biceps", primaryMuscle: "biceps", type: "isolation", equipmentRequired: ["cable"] },
  { name: "Tricep Pushdown", muscleGroup: "Triceps", primaryMuscle: "triceps_lateral", type: "isolation", equipmentRequired: ["cable"] },
  { name: "Overhead Tricep Extension", muscleGroup: "Triceps", primaryMuscle: "triceps_long_head", type: "isolation", equipmentRequired: ["cable"] },
  { name: "Skull Crushers", muscleGroup: "Triceps", primaryMuscle: "triceps_all", type: "isolation", equipmentRequired: ["barbell", "bench"] },
  { name: "Dumbbell Tricep Extension", muscleGroup: "Triceps", primaryMuscle: "triceps_long_head", type: "isolation", equipmentRequired: ["dumbbells"] },

  // Legs
  { name: "Barbell Squat", muscleGroup: "Quads", primaryMuscle: "quads", type: "compound_heavy", equipmentRequired: ["barbell", "squat_rack"] },
  { name: "Leg Press", muscleGroup: "Quads", primaryMuscle: "quads", type: "compound_pump", equipmentRequired: ["leg_press"] },
  { name: "Hack Squat", muscleGroup: "Quads", primaryMuscle: "quads", type: "compound_heavy", equipmentRequired: ["hack_squat"] },
  { name: "Goblet Squat", muscleGroup: "Quads", primaryMuscle: "quads", type: "compound_pump", equipmentRequired: ["dumbbells"] },
  { name: "Leg Extension", muscleGroup: "Quads", primaryMuscle: "quads", type: "isolation", equipmentRequired: ["leg_extension"] },
  { name: "Romanian Deadlift", muscleGroup: "Hamstrings", primaryMuscle: "hamstrings", type: "compound_heavy", equipmentRequired: ["barbell"] },
  { name: "Dumbbell RDL", muscleGroup: "Hamstrings", primaryMuscle: "hamstrings", type: "compound_heavy", equipmentRequired: ["dumbbells"] },
  { name: "Leg Curl", muscleGroup: "Hamstrings", primaryMuscle: "hamstrings", type: "isolation", equipmentRequired: ["leg_curl_machine"] },
  { name: "Bulgarian Split Squat", muscleGroup: "Quads", primaryMuscle: "quads", type: "compound_pump", equipmentRequired: ["dumbbells", "bench"] },
  { name: "Walking Lunges", muscleGroup: "Quads", primaryMuscle: "quads", type: "compound_pump", equipmentRequired: ["dumbbells"] },
  { name: "Hip Thrust", muscleGroup: "Glutes", primaryMuscle: "glutes", type: "compound_heavy", equipmentRequired: ["barbell", "bench"] },
  { name: "Calf Raises", muscleGroup: "Calves", primaryMuscle: "calves", type: "isolation", equipmentRequired: ["calf_raise_machine"] },
  { name: "Seated Calf Raises", muscleGroup: "Calves", primaryMuscle: "calves_soleus", type: "isolation", equipmentRequired: ["seated_calf_machine"] },

  // Core
  { name: "Cable Crunch", muscleGroup: "Abs", primaryMuscle: "abs", type: "isolation", equipmentRequired: ["cable"] },
  { name: "Hanging Leg Raise", muscleGroup: "Abs", primaryMuscle: "abs_lower", type: "isolation", equipmentRequired: ["pullup_bar"] },
  { name: "Ab Wheel Rollout", muscleGroup: "Abs", primaryMuscle: "abs", type: "isolation", equipmentRequired: ["ab_wheel"] },
];

// Exercise alternatives for equipment substitutions
const EXERCISE_ALTERNATIVES: ExerciseAlternativeData[] = [
  // Barbell alternatives
  { primaryExerciseName: "Flat Barbell Bench Press", alternativeExerciseName: "Dumbbell Bench Press", reason: "no_barbell" },
  { primaryExerciseName: "Incline Barbell Press", alternativeExerciseName: "Incline Dumbbell Press", reason: "no_barbell" },
  { primaryExerciseName: "Barbell Overhead Press", alternativeExerciseName: "DB Shoulder Press", reason: "no_barbell" },
  { primaryExerciseName: "Barbell Row", alternativeExerciseName: "Single Arm DB Row", reason: "no_barbell" },
  { primaryExerciseName: "Barbell Curl", alternativeExerciseName: "Dumbbell Curl", reason: "no_barbell" },
  { primaryExerciseName: "Romanian Deadlift", alternativeExerciseName: "Dumbbell RDL", reason: "no_barbell" },
  { primaryExerciseName: "Skull Crushers", alternativeExerciseName: "Dumbbell Tricep Extension", reason: "no_barbell" },

  // Squat rack alternatives
  { primaryExerciseName: "Barbell Squat", alternativeExerciseName: "Leg Press", reason: "no_squat_rack" },
  { primaryExerciseName: "Barbell Squat", alternativeExerciseName: "Hack Squat", reason: "no_squat_rack" },
  { primaryExerciseName: "Barbell Squat", alternativeExerciseName: "Goblet Squat", reason: "no_squat_rack" },

  // Cable alternatives
  { primaryExerciseName: "Lat Pulldown", alternativeExerciseName: "Pullups", reason: "no_cable" },
  { primaryExerciseName: "Seated Cable Row", alternativeExerciseName: "Single Arm DB Row", reason: "no_cable" },
  { primaryExerciseName: "Seated Cable Row", alternativeExerciseName: "Machine Row", reason: "no_cable" },
  { primaryExerciseName: "Cable Crossover", alternativeExerciseName: "Incline DB Fly", reason: "no_cable" },
  { primaryExerciseName: "Cable Crossover", alternativeExerciseName: "Pec Deck Fly", reason: "no_cable" },
  { primaryExerciseName: "Face Pulls", alternativeExerciseName: "Rear Delt Fly", reason: "no_cable" },
  { primaryExerciseName: "Tricep Pushdown", alternativeExerciseName: "Dumbbell Tricep Extension", reason: "no_cable" },
  { primaryExerciseName: "Overhead Tricep Extension", alternativeExerciseName: "Dumbbell Tricep Extension", reason: "no_cable" },
  { primaryExerciseName: "Cable Curl", alternativeExerciseName: "Dumbbell Curl", reason: "no_cable" },
  { primaryExerciseName: "Cable Lateral Raises", alternativeExerciseName: "Lateral Raises", reason: "no_cable" },
  { primaryExerciseName: "Cable Crunch", alternativeExerciseName: "Hanging Leg Raise", reason: "no_cable" },

  // Home gym alternatives
  { primaryExerciseName: "Leg Press", alternativeExerciseName: "Bulgarian Split Squat", reason: "home_gym" },
  { primaryExerciseName: "Leg Extension", alternativeExerciseName: "Walking Lunges", reason: "home_gym" },
  { primaryExerciseName: "Leg Curl", alternativeExerciseName: "Dumbbell RDL", reason: "home_gym" },
  { primaryExerciseName: "Machine Chest Press", alternativeExerciseName: "Dumbbell Bench Press", reason: "home_gym" },
  { primaryExerciseName: "Machine Shoulder Press", alternativeExerciseName: "DB Shoulder Press", reason: "home_gym" },
  { primaryExerciseName: "Machine Row", alternativeExerciseName: "Single Arm DB Row", reason: "home_gym" },
  { primaryExerciseName: "Pullups", alternativeExerciseName: "Single Arm DB Row", reason: "no_pullup_bar" },
];

// ============================================
// 3-DAY SPLIT (Full Body)
// ============================================
const THREE_DAY_TEMPLATE: DayTemplate[] = [
  {
    dayIndex: 1,
    totalDays: 3,
    dayName: "Full Body A",
    exercises: [
      { exerciseName: "Barbell Squat", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Flat Barbell Bench Press", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Barbell Row", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "DB Shoulder Press", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Barbell Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Tricep Pushdown", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 2,
    totalDays: 3,
    dayName: "Full Body B",
    exercises: [
      { exerciseName: "Deadlift", sets: 4, repsMin: 5, repsMax: 8, isPriority: false },
      { exerciseName: "Incline Dumbbell Press", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Lat Pulldown", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Lateral Raises", sets: 3, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Leg Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Calf Raises", sets: 3, repsMin: 12, repsMax: 20, isPriority: false },
    ],
  },
  {
    dayIndex: 3,
    totalDays: 3,
    dayName: "Full Body C",
    exercises: [
      { exerciseName: "Leg Press", sets: 4, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Dumbbell Bench Press", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Seated Cable Row", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Face Pulls", sets: 3, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Hammer Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Overhead Tricep Extension", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
];

// ============================================
// 4-DAY SPLIT (Upper/Lower)
// ============================================
const FOUR_DAY_TEMPLATE: DayTemplate[] = [
  {
    dayIndex: 1,
    totalDays: 4,
    dayName: "Upper A",
    exercises: [
      { exerciseName: "Flat Barbell Bench Press", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Barbell Row", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "DB Shoulder Press", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Lat Pulldown", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Incline DB Fly", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Barbell Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Tricep Pushdown", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 2,
    totalDays: 4,
    dayName: "Lower A",
    exercises: [
      { exerciseName: "Barbell Squat", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Romanian Deadlift", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Leg Press", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Leg Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Calf Raises", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Cable Crunch", sets: 3, repsMin: 12, repsMax: 20, isPriority: false },
    ],
  },
  {
    dayIndex: 3,
    totalDays: 4,
    dayName: "Upper B",
    exercises: [
      { exerciseName: "Barbell Row", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Incline Barbell Press", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Lat Pulldown", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Lateral Raises", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Face Pulls", sets: 3, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Hammer Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Overhead Tricep Extension", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 4,
    totalDays: 4,
    dayName: "Lower B",
    exercises: [
      { exerciseName: "Romanian Deadlift", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Leg Press", sets: 4, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Bulgarian Split Squat", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Leg Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Hip Thrust", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Seated Calf Raises", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
    ],
  },
];

// ============================================
// 5-DAY SPLIT (Push/Pull/Legs + Upper/Lower)
// ============================================
const FIVE_DAY_TEMPLATE: DayTemplate[] = [
  {
    dayIndex: 1,
    totalDays: 5,
    dayName: "Push",
    exercises: [
      { exerciseName: "Flat Barbell Bench Press", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "DB Shoulder Press", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Incline Dumbbell Press", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Lateral Raises", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Cable Crossover", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Tricep Pushdown", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Overhead Tricep Extension", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 2,
    totalDays: 5,
    dayName: "Pull",
    exercises: [
      { exerciseName: "Deadlift", sets: 4, repsMin: 5, repsMax: 8, isPriority: false },
      { exerciseName: "Lat Pulldown", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Barbell Row", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Seated Cable Row", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Face Pulls", sets: 3, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Barbell Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Hammer Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 3,
    totalDays: 5,
    dayName: "Legs",
    exercises: [
      { exerciseName: "Barbell Squat", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Romanian Deadlift", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Leg Press", sets: 4, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Leg Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Leg Extension", sets: 3, repsMin: 12, repsMax: 15, isPriority: false },
      { exerciseName: "Calf Raises", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
    ],
  },
  {
    dayIndex: 4,
    totalDays: 5,
    dayName: "Upper",
    exercises: [
      { exerciseName: "Incline Barbell Press", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Pullups", sets: 4, repsMin: 6, repsMax: 12, isPriority: false },
      { exerciseName: "DB Shoulder Press", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Single Arm DB Row", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Lateral Raises", sets: 3, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Dumbbell Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Weighted Dips", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
    ],
  },
  {
    dayIndex: 5,
    totalDays: 5,
    dayName: "Lower",
    exercises: [
      { exerciseName: "Leg Press", sets: 4, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Romanian Deadlift", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Bulgarian Split Squat", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Leg Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Hip Thrust", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Calf Raises", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Hanging Leg Raise", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
];

// ============================================
// 6-DAY SPLIT (Push/Pull/Legs x2)
// ============================================
const SIX_DAY_TEMPLATE: DayTemplate[] = [
  {
    dayIndex: 1,
    totalDays: 6,
    dayName: "Push A",
    exercises: [
      { exerciseName: "Flat Barbell Bench Press", sets: 4, repsMin: 5, repsMax: 8, isPriority: false },
      { exerciseName: "Barbell Overhead Press", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Incline Dumbbell Press", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Lateral Raises", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Weighted Dips", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Tricep Pushdown", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 2,
    totalDays: 6,
    dayName: "Pull A",
    exercises: [
      { exerciseName: "Deadlift", sets: 4, repsMin: 4, repsMax: 6, isPriority: false },
      { exerciseName: "Barbell Row", sets: 4, repsMin: 6, repsMax: 10, isPriority: false },
      { exerciseName: "Lat Pulldown", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Face Pulls", sets: 3, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Barbell Curl", sets: 3, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Hammer Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 3,
    totalDays: 6,
    dayName: "Legs A",
    exercises: [
      { exerciseName: "Barbell Squat", sets: 4, repsMin: 5, repsMax: 8, isPriority: false },
      { exerciseName: "Romanian Deadlift", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Leg Press", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Leg Extension", sets: 3, repsMin: 12, repsMax: 15, isPriority: false },
      { exerciseName: "Leg Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Calf Raises", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
    ],
  },
  {
    dayIndex: 4,
    totalDays: 6,
    dayName: "Push B",
    exercises: [
      { exerciseName: "Incline Barbell Press", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "DB Shoulder Press", sets: 4, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Cable Crossover", sets: 4, repsMin: 12, repsMax: 15, isPriority: false },
      { exerciseName: "Lateral Raises", sets: 4, repsMin: 15, repsMax: 20, isPriority: false },
      { exerciseName: "Incline DB Fly", sets: 3, repsMin: 12, repsMax: 15, isPriority: false },
      { exerciseName: "Overhead Tricep Extension", sets: 3, repsMin: 12, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 5,
    totalDays: 6,
    dayName: "Pull B",
    exercises: [
      { exerciseName: "Pullups", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Seated Cable Row", sets: 4, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Single Arm DB Row", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Rear Delt Fly", sets: 4, repsMin: 12, repsMax: 20, isPriority: false },
      { exerciseName: "Cable Curl", sets: 3, repsMin: 12, repsMax: 15, isPriority: false },
      { exerciseName: "Preacher Curl", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
    ],
  },
  {
    dayIndex: 6,
    totalDays: 6,
    dayName: "Legs B",
    exercises: [
      { exerciseName: "Romanian Deadlift", sets: 4, repsMin: 8, repsMax: 12, isPriority: false },
      { exerciseName: "Leg Press", sets: 4, repsMin: 12, repsMax: 15, isPriority: false },
      { exerciseName: "Bulgarian Split Squat", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Leg Curl", sets: 4, repsMin: 12, repsMax: 15, isPriority: false },
      { exerciseName: "Hip Thrust", sets: 3, repsMin: 10, repsMax: 15, isPriority: false },
      { exerciseName: "Seated Calf Raises", sets: 4, repsMin: 15, repsMax: 20, isPriority: false },
    ],
  },
];

// Combine all templates
const ALL_TRAINING_TEMPLATES: DayTemplate[] = [
  ...THREE_DAY_TEMPLATE,
  ...FOUR_DAY_TEMPLATE,
  ...FIVE_DAY_TEMPLATE,
  ...SIX_DAY_TEMPLATE,
];

// Food items data
const FOOD_ITEMS: FoodItemData[] = [
  { name: "Chicken Breast", group: "lean_protein", proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { name: "Ground Beef 93%", group: "fattier_protein", proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 7 },
  { name: "Eggs", group: "fattier_protein", proteinPer100g: 13, carbsPer100g: 1, fatPer100g: 11 },
  { name: "Greek Yogurt", group: "lean_protein", proteinPer100g: 10, carbsPer100g: 4, fatPer100g: 0.7 },
  { name: "Salmon", group: "fattier_protein", proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13 },
  { name: "Tuna", group: "lean_protein", proteinPer100g: 29, carbsPer100g: 0, fatPer100g: 1 },
  { name: "Rice", group: "starchy_carb", proteinPer100g: 7, carbsPer100g: 78, fatPer100g: 0.6 },
  { name: "Oats", group: "starchy_carb", proteinPer100g: 13, carbsPer100g: 66, fatPer100g: 7 },
  { name: "Potatoes", group: "starchy_carb", proteinPer100g: 2, carbsPer100g: 17, fatPer100g: 0.1 },
  { name: "Sweet Potatoes", group: "starchy_carb", proteinPer100g: 2, carbsPer100g: 20, fatPer100g: 0.1 },
  { name: "Pasta", group: "starchy_carb", proteinPer100g: 5, carbsPer100g: 75, fatPer100g: 1 },
  { name: "Bread", group: "starchy_carb", proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3 },
  { name: "Banana", group: "starchy_carb", proteinPer100g: 1, carbsPer100g: 23, fatPer100g: 0.3 },
  { name: "Olive Oil", group: "fat_source", proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 },
  { name: "Peanut Butter", group: "fat_source", proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50 },
  { name: "Almonds", group: "fat_source", proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 49 },
  { name: "Avocado", group: "fat_source", proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15 },
];

/**
 * Seed exercises into the database
 */
export const seedExercises = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("exercises").first();
    if (existing) {
      return { seeded: false, message: "Exercises already seeded" };
    }

    for (const exercise of EXERCISES) {
      await ctx.db.insert("exercises", exercise);
    }

    return { seeded: true, count: EXERCISES.length };
  },
});

/**
 * Seed exercise alternatives into the database
 */
export const seedExerciseAlternatives = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("exerciseAlternatives").first();
    if (existing) {
      return { seeded: false, message: "Exercise alternatives already seeded" };
    }

    // Get all exercises to map names to IDs
    const exercises = await ctx.db.query("exercises").collect();
    const exerciseMap = new Map<string, Id<"exercises">>();
    for (const ex of exercises) {
      exerciseMap.set(ex.name, ex._id);
    }

    let count = 0;
    for (const alt of EXERCISE_ALTERNATIVES) {
      const primaryId = exerciseMap.get(alt.primaryExerciseName);
      const alternativeId = exerciseMap.get(alt.alternativeExerciseName);

      if (!primaryId) {
        console.warn(`Primary exercise not found: ${alt.primaryExerciseName}`);
        continue;
      }
      if (!alternativeId) {
        console.warn(`Alternative exercise not found: ${alt.alternativeExerciseName}`);
        continue;
      }

      await ctx.db.insert("exerciseAlternatives", {
        primaryExerciseId: primaryId,
        alternativeExerciseId: alternativeId,
        reason: alt.reason,
      });
      count++;
    }

    return { seeded: true, count };
  },
});

/**
 * Seed training template into the database (all splits: 3, 4, 5, 6 day)
 */
export const seedTrainingTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("trainingTemplate").first();
    if (existing) {
      return { seeded: false, message: "Training template already seeded" };
    }

    // Get all exercises to map names to IDs
    const exercises = await ctx.db.query("exercises").collect();
    const exerciseMap = new Map<string, Id<"exercises">>();
    for (const ex of exercises) {
      exerciseMap.set(ex.name, ex._id);
    }

    let count = 0;
    for (const day of ALL_TRAINING_TEMPLATES) {
      for (let i = 0; i < day.exercises.length; i++) {
        const templateEx = day.exercises[i];
        const exerciseId = exerciseMap.get(templateEx.exerciseName);

        if (!exerciseId) {
          throw new Error(`Exercise not found: ${templateEx.exerciseName}`);
        }

        await ctx.db.insert("trainingTemplate", {
          dayIndex: day.dayIndex,
          totalDays: day.totalDays,
          dayName: day.dayName,
          exerciseId,
          sequence: i + 1,
          setsCount: templateEx.sets,
          targetRepsMin: templateEx.repsMin,
          targetRepsMax: templateEx.repsMax,
          isPriority: templateEx.isPriority ?? false,
        });
        count++;
      }
    }

    return { seeded: true, count };
  },
});

/**
 * Seed food items into the database
 */
export const seedFoodItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("foodItems").first();
    if (existing) {
      return { seeded: false, message: "Food items already seeded" };
    }

    for (const food of FOOD_ITEMS) {
      await ctx.db.insert("foodItems", food);
    }

    return { seeded: true, count: FOOD_ITEMS.length };
  },
});

type SeedResult = { seeded: boolean; message?: string; count?: number };

/**
 * Seed all data - exercises, training template, alternatives, and food items
 */
export const seedAll = action({
  args: {},
  handler: async (ctx): Promise<{
    exercises: SeedResult;
    exerciseAlternatives: SeedResult;
    trainingTemplate: SeedResult;
    foodItems: SeedResult;
  }> => {
    // Seed exercises first (template and alternatives depend on them)
    const exercisesResult: SeedResult = await ctx.runMutation(internal.seed.seedExercises);

    // Seed exercise alternatives (needs exercises to exist)
    const alternativesResult: SeedResult = await ctx.runMutation(internal.seed.seedExerciseAlternatives);

    // Seed training template (needs exercises to exist)
    const templateResult: SeedResult = await ctx.runMutation(internal.seed.seedTrainingTemplate);

    // Seed food items (independent)
    const foodResult: SeedResult = await ctx.runMutation(internal.seed.seedFoodItems);

    return {
      exercises: exercisesResult,
      exerciseAlternatives: alternativesResult,
      trainingTemplate: templateResult,
      foodItems: foodResult,
    };
  },
});
