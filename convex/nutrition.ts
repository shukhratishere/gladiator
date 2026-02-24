import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { lbsToKg, kgToLbs, inchesToCm, cmToInches } from "./lib/units";
import { calculateBodyFatNavy } from "./lib/bodyFat";

/**
 * Get current macro/calorie targets
 */
export const getTargets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    return {
      kcalTarget: profile.kcalTarget,
      proteinTargetG: profile.proteinTargetG,
      carbsTargetG: profile.carbsTargetG,
      fatTargetG: profile.fatTargetG,
      goal: profile.goal,
      currentWeightKg: profile.currentWeightKg,
    };
  },
});

/**
 * Get weight logs for last N days
 */
export const getWeightLogs = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const days = args.days ?? 30;

    // Calculate date N days ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const logs = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter by date and sort
    const filtered = logs
      .filter((log) => log.date >= startDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    return filtered;
  },
});

/**
 * Calculate weight trend over 7 days
 * Compares average of first 3 days vs last 3 days
 */
export const getWeightTrend = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get last 7 days of logs
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split("T")[0];

    const logs = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const recentLogs = logs
      .filter((log) => log.date >= startDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (recentLogs.length < 3) {
      return {
        hasEnoughData: false,
        message: "Need at least 3 weight entries in the last 7 days",
      };
    }

    // Get first 3 and last 3 entries
    const first3 = recentLogs.slice(0, 3);
    const last3 = recentLogs.slice(-3);

    const avgFirst = first3.reduce((sum, l) => sum + l.weightKg, 0) / first3.length;
    const avgLast = last3.reduce((sum, l) => sum + l.weightKg, 0) / last3.length;

    const changeKg = avgLast - avgFirst;
    const changePercent = (changeKg / avgFirst) * 100;

    // Weekly rate (extrapolate from available data)
    const daysBetween = Math.max(1, recentLogs.length - 1);
    const weeklyChangePercent = (changePercent / daysBetween) * 7;

    return {
      hasEnoughData: true,
      avgFirstKg: Math.round(avgFirst * 10) / 10,
      avgLastKg: Math.round(avgLast * 10) / 10,
      changeKg: Math.round(changeKg * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      weeklyChangePercent: Math.round(weeklyChangePercent * 100) / 100,
      entriesCount: recentLogs.length,
    };
  },
});

/**
 * Get body composition trend (weight + body fat %) over time
 */
export const getBodyCompositionTrend = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const days = args.days ?? 90;

    // Get profile for unit conversion
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    // Calculate date N days ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const logs = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const filtered = logs
      .filter((log) => log.date >= startDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Convert to user's preferred units
    const isImperial = profile.unitSystem === "imperial";

    const dataPoints = filtered.map((log) => ({
      date: log.date,
      weight: isImperial 
        ? Math.round(kgToLbs(log.weightKg) * 10) / 10 
        : log.weightKg,
      weightUnit: isImperial ? "lbs" : "kg",
      waist: log.waistCm 
        ? (isImperial ? Math.round(cmToInches(log.waistCm) * 10) / 10 : log.waistCm)
        : undefined,
      waistUnit: isImperial ? "in" : "cm",
      bodyFatPercent: log.estimatedBodyFatPercent,
    }));

    // Calculate trends if enough data
    const logsWithBf = filtered.filter((l) => l.estimatedBodyFatPercent !== undefined);
    
    let bfTrend: { startBf: number; endBf: number; changeBf: number } | null = null;
    if (logsWithBf.length >= 2) {
      const startBf = logsWithBf[0].estimatedBodyFatPercent!;
      const endBf = logsWithBf[logsWithBf.length - 1].estimatedBodyFatPercent!;
      bfTrend = {
        startBf: Math.round(startBf * 10) / 10,
        endBf: Math.round(endBf * 10) / 10,
        changeBf: Math.round((endBf - startBf) * 10) / 10,
      };
    }

    let weightTrend: { startWeight: number; endWeight: number; changeWeight: number } | null = null;
    if (filtered.length >= 2) {
      const startWeight = filtered[0].weightKg;
      const endWeight = filtered[filtered.length - 1].weightKg;
      const changeKg = endWeight - startWeight;
      
      weightTrend = {
        startWeight: isImperial 
          ? Math.round(kgToLbs(startWeight) * 10) / 10 
          : Math.round(startWeight * 10) / 10,
        endWeight: isImperial 
          ? Math.round(kgToLbs(endWeight) * 10) / 10 
          : Math.round(endWeight * 10) / 10,
        changeWeight: isImperial 
          ? Math.round(kgToLbs(changeKg) * 10) / 10 
          : Math.round(changeKg * 10) / 10,
      };
    }

    return {
      dataPoints,
      weightTrend,
      bfTrend,
      unitSystem: profile.unitSystem,
    };
  },
});

/**
 * Get meal plan for today
 */
export const getTodaysMealPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const today = new Date().toISOString().split("T")[0];

    const mealPlan = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", today))
      .first();

    return mealPlan;
  },
});

/**
 * Log daily bodyweight with optional waist measurement
 */
export const logWeight = mutation({
  args: {
    weight: v.number(), // In user's preferred unit system
    waist: v.optional(v.number()), // In user's preferred unit system
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to log your weight");
    }

    // Get profile for unit conversion and body fat calculation
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Please complete your profile setup first");
    }

    // Convert to metric for storage
    const isImperial = profile.unitSystem === "imperial";
    const weightKg = isImperial ? lbsToKg(args.weight) : args.weight;
    const waistCm = args.waist 
      ? (isImperial ? inchesToCm(args.waist) : args.waist)
      : undefined;

    // Validate converted values
    if (weightKg < 30 || weightKg > 300) {
      throw new Error("Weight must be between 30-300 kg (66-660 lbs)");
    }

    if (waistCm && (waistCm < 40 || waistCm > 200)) {
      throw new Error("Waist measurement must be between 40-200 cm (16-79 inches)");
    }

    // Calculate body fat if waist provided and profile has neck measurement
    let estimatedBodyFatPercent: number | undefined;
    if (waistCm && profile.neckCm) {
      estimatedBodyFatPercent = calculateBodyFatNavy(
        profile.sex,
        waistCm,
        profile.neckCm,
        profile.heightCm,
        profile.hipsCm
      );
    }

    const date = args.date ?? new Date().toISOString().split("T")[0];

    // Check for existing entry on this date
    const existing = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, { 
        weightKg,
        waistCm,
        estimatedBodyFatPercent,
      });
      
      // Update current weight in profile
      await ctx.db.patch(profile._id, { 
        currentWeightKg: weightKg,
        ...(waistCm && { waistCm }),
        ...(estimatedBodyFatPercent && { estimatedBodyFatPercent }),
      });
      
      return existing._id;
    }

    // Create new entry
    const logId = await ctx.db.insert("weightLogs", {
      userId,
      date,
      weightKg,
      waistCm,
      estimatedBodyFatPercent,
    });

    // Update current weight and measurements in profile
    await ctx.db.patch(profile._id, { 
      currentWeightKg: weightKg,
      ...(waistCm && { waistCm }),
      ...(estimatedBodyFatPercent && { estimatedBodyFatPercent }),
    });

    return logId;
  },
});

/**
 * Recalculate targets based on weight trend
 */
export const recalculateTargets = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to recalculate targets");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Please complete your profile setup first");
    }

    // Get weight trend
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split("T")[0];

    const logs = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const recentLogs = logs
      .filter((log) => log.date >= startDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (recentLogs.length < 3) {
      throw new Error("Need at least 3 weight entries in the last 7 days to recalculate");
    }

    // Calculate trend
    const first3 = recentLogs.slice(0, 3);
    const last3 = recentLogs.slice(-3);
    const avgFirst = first3.reduce((sum, l) => sum + l.weightKg, 0) / first3.length;
    const avgLast = last3.reduce((sum, l) => sum + l.weightKg, 0) / last3.length;
    const changePercent = ((avgLast - avgFirst) / avgFirst) * 100;

    // Extrapolate to weekly rate
    const daysBetween = Math.max(1, recentLogs.length - 1);
    const weeklyChangePercent = (changePercent / daysBetween) * 7;

    let kcalAdjustment = 0;
    let adjustmentReason = "";

    if (profile.goal === "cut") {
      // Goal cut: losing 0.5-1% BW/week → keep
      if (weeklyChangePercent <= -0.5 && weeklyChangePercent >= -1) {
        adjustmentReason = "On track - losing 0.5-1% per week";
      } else if (Math.abs(weeklyChangePercent) < 0.25) {
        // Flat (<0.25% change) → reduce 100 kcal
        kcalAdjustment = -100;
        adjustmentReason = "Weight flat - reducing 100 kcal";
      } else if (weeklyChangePercent > 0) {
        // Gaining → reduce 150 kcal
        kcalAdjustment = -150;
        adjustmentReason = "Gaining weight - reducing 150 kcal";
      } else if (weeklyChangePercent < -1) {
        // Losing too fast - could add calories but keeping for now
        adjustmentReason = "Losing faster than target - consider adding calories";
      }
    } else if (profile.goal === "lean_bulk") {
      // Goal lean_bulk: gaining 0.25-0.5% BW/week → keep
      if (weeklyChangePercent >= 0.25 && weeklyChangePercent <= 0.5) {
        adjustmentReason = "On track - gaining 0.25-0.5% per week";
      } else if (Math.abs(weeklyChangePercent) < 0.25) {
        // Flat → increase 100 kcal
        kcalAdjustment = 100;
        adjustmentReason = "Weight flat - increasing 100 kcal";
      } else if (weeklyChangePercent > 0.75) {
        // Gaining >0.75%/week → reduce 100 kcal
        kcalAdjustment = -100;
        adjustmentReason = "Gaining too fast - reducing 100 kcal";
      } else if (weeklyChangePercent < 0) {
        // Losing weight on bulk → increase calories
        kcalAdjustment = 150;
        adjustmentReason = "Losing weight - increasing 150 kcal";
      }
    } else {
      // Maintain
      if (Math.abs(weeklyChangePercent) < 0.25) {
        adjustmentReason = "Weight stable - maintaining";
      } else if (weeklyChangePercent > 0.25) {
        kcalAdjustment = -100;
        adjustmentReason = "Gaining weight - reducing 100 kcal";
      } else {
        kcalAdjustment = 100;
        adjustmentReason = "Losing weight - increasing 100 kcal";
      }
    }

    // Apply adjustment
    const newKcalTarget = profile.kcalTarget + kcalAdjustment;

    // Recalculate macros with new calorie target
    const proteinG = Math.round(profile.currentWeightKg * 2.1);
    const fatG = Math.round(profile.currentWeightKg * 0.8);
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const remainingKcal = newKcalTarget - proteinKcal - fatKcal;
    const carbsG = Math.round(Math.max(0, remainingKcal / 4));

    await ctx.db.patch(profile._id, {
      kcalTarget: newKcalTarget,
      proteinTargetG: proteinG,
      carbsTargetG: carbsG,
      fatTargetG: fatG,
    });

    return {
      previousKcal: profile.kcalTarget,
      newKcal: newKcalTarget,
      adjustment: kcalAdjustment,
      reason: adjustmentReason,
      weeklyChangePercent: Math.round(weeklyChangePercent * 100) / 100,
    };
  },
});
