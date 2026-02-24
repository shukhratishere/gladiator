import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export type ProgressionResult = {
  recommendedWeight: number | null;
  action: "increase" | "hold" | "decrease" | "micro_progress";
  reason: string;
};

type ExerciseType = "compound_heavy" | "compound_pump" | "isolation";

// Get weight increment based on exercise type
function getWeightIncrement(type: ExerciseType): number {
  switch (type) {
    case "compound_heavy":
      return 2.5;
    case "compound_pump":
      return 5;
    case "isolation":
      return 2.5;
  }
}

// Calculate average RPE from set logs
function calculateAvgRpe(setLogs: Doc<"setLogs">[]): number | null {
  const rpeValues = setLogs.filter((s) => s.rpe !== undefined).map((s) => s.rpe!);
  if (rpeValues.length === 0) return null;
  return rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length;
}

// Check if all sets are within rep range
function allSetsInRange(
  setLogs: Doc<"setLogs">[],
  minReps: number,
  maxReps: number
): boolean {
  return setLogs.every((s) => s.reps >= minReps && s.reps <= maxReps);
}

// Check if all sets hit max reps
function allSetsAtMax(setLogs: Doc<"setLogs">[], maxReps: number): boolean {
  return setLogs.every((s) => s.reps >= maxReps);
}

// Check if 2+ sets are below minimum
function twoOrMoreBelowMin(setLogs: Doc<"setLogs">[], minReps: number): boolean {
  const belowMin = setLogs.filter((s) => s.reps < minReps);
  return belowMin.length >= 2;
}

// Calculate total reps from set logs
function totalReps(setLogs: Doc<"setLogs">[]): number {
  return setLogs.reduce((sum, s) => sum + s.reps, 0);
}

// Check for stall (same weight, total reps diff <= 2 over 3 sessions)
function isStalled(
  sessionData: Array<{ weight: number; totalReps: number }>
): boolean {
  if (sessionData.length < 3) return false;

  const weights = sessionData.map((s) => s.weight);
  const sameWeight = weights.every((w) => w === weights[0]);
  if (!sameWeight) return false;

  const reps = sessionData.map((s) => s.totalReps);
  const maxReps = Math.max(...reps);
  const minReps = Math.min(...reps);
  return maxReps - minReps <= 2;
}

/**
 * Calculate progression recommendation for an exercise
 */
export const calculateProgression = internalQuery({
  args: {
    userId: v.id("users"),
    dayIndex: v.number(),
    exerciseId: v.id("exercises"),
    exerciseType: v.union(
      v.literal("compound_heavy"),
      v.literal("compound_pump"),
      v.literal("isolation")
    ),
    targetRepsMin: v.number(),
    targetRepsMax: v.number(),
  },
  handler: async (ctx, args): Promise<ProgressionResult> => {
    // Get last 3 completed, non-deload sessions for this day
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_user_and_day", (q) =>
        q.eq("userId", args.userId).eq("dayIndex", args.dayIndex)
      )
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.eq(q.field("isDeload"), false)
        )
      )
      .take(3);

    if (sessions.length === 0) {
      return {
        recommendedWeight: null,
        action: "hold",
        reason: "No history - pick your starting weight",
      };
    }

    // Get session exercises and set logs for each session
    const sessionData: Array<{
      weight: number;
      totalReps: number;
      avgRpe: number | null;
      hasPain: boolean;
      setLogs: Doc<"setLogs">[];
      minReps: number;
      maxReps: number;
    }> = [];

    for (const session of sessions) {
      const sessionExercise = await ctx.db
        .query("sessionExercises")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .filter((q) => q.eq(q.field("exerciseId"), args.exerciseId))
        .first();

      if (!sessionExercise) continue;

      const setLogs = await ctx.db
        .query("setLogs")
        .withIndex("by_session_exercise", (q) =>
          q.eq("sessionExerciseId", sessionExercise._id)
        )
        .collect();

      if (setLogs.length === 0) continue;

      // Use the weight from the first set (assuming consistent weight)
      const weight = setLogs[0].weight;
      const hasPain = setLogs.some((s) => s.painFlag);

      sessionData.push({
        weight,
        totalReps: totalReps(setLogs),
        avgRpe: calculateAvgRpe(setLogs),
        hasPain,
        setLogs,
        minReps: sessionExercise.targetRepsMin,
        maxReps: sessionExercise.targetRepsMax,
      });
    }

    if (sessionData.length === 0) {
      return {
        recommendedWeight: null,
        action: "hold",
        reason: "No completed sets found - pick your starting weight",
      };
    }

    const lastSession = sessionData[0];
    const lastWeight = lastSession.weight;
    const increment = getWeightIncrement(args.exerciseType);

    // Check for pain flag - decrease by 10%
    if (lastSession.hasPain) {
      const newWeight = Math.round((lastWeight * 0.9) / 2.5) * 2.5; // Round to nearest 2.5
      return {
        recommendedWeight: newWeight,
        action: "decrease",
        reason: "Pain reported - reducing weight by 10%",
      };
    }

    // Check for stall (need 3 sessions)
    if (sessionData.length >= 3) {
      const stallData = sessionData.map((s) => ({
        weight: s.weight,
        totalReps: s.totalReps,
      }));
      if (isStalled(stallData)) {
        // Micro progress: add smallest increment
        return {
          recommendedWeight: lastWeight + 1.25,
          action: "micro_progress",
          reason: "Stalled for 3 sessions - micro progression (+1.25kg)",
        };
      }
    }

    // Check for decrease conditions: 2+ sets below min OR avg RPE > 9
    const avgRpe = lastSession.avgRpe;
    if (twoOrMoreBelowMin(lastSession.setLogs, args.targetRepsMin)) {
      return {
        recommendedWeight: lastWeight - increment,
        action: "decrease",
        reason: `Multiple sets below ${args.targetRepsMin} reps - reducing weight`,
      };
    }
    if (avgRpe !== null && avgRpe > 9) {
      return {
        recommendedWeight: lastWeight - increment,
        action: "decrease",
        reason: "Average RPE too high (>9) - reducing weight",
      };
    }

    // Normal progression based on exercise type
    switch (args.exerciseType) {
      case "compound_heavy": {
        // +2.5kg if all working sets in range and avg RPE <= 7.5
        if (
          allSetsInRange(lastSession.setLogs, args.targetRepsMin, args.targetRepsMax) &&
          (avgRpe === null || avgRpe <= 7.5)
        ) {
          return {
            recommendedWeight: lastWeight + increment,
            action: "increase",
            reason: "All sets in range with good RPE - increasing weight",
          };
        }
        break;
      }
      case "compound_pump":
      case "isolation": {
        // +increment if all sets >= max reps and avg RPE <= 8
        if (
          allSetsAtMax(lastSession.setLogs, args.targetRepsMax) &&
          (avgRpe === null || avgRpe <= 8)
        ) {
          return {
            recommendedWeight: lastWeight + increment,
            action: "increase",
            reason: "All sets at max reps with good RPE - increasing weight",
          };
        }
        break;
      }
    }

    // Default: hold current weight
    return {
      recommendedWeight: lastWeight,
      action: "hold",
      reason: "Keep current weight - not yet ready to progress",
    };
  },
});
