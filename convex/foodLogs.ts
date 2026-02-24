import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get today's food logs
export const getTodaysLogs = query({
  args: {},
  returns: v.object({
    logs: v.array(v.object({
      _id: v.id("foodLogs"),
      mealType: v.string(),
      timestamp: v.number(),
      entryType: v.string(),
      photoUrl: v.optional(v.union(v.string(), v.null())),
      photoDescription: v.optional(v.string()),
      items: v.array(v.object({
        name: v.string(),
        grams: v.number(),
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
      })),
      totalCalories: v.number(),
      totalProtein: v.number(),
      totalCarbs: v.number(),
      totalFat: v.number(),
      confidence: v.optional(v.string()),
      isVerified: v.boolean(),
      notes: v.optional(v.string()),
    })),
    totals: v.object({
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    }),
    targets: v.object({
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    }),
    // Warnings based on goal
    warnings: v.array(v.object({
      type: v.union(v.literal("under"), v.literal("over"), v.literal("info")),
      message: v.string(),
    })),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        logs: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        targets: { calories: 2000, protein: 150, carbs: 250, fat: 70 },
        warnings: [],
      };
    }

    const today = new Date().toISOString().split("T")[0];
    
    // Get today's logs
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", today))
      .collect();

    // Get photo URLs
    const logsWithUrls = await Promise.all(
      logs.map(async (log) => ({
        _id: log._id,
        mealType: log.mealType,
        timestamp: log.timestamp,
        entryType: log.entryType,
        photoUrl: log.photoStorageId ? await ctx.storage.getUrl(log.photoStorageId) : undefined,
        photoDescription: log.photoDescription,
        items: log.items,
        totalCalories: log.totalCalories,
        totalProtein: log.totalProtein,
        totalCarbs: log.totalCarbs,
        totalFat: log.totalFat,
        confidence: log.confidence,
        isVerified: log.isVerified,
        notes: log.notes,
      }))
    );

    // Calculate totals
    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.totalCalories,
        protein: acc.protein + log.totalProtein,
        carbs: acc.carbs + log.totalCarbs,
        fat: acc.fat + log.totalFat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Get user's targets
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const targets = profile
      ? {
          calories: profile.kcalTarget,
          protein: profile.proteinTargetG,
          carbs: profile.carbsTargetG,
          fat: profile.fatTargetG,
        }
      : { calories: 2000, protein: 150, carbs: 250, fat: 70 };

    // Generate warnings based on goal and current intake
    const warnings: Array<{ type: "under" | "over" | "info"; message: string }> = [];
    const currentHour = new Date().getHours();
    const dayProgress = currentHour / 24; // 0-1 representing how much of the day has passed

    if (profile) {
      const caloriePercent = (totals.calories / targets.calories) * 100;
      const proteinPercent = (totals.protein / targets.protein) * 100;

      if (profile.goal === "cut") {
        // Cutting - warn if over calories
        if (caloriePercent > 100) {
          warnings.push({
            type: "over",
            message: `You're ${Math.round(totals.calories - targets.calories)} calories over your cut target. Consider lighter meals for the rest of the day.`,
          });
        } else if (caloriePercent > 90 && currentHour < 18) {
          warnings.push({
            type: "info",
            message: `You've used ${Math.round(caloriePercent)}% of your calories. Plan your remaining meals carefully.`,
          });
        }
        // Warn if protein is low
        if (proteinPercent < dayProgress * 80) {
          warnings.push({
            type: "under",
            message: `Protein intake is low (${Math.round(totals.protein)}g). Prioritize protein in your next meal to preserve muscle.`,
          });
        }
      } else if (profile.goal === "lean_bulk") {
        // Bulking - warn if under calories
        const expectedCalories = targets.calories * dayProgress;
        if (totals.calories < expectedCalories * 0.7 && currentHour > 14) {
          warnings.push({
            type: "under",
            message: `You're behind on calories for a bulk. You need ${Math.round(targets.calories - totals.calories)} more calories today.`,
          });
        }
        if (caloriePercent > 120) {
          warnings.push({
            type: "over",
            message: `You're ${Math.round(caloriePercent - 100)}% over target. Too much surplus leads to excess fat gain.`,
          });
        }
        // Protein check
        if (proteinPercent < dayProgress * 80) {
          warnings.push({
            type: "under",
            message: `Increase protein intake (${Math.round(totals.protein)}g/${targets.protein}g) to maximize muscle growth.`,
          });
        }
      } else {
        // Maintenance
        if (Math.abs(totals.calories - targets.calories) > 300 && currentHour > 20) {
          if (totals.calories > targets.calories) {
            warnings.push({
              type: "over",
              message: `You're ${Math.round(totals.calories - targets.calories)} calories over maintenance.`,
            });
          } else {
            warnings.push({
              type: "under",
              message: `You're ${Math.round(targets.calories - totals.calories)} calories under maintenance.`,
            });
          }
        }
      }
    }

    return {
      logs: logsWithUrls,
      totals,
      targets,
      warnings,
    };
  },
});

// Get logs for a specific date
export const getLogsByDate = query({
  args: { date: v.string() },
  returns: v.array(v.object({
    _id: v.id("foodLogs"),
    mealType: v.string(),
    timestamp: v.number(),
    entryType: v.string(),
    items: v.array(v.object({
      name: v.string(),
      grams: v.number(),
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    })),
    totalCalories: v.number(),
    totalProtein: v.number(),
    totalCarbs: v.number(),
    totalFat: v.number(),
  })),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .collect();

    return logs.map((log) => ({
      _id: log._id,
      mealType: log.mealType,
      timestamp: log.timestamp,
      entryType: log.entryType,
      items: log.items,
      totalCalories: log.totalCalories,
      totalProtein: log.totalProtein,
      totalCarbs: log.totalCarbs,
      totalFat: log.totalFat,
    }));
  },
});

// Log food manually (ingredients with grams)
export const logFoodManual = mutation({
  args: {
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    items: v.array(v.object({
      name: v.string(),
      grams: v.number(),
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    })),
    notes: v.optional(v.string()),
  },
  returns: v.id("foodLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to log food");

    const today = new Date().toISOString().split("T")[0];

    // Calculate totals
    const totals = args.items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return await ctx.db.insert("foodLogs", {
      userId,
      date: today,
      mealType: args.mealType,
      timestamp: Date.now(),
      entryType: "manual",
      items: args.items,
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      isVerified: true,
      notes: args.notes,
    });
  },
});

// Quick add (just totals, no breakdown)
export const logFoodQuick = mutation({
  args: {
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    name: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.id("foodLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to log food");

    const today = new Date().toISOString().split("T")[0];

    return await ctx.db.insert("foodLogs", {
      userId,
      date: today,
      mealType: args.mealType,
      timestamp: Date.now(),
      entryType: "quick",
      items: [{
        name: args.name,
        grams: 0,
        calories: args.calories,
        protein: args.protein,
        carbs: args.carbs,
        fat: args.fat,
      }],
      totalCalories: args.calories,
      totalProtein: args.protein,
      totalCarbs: args.carbs,
      totalFat: args.fat,
      isVerified: true,
      notes: args.notes,
    });
  },
});

// Generate upload URL for meal photo
export const generateMealPhotoUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to upload photos");
    return await ctx.storage.generateUploadUrl();
  },
});

// Save photo log (called after AI analysis)
export const saveMealPhotoLog = mutation({
  args: {
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    storageId: v.id("_storage"),
    photoDescription: v.string(),
    items: v.array(v.object({
      name: v.string(),
      grams: v.number(),
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    })),
    confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    notes: v.optional(v.string()),
  },
  returns: v.id("foodLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to log food");

    const today = new Date().toISOString().split("T")[0];

    // Calculate totals
    const totals = args.items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return await ctx.db.insert("foodLogs", {
      userId,
      date: today,
      mealType: args.mealType,
      timestamp: Date.now(),
      entryType: "photo",
      photoStorageId: args.storageId,
      photoDescription: args.photoDescription,
      items: args.items,
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      confidence: args.confidence,
      isVerified: false, // User should verify AI estimates
      notes: args.notes,
    });
  },
});

// Update a food log (for editing/verifying)
export const updateFoodLog = mutation({
  args: {
    logId: v.id("foodLogs"),
    items: v.optional(v.array(v.object({
      name: v.string(),
      grams: v.number(),
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    }))),
    isVerified: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to update food logs");

    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== userId) {
      throw new Error("Food log not found");
    }

    const updates: {
      items?: typeof args.items;
      totalCalories?: number;
      totalProtein?: number;
      totalCarbs?: number;
      totalFat?: number;
      isVerified?: boolean;
      notes?: string;
    } = {};

    if (args.items !== undefined) {
      updates.items = args.items;
      // Recalculate totals
      const totals = args.items.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      updates.totalCalories = Math.round(totals.calories);
      updates.totalProtein = Math.round(totals.protein * 10) / 10;
      updates.totalCarbs = Math.round(totals.carbs * 10) / 10;
      updates.totalFat = Math.round(totals.fat * 10) / 10;
    }

    if (args.isVerified !== undefined) {
      updates.isVerified = args.isVerified;
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.logId, updates);
    return null;
  },
});

// Delete a food log
export const deleteFoodLog = mutation({
  args: { logId: v.id("foodLogs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to delete food logs");

    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== userId) {
      throw new Error("Food log not found");
    }

    // Delete photo if exists
    if (log.photoStorageId) {
      await ctx.storage.delete(log.photoStorageId);
    }

    await ctx.db.delete(args.logId);
    return null;
  },
});

// Get weekly summary
export const getWeeklySummary = query({
  args: {},
  returns: v.array(v.object({
    date: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    target: v.number(),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get last 7 days
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // Get user's target
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const target = profile?.kcalTarget || 2000;

    // Get logs for each day
    const summary = await Promise.all(
      dates.map(async (date) => {
        const logs = await ctx.db
          .query("foodLogs")
          .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
          .collect();

        const totals = logs.reduce(
          (acc, log) => ({
            calories: acc.calories + log.totalCalories,
            protein: acc.protein + log.totalProtein,
            carbs: acc.carbs + log.totalCarbs,
            fat: acc.fat + log.totalFat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return {
          date,
          ...totals,
          target,
        };
      })
    );

    return summary;
  },
});
