import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // User profile with fitness data
  userProfiles: defineTable({
    userId: v.id("users"),
    // Unit preferences (defaults to metric for legacy profiles)
    unitSystem: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
    
    // Basic stats (always stored in metric internally)
    sex: v.union(v.literal("male"), v.literal("female")),
    heightCm: v.number(),
    currentWeightKg: v.number(),
    age: v.optional(v.number()), // Optional for legacy profiles (defaults to 30 in calculations)
    
    // Optional body measurements for BF% estimation (in cm)
    waistCm: v.optional(v.number()),
    neckCm: v.optional(v.number()),
    hipsCm: v.optional(v.number()), // Used for female BF% calculation
    
    // Estimated body fat from Navy method
    estimatedBodyFatPercent: v.optional(v.number()),
    
    // Training preferences
    trainingDaysPerWeek: v.number(), // User chooses 3-6 days
    goal: v.union(v.literal("lean_bulk"), v.literal("cut"), v.literal("maintain")),
    
    // Calculated targets
    tdee: v.number(),
    proteinTargetG: v.number(),
    carbsTargetG: v.number(),
    fatTargetG: v.number(),
    kcalTarget: v.number(),
    
    setupComplete: v.boolean(),
    
    // Subscription status (optional for legacy profiles)
    trialStartDate: v.optional(v.string()), // ISO date when trial started
    subscriptionStatus: v.optional(v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled")
    )),
  }).index("by_user", ["userId"]),

  // Exercise library (seeded)
  exercises: defineTable({
    name: v.string(),
    muscleGroup: v.string(),
    primaryMuscle: v.optional(v.string()), // More specific: "biceps", "triceps_long_head", etc.
    type: v.union(v.literal("compound_heavy"), v.literal("compound_pump"), v.literal("isolation")),
    equipmentRequired: v.optional(v.array(v.string())), // ["barbell", "bench"] or ["dumbbells"] or ["cable"]
  }),

  // Exercise alternatives for equipment substitutions
  exerciseAlternatives: defineTable({
    primaryExerciseId: v.id("exercises"),
    alternativeExerciseId: v.id("exercises"),
    reason: v.string(), // e.g., "no_barbell", "no_cable", "home_gym"
  }).index("by_primary", ["primaryExerciseId"]),

  // Training template - supports 3-6 day splits
  trainingTemplate: defineTable({
    dayIndex: v.number(), // 1-6 (supports 3-6 day splits)
    totalDays: v.optional(v.number()), // Which split this belongs to (3, 4, 5, or 6)
    dayName: v.string(), // "Shoulders + Upper Chest"
    exerciseId: v.id("exercises"),
    sequence: v.number(), // Order in the day
    setsCount: v.number(),
    targetRepsMin: v.number(),
    targetRepsMax: v.number(),
    isPriority: v.optional(v.boolean()), // For AI to adjust based on lagging muscles
  }).index("by_day", ["dayIndex"])
    .index("by_total_days", ["totalDays"])
    .index("by_day_and_total", ["dayIndex", "totalDays"]),

  // Workout sessions
  workoutSessions: defineTable({
    userId: v.id("users"),
    date: v.string(), // ISO date
    dayIndex: v.number(),
    dayName: v.string(),
    isDeload: v.boolean(),
    status: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
    startedAt: v.number(), // timestamp
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user_and_day", ["userId", "dayIndex"]),

  // Session exercises (created from template when session starts)
  sessionExercises: defineTable({
    sessionId: v.id("workoutSessions"),
    exerciseId: v.id("exercises"),
    exerciseName: v.string(),
    exerciseType: v.union(v.literal("compound_heavy"), v.literal("compound_pump"), v.literal("isolation")),
    sequence: v.number(),
    setsCount: v.number(),
    targetRepsMin: v.number(),
    targetRepsMax: v.number(),
    recommendedWeight: v.optional(v.number()),
    action: v.optional(v.union(
      v.literal("increase"),
      v.literal("hold"),
      v.literal("decrease"),
      v.literal("micro_progress")
    )),
  }).index("by_session", ["sessionId"]),

  // Set logs - individual sets within an exercise
  setLogs: defineTable({
    sessionExerciseId: v.id("sessionExercises"),
    setNumber: v.number(),
    weight: v.number(),
    reps: v.number(),
    rpe: v.optional(v.number()),
    painFlag: v.boolean(),
  }).index("by_session_exercise", ["sessionExerciseId"]),

  // Weight logs for tracking bodyweight
  weightLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    weightKg: v.number(),
    waistCm: v.optional(v.number()), // Optional waist measurement
    estimatedBodyFatPercent: v.optional(v.number()), // Calculated if waist provided
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  // Custom foods created by users
  customFoods: defineTable({
    userId: v.id("users"),
    name: v.string(),
    proteinPer100g: v.number(),
    carbsPer100g: v.number(),
    fatPer100g: v.number(),
    caloriesPer100g: v.number(),
    source: v.union(v.literal("ai_lookup"), v.literal("manual")),
  }).index("by_user", ["userId"]),

  // Progress photos for muscle analysis
  progressPhotos: defineTable({
    userId: v.id("users"),
    date: v.string(),
    storageId: v.id("_storage"),
    analysisComplete: v.boolean(),
    muscleAnalysis: v.optional(v.object({
      overallScore: v.number(), // 1-10
      laggingMuscles: v.array(v.string()), // e.g., ["biceps", "rear_delts"]
      strongMuscles: v.array(v.string()),
      recommendations: v.array(v.string()),
    })),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  // Food items library (seeded)
  foodItems: defineTable({
    name: v.string(),
    group: v.union(
      v.literal("lean_protein"),
      v.literal("fattier_protein"),
      v.literal("starchy_carb"),
      v.literal("fat_source")
    ),
    proteinPer100g: v.number(),
    carbsPer100g: v.number(),
    fatPer100g: v.number(),
  }),

  // User's pantry inventory (standard food items)
  pantryItems: defineTable({
    userId: v.id("users"),
    foodItemId: v.id("foodItems"),
    gramsAvailable: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_food", ["userId", "foodItemId"]),

  // User's pantry inventory (custom foods from AI lookup or manual entry)
  customPantryItems: defineTable({
    userId: v.id("users"),
    customFoodId: v.id("customFoods"),
    gramsAvailable: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_food", ["userId", "customFoodId"]),

  // Generated meal plans
  mealPlans: defineTable({
    userId: v.id("users"),
    date: v.string(),
    status: v.union(v.literal("ok"), v.literal("warning")),
    warning: v.optional(v.string()),
    kcalTarget: v.number(),
    proteinTargetG: v.number(),
    carbsTargetG: v.number(),
    fatTargetG: v.number(),
    kcalActual: v.number(),
    proteinActualG: v.number(),
    carbsActualG: v.number(),
    fatActualG: v.number(),
    meals: v.array(v.object({
      mealIndex: v.number(),
      items: v.array(v.object({
        foodName: v.string(),
        grams: v.number(),
      })),
    })),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  // Daily food logs - tracks everything user eats
  foodLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // ISO date YYYY-MM-DD
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    timestamp: v.number(), // When logged
    
    // Entry type
    entryType: v.union(
      v.literal("manual"), // User entered ingredients manually
      v.literal("photo"), // AI analyzed from photo
      v.literal("quick") // Quick add (just calories/macros)
    ),
    
    // For photo entries
    photoStorageId: v.optional(v.id("_storage")),
    photoDescription: v.optional(v.string()), // AI description of the meal
    
    // Food items in this log entry
    items: v.array(v.object({
      name: v.string(),
      grams: v.number(),
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    })),
    
    // Totals for this entry
    totalCalories: v.number(),
    totalProtein: v.number(),
    totalCarbs: v.number(),
    totalFat: v.number(),
    
    // AI confidence for photo entries
    confidence: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    
    // User can mark as verified/adjusted
    isVerified: v.boolean(),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),
});
