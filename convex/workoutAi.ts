import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Mapping of muscles to exercises that target them
const MUSCLE_TO_EXERCISES: Record<string, string[]> = {
  // Chest
  chest_mid: ["Flat Barbell Bench Press", "Dumbbell Bench Press", "Machine Chest Press"],
  chest_upper: ["Incline Barbell Press", "Incline Dumbbell Press", "Incline DB Fly"],
  chest_inner: ["Cable Crossover", "Pec Deck Fly"],

  // Shoulders
  delts_front: ["DB Shoulder Press", "Barbell Overhead Press", "Machine Shoulder Press"],
  delts_side: ["Lateral Raises", "Cable Lateral Raises"],
  delts_rear: ["Face Pulls", "Rear Delt Fly"],

  // Back
  lats: ["Lat Pulldown", "Pullups", "Single Arm DB Row"],
  mid_back: ["Barbell Row", "Seated Cable Row", "T-Bar Row", "Machine Row"],
  lower_back: ["Deadlift", "Romanian Deadlift"],

  // Arms
  biceps: ["Barbell Curl", "Dumbbell Curl", "Cable Curl"],
  biceps_short_head: ["Preacher Curl"],
  brachialis: ["Hammer Curl"],
  triceps_all: ["Weighted Dips", "Skull Crushers"],
  triceps_lateral: ["Tricep Pushdown"],
  triceps_long_head: ["Overhead Tricep Extension", "Dumbbell Tricep Extension"],

  // Legs
  quads: ["Barbell Squat", "Leg Press", "Hack Squat", "Goblet Squat", "Leg Extension", "Bulgarian Split Squat", "Walking Lunges"],
  hamstrings: ["Romanian Deadlift", "Dumbbell RDL", "Leg Curl"],
  glutes: ["Hip Thrust", "Bulgarian Split Squat"],
  calves: ["Calf Raises"],
  calves_soleus: ["Seated Calf Raises"],

  // Core
  abs: ["Cable Crunch", "Ab Wheel Rollout"],
  abs_lower: ["Hanging Leg Raise"],
};

// Simplified muscle groups for user-facing analysis
const MUSCLE_GROUP_MAPPING: Record<string, string[]> = {
  chest: ["chest_mid", "chest_upper", "chest_inner"],
  shoulders: ["delts_front", "delts_side"],
  rear_delts: ["delts_rear"],
  back: ["lats", "mid_back", "lower_back"],
  biceps: ["biceps", "biceps_short_head", "brachialis"],
  triceps: ["triceps_all", "triceps_lateral", "triceps_long_head"],
  quads: ["quads"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes"],
  calves: ["calves", "calves_soleus"],
  abs: ["abs", "abs_lower"],
};

/**
 * Internal mutation to adjust workout priorities based on muscle analysis
 * Called by the photo analysis system when lagging muscles are identified
 */
export const adjustWorkoutPriorities = internalMutation({
  args: {
    userId: v.id("users"),
    laggingMuscles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user profile to determine their training split
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    const totalDays = profile.trainingDaysPerWeek;

    // Get all template exercises for this user's split
    const templateExercises = await ctx.db
      .query("trainingTemplate")
      .withIndex("by_total_days", (q) => q.eq("totalDays", totalDays))
      .collect();

    // Get all exercises to map names to IDs
    const exercises = await ctx.db.query("exercises").collect();
    const exerciseNameToId = new Map<string, Id<"exercises">>();
    const exerciseIdToName = new Map<Id<"exercises">, string>();
    for (const ex of exercises) {
      exerciseNameToId.set(ex.name, ex._id);
      exerciseIdToName.set(ex._id, ex.name);
    }

    // Find exercises that target lagging muscles
    const exercisesToPrioritize = new Set<string>();

    for (const laggingMuscle of args.laggingMuscles) {
      // Check if it's a muscle group or specific muscle
      const specificMuscles = MUSCLE_GROUP_MAPPING[laggingMuscle] || [laggingMuscle];

      for (const muscle of specificMuscles) {
        const targetExercises = MUSCLE_TO_EXERCISES[muscle] || [];
        for (const exerciseName of targetExercises) {
          exercisesToPrioritize.add(exerciseName);
        }
      }
    }

    // Update template exercises to mark priority
    let updatedCount = 0;
    for (const te of templateExercises) {
      const exerciseName = exerciseIdToName.get(te.exerciseId);
      if (!exerciseName) continue;

      const shouldBePriority = exercisesToPrioritize.has(exerciseName);

      // Only update if priority status is changing
      if (te.isPriority !== shouldBePriority) {
        await ctx.db.patch(te._id, {
          isPriority: shouldBePriority,
        });
        updatedCount++;
      }
    }

    return {
      laggingMuscles: args.laggingMuscles,
      exercisesPrioritized: Array.from(exercisesToPrioritize),
      updatedCount,
    };
  },
});

/**
 * Reset all workout priorities to default (false)
 */
export const resetWorkoutPriorities = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user profile to determine their training split
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    const totalDays = profile.trainingDaysPerWeek;

    // Get all template exercises for this user's split
    const templateExercises = await ctx.db
      .query("trainingTemplate")
      .withIndex("by_total_days", (q) => q.eq("totalDays", totalDays))
      .collect();

    // Reset all priorities to false
    let resetCount = 0;
    for (const te of templateExercises) {
      if (te.isPriority) {
        await ctx.db.patch(te._id, {
          isPriority: false,
        });
        resetCount++;
      }
    }

    return { resetCount };
  },
});

/**
 * Query to get user's personalized workout plan with AI adjustments applied
 */
export const getPersonalizedPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    const totalDays = profile.trainingDaysPerWeek;

    // Get the latest progress photo analysis
    const latestPhoto = await ctx.db
      .query("progressPhotos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("analysisComplete"), true))
      .order("desc")
      .first();

    const muscleAnalysis = latestPhoto?.muscleAnalysis || null;

    // Get all template days for this split
    const templateDays = await ctx.db
      .query("trainingTemplate")
      .withIndex("by_total_days", (q) => q.eq("totalDays", totalDays))
      .collect();

    // Group by dayIndex
    const dayMap = new Map<number, typeof templateDays>();
    for (const te of templateDays) {
      const existing = dayMap.get(te.dayIndex) || [];
      existing.push(te);
      dayMap.set(te.dayIndex, existing);
    }

    // Build the weekly plan with priority indicators
    const weeklyPlan = [];
    const today = new Date();

    for (let i = 1; i <= totalDays; i++) {
      const dayExercises = dayMap.get(i) || [];
      const sorted = dayExercises.sort((a, b) => a.sequence - b.sequence);

      // Calculate the date for this day
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + (i - 1));

      const exercisesWithDetails = await Promise.all(
        sorted.map(async (te) => {
          const exercise = await ctx.db.get(te.exerciseId);
          return {
            ...te,
            exercise,
            // Highlight if this exercise targets a lagging muscle
            targetingLaggingMuscle: te.isPriority || false,
          };
        })
      );

      const dayName = sorted[0]?.dayName || `Day ${i}`;
      const formattedDate = dayDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Count priority exercises for this day
      const priorityCount = exercisesWithDetails.filter(
        (e) => e.targetingLaggingMuscle
      ).length;

      weeklyPlan.push({
        dayIndex: i,
        dayName,
        formattedName: `Day ${i} - ${dayName} - ${formattedDate}`,
        date: dayDate.toISOString().split("T")[0],
        exercises: exercisesWithDetails,
        priorityExerciseCount: priorityCount,
      });
    }

    return {
      totalDays,
      plan: weeklyPlan,
      muscleAnalysis,
      hasAIAdjustments: muscleAnalysis !== null && (muscleAnalysis.laggingMuscles?.length ?? 0) > 0,
      laggingMuscles: muscleAnalysis?.laggingMuscles || [],
      recommendations: muscleAnalysis?.recommendations || [],
    };
  },
});

/**
 * Get exercises that target specific muscles (for UI display)
 */
export const getExercisesForMuscle = query({
  args: {
    muscle: v.string(),
  },
  handler: async (ctx, args) => {
    // Get specific muscles if it's a muscle group
    const specificMuscles = MUSCLE_GROUP_MAPPING[args.muscle] || [args.muscle];

    // Collect all exercise names that target these muscles
    const exerciseNames = new Set<string>();
    for (const muscle of specificMuscles) {
      const targetExercises = MUSCLE_TO_EXERCISES[muscle] || [];
      for (const name of targetExercises) {
        exerciseNames.add(name);
      }
    }

    // Fetch exercise details from database
    const exercises = await ctx.db.query("exercises").collect();
    const matchingExercises = exercises.filter((ex) =>
      exerciseNames.has(ex.name)
    );

    return matchingExercises;
  },
});
