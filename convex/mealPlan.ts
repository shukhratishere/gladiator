import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

// Tolerance bands for macro matching
const TOLERANCE = {
  protein: 5, // ±5g
  carbs: 10, // ±10g
  fat: 3, // ±3g
};

interface FoodWithGrams {
  foodId: Id<"foodItems">;
  foodName: string;
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealPlanMeal {
  mealIndex: number;
  items: { foodName: string; grams: number }[];
}

interface PantryItemWithFood {
  _id: Id<"pantryItems">;
  foodItemId: Id<"foodItems">;
  gramsAvailable: number;
  food: Doc<"foodItems">;
}

/**
 * Calculate macros for a food item at given grams
 */
function calculateMacros(
  food: Doc<"foodItems">,
  grams: number
): { protein: number; carbs: number; fat: number; kcal: number } {
  const multiplier = grams / 100;
  const protein = food.proteinPer100g * multiplier;
  const carbs = food.carbsPer100g * multiplier;
  const fat = food.fatPer100g * multiplier;
  const kcal = protein * 4 + carbs * 4 + fat * 9;

  return {
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    kcal: Math.round(kcal),
  };
}

/**
 * Calculate total macros for a list of food items with grams
 */
function calculateMealMacros(items: FoodWithGrams[]): {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
} {
  const totals = items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  return {
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    kcal: Math.round(totals.protein * 4 + totals.carbs * 4 + totals.fat * 9),
  };
}

/**
 * Find grams needed to hit a target macro from a food
 */
function gramsForMacro(
  food: Doc<"foodItems">,
  macro: "protein" | "carbs" | "fat",
  targetGrams: number
): number {
  const per100g =
    macro === "protein"
      ? food.proteinPer100g
      : macro === "carbs"
        ? food.carbsPer100g
        : food.fatPer100g;

  if (per100g === 0) return 0;
  return Math.round((targetGrams / per100g) * 100);
}

/**
 * Generate meal plan from pantry
 */
export const generateMealPlan = mutation({
  args: {
    mealsPerDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to generate a meal plan");
    }

    const mealsPerDay = args.mealsPerDay ?? 3;
    if (mealsPerDay < 1 || mealsPerDay > 6) {
      throw new Error("Meals per day must be between 1 and 6");
    }

    // Get user's profile and targets
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Please complete your profile setup first");
    }

    // Get pantry items with food details
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (pantryItems.length === 0) {
      throw new Error("Your pantry is empty. Add some food items first.");
    }

    const pantryWithFood: PantryItemWithFood[] = [];
    for (const item of pantryItems) {
      const food = await ctx.db.get(item.foodItemId);
      if (food && item.gramsAvailable > 0) {
        pantryWithFood.push({ ...item, food });
      }
    }

    if (pantryWithFood.length === 0) {
      throw new Error("No food items with available quantity in your pantry");
    }

    // Categorize pantry items
    const leanProteins = pantryWithFood.filter((p) => p.food.group === "lean_protein");
    const fattierProteins = pantryWithFood.filter((p) => p.food.group === "fattier_protein");
    const carbs = pantryWithFood.filter((p) => p.food.group === "starchy_carb");
    const fats = pantryWithFood.filter((p) => p.food.group === "fat_source");

    const allProteins = [...leanProteins, ...fattierProteins];

    if (allProteins.length === 0) {
      throw new Error("No protein sources in your pantry. Add chicken, beef, eggs, etc.");
    }

    if (carbs.length === 0) {
      throw new Error("No carb sources in your pantry. Add rice, oats, potatoes, etc.");
    }

    // Calculate per-meal targets
    const perMealTargets = {
      protein: Math.round(profile.proteinTargetG / mealsPerDay),
      carbs: Math.round(profile.carbsTargetG / mealsPerDay),
      fat: Math.round(profile.fatTargetG / mealsPerDay),
    };

    // Track remaining pantry quantities
    const remaining = new Map<Id<"foodItems">, number>();
    for (const item of pantryWithFood) {
      remaining.set(item.foodItemId, item.gramsAvailable);
    }

    const meals: MealPlanMeal[] = [];
    const warnings: string[] = [];

    // Generate each meal
    for (let mealIdx = 0; mealIdx < mealsPerDay; mealIdx++) {
      const mealItems: FoodWithGrams[] = [];
      let mealProtein = 0;
      let mealCarbs = 0;
      let mealFat = 0;

      // 1. Pick protein source (prefer lean, use fattier if needed)
      let proteinSource: PantryItemWithFood | null = null;

      // Try lean proteins first
      for (const p of leanProteins) {
        const avail = remaining.get(p.foodItemId) ?? 0;
        if (avail > 50) {
          proteinSource = p;
          break;
        }
      }

      // Fall back to fattier proteins
      if (!proteinSource) {
        for (const p of fattierProteins) {
          const avail = remaining.get(p.foodItemId) ?? 0;
          if (avail > 50) {
            proteinSource = p;
            break;
          }
        }
      }

      if (proteinSource) {
        const neededGrams = gramsForMacro(proteinSource.food, "protein", perMealTargets.protein);
        const available = remaining.get(proteinSource.foodItemId) ?? 0;
        const useGrams = Math.min(neededGrams, available);

        if (useGrams > 0) {
          const macros = calculateMacros(proteinSource.food, useGrams);
          mealItems.push({
            foodId: proteinSource.foodItemId,
            foodName: proteinSource.food.name,
            grams: useGrams,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
          });
          mealProtein += macros.protein;
          mealCarbs += macros.carbs;
          mealFat += macros.fat;
          remaining.set(proteinSource.foodItemId, available - useGrams);
        }
      } else {
        warnings.push(`Meal ${mealIdx + 1}: Not enough protein sources available`);
      }

      // 2. Pick carb source
      let carbSource: PantryItemWithFood | null = null;
      for (const c of carbs) {
        const avail = remaining.get(c.foodItemId) ?? 0;
        if (avail > 30) {
          carbSource = c;
          break;
        }
      }

      if (carbSource) {
        const remainingCarbs = Math.max(0, perMealTargets.carbs - mealCarbs);
        const neededGrams = gramsForMacro(carbSource.food, "carbs", remainingCarbs);
        const available = remaining.get(carbSource.foodItemId) ?? 0;
        const useGrams = Math.min(neededGrams, available);

        if (useGrams > 0) {
          const macros = calculateMacros(carbSource.food, useGrams);
          mealItems.push({
            foodId: carbSource.foodItemId,
            foodName: carbSource.food.name,
            grams: useGrams,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
          });
          mealProtein += macros.protein;
          mealCarbs += macros.carbs;
          mealFat += macros.fat;
          remaining.set(carbSource.foodItemId, available - useGrams);
        }
      } else {
        warnings.push(`Meal ${mealIdx + 1}: Not enough carb sources available`);
      }

      // 3. Add fat source if needed
      const remainingFat = perMealTargets.fat - mealFat;
      if (remainingFat > TOLERANCE.fat) {
        let fatSource: PantryItemWithFood | null = null;
        for (const f of fats) {
          const avail = remaining.get(f.foodItemId) ?? 0;
          if (avail > 5) {
            fatSource = f;
            break;
          }
        }

        if (fatSource) {
          const neededGrams = gramsForMacro(fatSource.food, "fat", remainingFat);
          const available = remaining.get(fatSource.foodItemId) ?? 0;
          const useGrams = Math.min(neededGrams, available);

          if (useGrams > 0) {
            const macros = calculateMacros(fatSource.food, useGrams);
            mealItems.push({
              foodId: fatSource.foodItemId,
              foodName: fatSource.food.name,
              grams: useGrams,
              protein: macros.protein,
              carbs: macros.carbs,
              fat: macros.fat,
            });
            mealFat += macros.fat;
            remaining.set(fatSource.foodItemId, available - useGrams);
          }
        }
      }

      meals.push({
        mealIndex: mealIdx + 1,
        items: mealItems.map((item) => ({
          foodName: item.foodName,
          grams: Math.round(item.grams),
        })),
      });
    }

    // Calculate actual totals
    const allItems: FoodWithGrams[] = [];
    for (const meal of meals) {
      for (const item of meal.items) {
        const pantryItem = pantryWithFood.find((p) => p.food.name === item.foodName);
        if (pantryItem) {
          const macros = calculateMacros(pantryItem.food, item.grams);
          allItems.push({
            foodId: pantryItem.foodItemId,
            foodName: item.foodName,
            grams: item.grams,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
          });
        }
      }
    }

    const actualTotals = calculateMealMacros(allItems);

    // Check if within tolerance
    const proteinDiff = Math.abs(actualTotals.protein - profile.proteinTargetG);
    const carbsDiff = Math.abs(actualTotals.carbs - profile.carbsTargetG);
    const fatDiff = Math.abs(actualTotals.fat - profile.fatTargetG);

    if (proteinDiff > TOLERANCE.protein) {
      warnings.push(
        `Protein is ${actualTotals.protein}g (target: ${profile.proteinTargetG}g, diff: ${proteinDiff > 0 ? "+" : ""}${actualTotals.protein - profile.proteinTargetG}g)`
      );
    }
    if (carbsDiff > TOLERANCE.carbs) {
      warnings.push(
        `Carbs are ${actualTotals.carbs}g (target: ${profile.carbsTargetG}g, diff: ${actualTotals.carbs - profile.carbsTargetG > 0 ? "+" : ""}${actualTotals.carbs - profile.carbsTargetG}g)`
      );
    }
    if (fatDiff > TOLERANCE.fat) {
      warnings.push(
        `Fat is ${actualTotals.fat}g (target: ${profile.fatTargetG}g, diff: ${actualTotals.fat - profile.fatTargetG > 0 ? "+" : ""}${actualTotals.fat - profile.fatTargetG}g)`
      );
    }

    const status = warnings.length > 0 ? "warning" : "ok";
    const today = new Date().toISOString().split("T")[0];

    // Delete existing meal plan for today
    const existingPlan = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", today))
      .first();

    if (existingPlan) {
      await ctx.db.delete(existingPlan._id);
    }

    // Save new meal plan
    const mealPlanId = await ctx.db.insert("mealPlans", {
      userId,
      date: today,
      status,
      warning: warnings.length > 0 ? warnings.join("; ") : undefined,
      kcalTarget: profile.kcalTarget,
      proteinTargetG: profile.proteinTargetG,
      carbsTargetG: profile.carbsTargetG,
      fatTargetG: profile.fatTargetG,
      kcalActual: actualTotals.kcal,
      proteinActualG: actualTotals.protein,
      carbsActualG: actualTotals.carbs,
      fatActualG: actualTotals.fat,
      meals,
    });

    return {
      mealPlanId,
      status,
      warnings: warnings.length > 0 ? warnings : undefined,
      targets: {
        kcal: profile.kcalTarget,
        protein: profile.proteinTargetG,
        carbs: profile.carbsTargetG,
        fat: profile.fatTargetG,
      },
      actual: actualTotals,
      meals,
    };
  },
});
