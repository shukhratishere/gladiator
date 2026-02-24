import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { lbsToKg, kgToLbs, feetInchesToCm, cmToFeetInches, inchesToCm, cmToInches } from "./lib/units";
import { calculateBodyFatNavy } from "./lib/bodyFat";

/**
 * Check if user's trial has expired (7 days from trial start)
 */
export const checkSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { status: "expired" as const, canAccess: false };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      return { status: "expired" as const, canAccess: false };
    }

    // If active subscription, allow access
    if (profile.subscriptionStatus === "active") {
      return { status: "active" as const, canAccess: true };
    }

    // Check trial status
    if (profile.subscriptionStatus === "trial" && profile.trialStartDate) {
      const trialStart = new Date(profile.trialStartDate);
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + 7); // 7 days from start
      
      const now = new Date();
      const msRemaining = trialEnd.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

      if (daysRemaining > 0) {
        return { 
          status: "trial" as const, 
          trialDaysLeft: daysRemaining,
          trialEndsAt: trialEnd.toISOString().split("T")[0],
          canAccess: true 
        };
      } else {
        // Trial expired
        return { status: "expired" as const, trialDaysLeft: 0, canAccess: false };
      }
    }

    return { status: "expired" as const, canAccess: false };
  },
});

/**
 * Update subscription status (called after successful payment)
 */
export const updateSubscriptionStatus = mutation({
  args: {
    status: v.union(v.literal("trial"), v.literal("active"), v.literal("expired"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to continue");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      subscriptionStatus: args.status,
    });

    return null;
  },
});

/**
 * Get current user's profile
 */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return profile;
  },
});

/**
 * Get profile with values converted to user's preferred unit system
 */
export const getProfileWithUnits = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    // Default to metric for legacy profiles
    const unitSystem = profile.unitSystem ?? "metric";

    if (unitSystem === "imperial") {
      const heightFeetInches = cmToFeetInches(profile.heightCm);
      return {
        ...profile,
        // Converted values for display
        displayWeight: Math.round(kgToLbs(profile.currentWeightKg) * 10) / 10,
        displayWeightUnit: "lbs",
        displayHeightFeet: heightFeetInches.feet,
        displayHeightInches: heightFeetInches.inches,
        displayHeightUnit: "ft/in",
        displayWaist: profile.waistCm ? Math.round(cmToInches(profile.waistCm) * 10) / 10 : undefined,
        displayNeck: profile.neckCm ? Math.round(cmToInches(profile.neckCm) * 10) / 10 : undefined,
        displayHips: profile.hipsCm ? Math.round(cmToInches(profile.hipsCm) * 10) / 10 : undefined,
        displayMeasurementUnit: "in",
      };
    }

    // Metric - return as-is with display labels
    return {
      ...profile,
      displayWeight: profile.currentWeightKg,
      displayWeightUnit: "kg",
      displayHeightCm: profile.heightCm,
      displayHeightUnit: "cm",
      displayWaist: profile.waistCm,
      displayNeck: profile.neckCm,
      displayHips: profile.hipsCm,
      displayMeasurementUnit: "cm",
    };
  },
});

/**
 * Check if user has completed setup
 */
export const isSetupComplete = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return profile?.setupComplete ?? false;
  },
});

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
function calculateBMR(
  sex: "male" | "female",
  weightKg: number,
  heightCm: number,
  age: number
): number {
  // Male: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
  // Female: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/**
 * Calculate TDEE from BMR with activity multiplier based on training days
 */
function calculateTDEE(bmr: number, trainingDaysPerWeek: number): number {
  // Activity multipliers based on training frequency
  // 3 days: 1.375 (light activity)
  // 4 days: 1.465 (light-moderate)
  // 5 days: 1.55 (moderate activity)
  // 6 days: 1.635 (moderate-high)
  const multipliers: Record<number, number> = {
    3: 1.375,
    4: 1.465,
    5: 1.55,
    6: 1.635,
  };
  const multiplier = multipliers[trainingDaysPerWeek] ?? 1.55;
  return Math.round(bmr * multiplier);
}

/**
 * Adjust TDEE based on goal
 */
function adjustForGoal(
  tdee: number,
  goal: "lean_bulk" | "cut" | "maintain"
): number {
  switch (goal) {
    case "lean_bulk":
      return tdee + 300;
    case "cut":
      return tdee - 500;
    case "maintain":
      return tdee;
  }
}

/**
 * Calculate macro targets based on bodyweight and calorie target
 */
function calculateMacros(
  weightKg: number,
  kcalTarget: number
): { proteinG: number; fatG: number; carbsG: number } {
  // Protein: 2.1 g/kg bodyweight
  const proteinG = Math.round(weightKg * 2.1);

  // Fat: 0.8 g/kg bodyweight
  const fatG = Math.round(weightKg * 0.8);

  // Carbs: remaining calories ÷ 4
  // Protein = 4 kcal/g, Fat = 9 kcal/g, Carbs = 4 kcal/g
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const remainingKcal = kcalTarget - proteinKcal - fatKcal;
  const carbsG = Math.round(Math.max(0, remainingKcal / 4));

  return { proteinG, fatG, carbsG };
}

/**
 * Create or update user profile with calculated targets
 */
export const createProfile = mutation({
  args: {
    unitSystem: v.union(v.literal("metric"), v.literal("imperial")),
    sex: v.union(v.literal("male"), v.literal("female")),
    age: v.number(),
    goal: v.union(v.literal("lean_bulk"), v.literal("cut"), v.literal("maintain")),
    trainingDaysPerWeek: v.number(),
    // Weight - in user's unit system
    weight: v.number(),
    // Height - metric: heightCm, imperial: heightFeet + heightInches
    heightCm: v.optional(v.number()),
    heightFeet: v.optional(v.number()),
    heightInches: v.optional(v.number()),
    // Optional body measurements (in user's unit system)
    waist: v.optional(v.number()),
    neck: v.optional(v.number()),
    hips: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to create your profile");
    }

    // Validate age
    if (args.age < 16 || args.age > 100) {
      throw new Error("Age must be between 16 and 100");
    }

    // Validate training days
    if (args.trainingDaysPerWeek < 3 || args.trainingDaysPerWeek > 6) {
      throw new Error("Training days must be between 3 and 6");
    }

    // Convert to metric for storage
    let weightKg: number;
    let heightCm: number;
    let waistCm: number | undefined;
    let neckCm: number | undefined;
    let hipsCm: number | undefined;

    if (args.unitSystem === "imperial") {
      weightKg = lbsToKg(args.weight);
      if (args.heightFeet === undefined || args.heightInches === undefined) {
        throw new Error("Please provide height in feet and inches");
      }
      heightCm = feetInchesToCm(args.heightFeet, args.heightInches);
      waistCm = args.waist ? inchesToCm(args.waist) : undefined;
      neckCm = args.neck ? inchesToCm(args.neck) : undefined;
      hipsCm = args.hips ? inchesToCm(args.hips) : undefined;
    } else {
      weightKg = args.weight;
      if (!args.heightCm) {
        throw new Error("Please provide height in centimeters");
      }
      heightCm = args.heightCm;
      waistCm = args.waist;
      neckCm = args.neck;
      hipsCm = args.hips;
    }

    // Validate converted values
    if (heightCm < 100 || heightCm > 250) {
      throw new Error("Height must be between 100 and 250 cm (or 3'3\" to 8'2\")");
    }
    if (weightKg < 30 || weightKg > 300) {
      throw new Error("Weight must be between 30 and 300 kg (or 66 to 660 lbs)");
    }

    // Calculate body fat if measurements provided
    let estimatedBodyFatPercent: number | undefined;
    if (waistCm && neckCm) {
      estimatedBodyFatPercent = calculateBodyFatNavy(
        args.sex,
        waistCm,
        neckCm,
        heightCm,
        hipsCm
      );
    }

    // Calculate BMR and TDEE with actual age
    const bmr = calculateBMR(args.sex, weightKg, heightCm, args.age);
    const baseTdee = calculateTDEE(bmr, args.trainingDaysPerWeek);
    const tdee = adjustForGoal(baseTdee, args.goal);

    // Calculate macros
    const macros = calculateMacros(weightKg, tdee);

    // Check for existing profile
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const today = new Date().toISOString().split("T")[0];

    const profileData = {
      userId,
      unitSystem: args.unitSystem,
      sex: args.sex,
      heightCm,
      currentWeightKg: weightKg,
      age: args.age,
      waistCm,
      neckCm,
      hipsCm,
      estimatedBodyFatPercent,
      goal: args.goal,
      trainingDaysPerWeek: args.trainingDaysPerWeek,
      tdee,
      proteinTargetG: macros.proteinG,
      carbsTargetG: macros.carbsG,
      fatTargetG: macros.fatG,
      kcalTarget: tdee,
      setupComplete: true,
      trialStartDate: today,
      subscriptionStatus: "trial" as const,
    };

    if (existingProfile) {
      // Preserve existing subscription status if not trial
      const subscriptionData = existingProfile.subscriptionStatus !== "trial" 
        ? { 
            trialStartDate: existingProfile.trialStartDate,
            subscriptionStatus: existingProfile.subscriptionStatus,
          }
        : {
            trialStartDate: existingProfile.trialStartDate ?? today,
            subscriptionStatus: existingProfile.subscriptionStatus,
          };
      
      await ctx.db.patch(existingProfile._id, {
        ...profileData,
        ...subscriptionData,
      });
      return { _id: existingProfile._id, ...profileData, ...subscriptionData };
    } else {
      const profileId = await ctx.db.insert("userProfiles", profileData);
      return { _id: profileId, ...profileData };
    }
  },
});
