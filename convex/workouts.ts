import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

/**
 * Format date as "Mon DD, YYYY" (e.g., "Feb 24, 2026")
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get training template for a specific day and split
 */
export const getTemplate = query({
  args: {
    dayIndex: v.number(),
    totalDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // If totalDays provided, use the composite index
    let templateExercises;
    if (args.totalDays) {
      templateExercises = await ctx.db
        .query("trainingTemplate")
        .withIndex("by_day_and_total", (q) =>
          q.eq("dayIndex", args.dayIndex).eq("totalDays", args.totalDays)
        )
        .collect();
    } else {
      // Fallback to just dayIndex (legacy behavior)
      templateExercises = await ctx.db
        .query("trainingTemplate")
        .withIndex("by_day", (q) => q.eq("dayIndex", args.dayIndex))
        .collect();
    }

    // Sort by sequence and fetch exercise details
    const sorted = templateExercises.sort((a, b) => a.sequence - b.sequence);

    const result = await Promise.all(
      sorted.map(async (te) => {
        const exercise = await ctx.db.get(te.exerciseId);
        return {
          ...te,
          exercise,
        };
      })
    );

    return result;
  },
});

/**
 * Get user's current in-progress session
 */
export const getActiveSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await ctx.db
      .query("workoutSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .order("desc")
      .first();

    return session;
  },
});

/**
 * Get session with all exercises and set logs
 */
export const getSessionWithExercises = query({
  args: { sessionId: v.id("workoutSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Get all session exercises
    const sessionExercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Sort by sequence
    const sorted = sessionExercises.sort((a, b) => a.sequence - b.sequence);

    // Get set logs for each exercise
    const exercisesWithSets = await Promise.all(
      sorted.map(async (se) => {
        const setLogs = await ctx.db
          .query("setLogs")
          .withIndex("by_session_exercise", (q) =>
            q.eq("sessionExerciseId", se._id)
          )
          .collect();

        // Sort by set number
        const sortedSets = setLogs.sort((a, b) => a.setNumber - b.setNumber);

        return {
          ...se,
          setLogs: sortedSets,
        };
      })
    );

    return {
      ...session,
      exercises: exercisesWithSets,
    };
  },
});

/**
 * Get last N completed sessions for a user
 */
export const getRecentSessions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 10;

    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .take(limit);

    return sessions;
  },
});

/**
 * Get user's full weekly workout plan based on their training days
 */
export const getUserWorkoutPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get user profile to determine training days
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    const totalDays = profile.trainingDaysPerWeek;

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

    // Build the weekly plan
    const weeklyPlan = [];
    const today = new Date();

    for (let i = 1; i <= totalDays; i++) {
      const dayExercises = dayMap.get(i) || [];
      const sorted = dayExercises.sort((a, b) => a.sequence - b.sequence);

      // Calculate the date for this day (starting from today)
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + (i - 1));

      const exercisesWithDetails = await Promise.all(
        sorted.map(async (te) => {
          const exercise = await ctx.db.get(te.exerciseId);
          return {
            ...te,
            exercise,
          };
        })
      );

      const dayName = sorted[0]?.dayName || `Day ${i}`;
      const formattedDate = formatDate(dayDate);

      weeklyPlan.push({
        dayIndex: i,
        dayName,
        formattedName: `Day ${i} - ${dayName} - ${formattedDate}`,
        date: dayDate.toISOString().split("T")[0],
        exercises: exercisesWithDetails,
      });
    }

    return {
      totalDays,
      plan: weeklyPlan,
    };
  },
});

/**
 * Get alternatives for an exercise
 */
export const getExerciseAlternatives = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const alternatives = await ctx.db
      .query("exerciseAlternatives")
      .withIndex("by_primary", (q) => q.eq("primaryExerciseId", args.exerciseId))
      .collect();

    // Fetch the alternative exercise details
    const result = await Promise.all(
      alternatives.map(async (alt) => {
        const exercise = await ctx.db.get(alt.alternativeExerciseId);
        return {
          ...alt,
          alternativeExercise: exercise,
        };
      })
    );

    return result;
  },
});

/**
 * Start a new workout session from template
 */
export const startSession = mutation({
  args: {
    dayIndex: v.number(),
    isDeload: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to start a workout");
    }

    // Check for existing in-progress session
    const existingSession = await ctx.db
      .query("workoutSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .first();

    if (existingSession) {
      throw new Error("You already have a workout in progress. Please finish or skip it first.");
    }

    // Get user profile to determine training days
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const totalDays = profile?.trainingDaysPerWeek ?? 5; // Default to 5-day split

    // Get template for this day and split
    const templateExercises = await ctx.db
      .query("trainingTemplate")
      .withIndex("by_day_and_total", (q) =>
        q.eq("dayIndex", args.dayIndex).eq("totalDays", totalDays)
      )
      .collect();

    if (templateExercises.length === 0) {
      throw new Error(`No template found for day ${args.dayIndex} in ${totalDays}-day split`);
    }

    // Get day name from first template exercise
    const dayName = templateExercises[0].dayName;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const formattedDate = formatDate(today);
    const isDeload = args.isDeload ?? false;

    // Format: "Day X - [Muscle Groups] - [Date]"
    const formattedDayName = `Day ${args.dayIndex} - ${dayName} - ${formattedDate}`;

    // Create the session
    const sessionId = await ctx.db.insert("workoutSessions", {
      userId,
      date: todayStr,
      dayIndex: args.dayIndex,
      dayName: formattedDayName,
      isDeload,
      status: "in_progress",
      startedAt: Date.now(),
    });

    // Create session exercises with progression recommendations
    const sorted = templateExercises.sort((a, b) => a.sequence - b.sequence);

    for (const te of sorted) {
      const exercise = await ctx.db.get(te.exerciseId);
      if (!exercise) continue;

      // Calculate progression for this exercise
      const progression = await ctx.runQuery(
        internal.progression.calculateProgression,
        {
          userId,
          dayIndex: args.dayIndex,
          exerciseId: te.exerciseId,
          exerciseType: exercise.type,
          targetRepsMin: te.targetRepsMin,
          targetRepsMax: te.targetRepsMax,
        }
      );

      // For deload weeks, reduce recommended weight by 40%
      let recommendedWeight = progression.recommendedWeight;
      if (isDeload && recommendedWeight !== null) {
        recommendedWeight = Math.round((recommendedWeight * 0.6) / 2.5) * 2.5;
      }

      await ctx.db.insert("sessionExercises", {
        sessionId,
        exerciseId: te.exerciseId,
        exerciseName: exercise.name,
        exerciseType: exercise.type,
        sequence: te.sequence,
        setsCount: te.setsCount,
        targetRepsMin: te.targetRepsMin,
        targetRepsMax: te.targetRepsMax,
        recommendedWeight: recommendedWeight ?? undefined,
        action: progression.action,
      });
    }

    return sessionId;
  },
});

/**
 * Swap an exercise in a session for an alternative
 */
export const swapExercise = mutation({
  args: {
    sessionExerciseId: v.id("sessionExercises"),
    newExerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to swap exercises");
    }

    // Get the session exercise
    const sessionExercise = await ctx.db.get(args.sessionExerciseId);
    if (!sessionExercise) {
      throw new Error("Exercise not found in this session");
    }

    // Verify ownership through session
    const session = await ctx.db.get(sessionExercise.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("You don't have permission to modify this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("This session is no longer active");
    }

    // Get the new exercise details
    const newExercise = await ctx.db.get(args.newExerciseId);
    if (!newExercise) {
      throw new Error("New exercise not found");
    }

    // Verify this is a valid alternative
    const alternatives = await ctx.db
      .query("exerciseAlternatives")
      .withIndex("by_primary", (q) => q.eq("primaryExerciseId", sessionExercise.exerciseId))
      .collect();

    const isValidAlternative = alternatives.some(
      (alt) => alt.alternativeExerciseId === args.newExerciseId
    );

    if (!isValidAlternative) {
      throw new Error("This exercise is not a valid alternative");
    }

    // Check if any sets have been logged for this exercise
    const existingSets = await ctx.db
      .query("setLogs")
      .withIndex("by_session_exercise", (q) =>
        q.eq("sessionExerciseId", args.sessionExerciseId)
      )
      .first();

    if (existingSets) {
      throw new Error("Cannot swap exercise after logging sets. Delete sets first or continue with current exercise.");
    }

    // Update the session exercise
    await ctx.db.patch(args.sessionExerciseId, {
      exerciseId: args.newExerciseId,
      exerciseName: newExercise.name,
      exerciseType: newExercise.type,
      // Reset recommended weight since it's a different exercise
      recommendedWeight: undefined,
      action: "hold",
    });

    return args.sessionExerciseId;
  },
});

/**
 * Log a single set
 */
export const logSet = mutation({
  args: {
    sessionExerciseId: v.id("sessionExercises"),
    setNumber: v.number(),
    weight: v.number(),
    reps: v.number(),
    rpe: v.optional(v.number()),
    painFlag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to log sets");
    }

    // Verify the session exercise exists and belongs to user's session
    const sessionExercise = await ctx.db.get(args.sessionExerciseId);
    if (!sessionExercise) {
      throw new Error("Exercise not found in this session");
    }

    const session = await ctx.db.get(sessionExercise.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("You don't have permission to log sets for this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("This session is no longer active");
    }

    // Check if set already exists
    const existingSet = await ctx.db
      .query("setLogs")
      .withIndex("by_session_exercise", (q) =>
        q.eq("sessionExerciseId", args.sessionExerciseId)
      )
      .filter((q) => q.eq(q.field("setNumber"), args.setNumber))
      .first();

    if (existingSet) {
      throw new Error(`Set ${args.setNumber} already logged. Use updateSet to modify it.`);
    }

    // Validate set number
    if (args.setNumber < 1 || args.setNumber > sessionExercise.setsCount) {
      throw new Error(`Set number must be between 1 and ${sessionExercise.setsCount}`);
    }

    // Validate RPE if provided
    if (args.rpe !== undefined && (args.rpe < 1 || args.rpe > 10)) {
      throw new Error("RPE must be between 1 and 10");
    }

    const setLogId = await ctx.db.insert("setLogs", {
      sessionExerciseId: args.sessionExerciseId,
      setNumber: args.setNumber,
      weight: args.weight,
      reps: args.reps,
      rpe: args.rpe,
      painFlag: args.painFlag ?? false,
    });

    return setLogId;
  },
});

/**
 * Update an existing set
 */
export const updateSet = mutation({
  args: {
    setLogId: v.id("setLogs"),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    rpe: v.optional(v.number()),
    painFlag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to update sets");
    }

    const setLog = await ctx.db.get(args.setLogId);
    if (!setLog) {
      throw new Error("Set not found");
    }

    // Verify ownership through session
    const sessionExercise = await ctx.db.get(setLog.sessionExerciseId);
    if (!sessionExercise) {
      throw new Error("Exercise not found");
    }

    const session = await ctx.db.get(sessionExercise.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("You don't have permission to update this set");
    }

    // Validate RPE if provided
    if (args.rpe !== undefined && (args.rpe < 1 || args.rpe > 10)) {
      throw new Error("RPE must be between 1 and 10");
    }

    // Build update object with only provided fields
    const updates: Partial<Doc<"setLogs">> = {};
    if (args.weight !== undefined) updates.weight = args.weight;
    if (args.reps !== undefined) updates.reps = args.reps;
    if (args.rpe !== undefined) updates.rpe = args.rpe;
    if (args.painFlag !== undefined) updates.painFlag = args.painFlag;

    await ctx.db.patch(args.setLogId, updates);

    return args.setLogId;
  },
});

/**
 * Mark session as completed
 */
export const finishSession = mutation({
  args: { sessionId: v.id("workoutSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to finish a workout");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== userId) {
      throw new Error("You don't have permission to finish this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("This session is not in progress");
    }

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      completedAt: Date.now(),
    });

    return args.sessionId;
  },
});

/**
 * Skip/cancel a session
 */
export const skipSession = mutation({
  args: { sessionId: v.id("workoutSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to skip a workout");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== userId) {
      throw new Error("You don't have permission to skip this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("This session is not in progress");
    }

    await ctx.db.patch(args.sessionId, {
      status: "skipped",
      completedAt: Date.now(),
    });

    return args.sessionId;
  },
});
