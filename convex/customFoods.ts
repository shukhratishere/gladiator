import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Save a custom food to user's library
 */
export const saveCustomFood = mutation({
  args: {
    name: v.string(),
    proteinPer100g: v.number(),
    carbsPer100g: v.number(),
    fatPer100g: v.number(),
    caloriesPer100g: v.number(),
    source: v.union(v.literal("ai_lookup"), v.literal("manual")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to save custom foods");
    }

    // Check if food already exists for user (case-insensitive)
    const existingFoods = await ctx.db
      .query("customFoods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const existing = existingFoods.find(
      (f) => f.name.toLowerCase() === args.name.toLowerCase()
    );

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        proteinPer100g: args.proteinPer100g,
        carbsPer100g: args.carbsPer100g,
        fatPer100g: args.fatPer100g,
        caloriesPer100g: args.caloriesPer100g,
        source: args.source,
      });
      return existing._id;
    }

    // Create new
    return await ctx.db.insert("customFoods", {
      userId,
      name: args.name,
      proteinPer100g: args.proteinPer100g,
      carbsPer100g: args.carbsPer100g,
      fatPer100g: args.fatPer100g,
      caloriesPer100g: args.caloriesPer100g,
      source: args.source,
    });
  },
});

/**
 * Get user's saved custom foods
 */
export const getCustomFoods = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("customFoods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Delete a custom food from user's library
 */
export const deleteCustomFood = mutation({
  args: {
    customFoodId: v.id("customFoods"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to manage custom foods");
    }

    const customFood = await ctx.db.get(args.customFoodId);
    if (!customFood) {
      throw new Error("Custom food not found");
    }

    if (customFood.userId !== userId) {
      throw new Error("You don't have permission to delete this food");
    }

    // Also delete any pantry items using this custom food
    const pantryItems = await ctx.db
      .query("customPantryItems")
      .withIndex("by_user_and_food", (q) =>
        q.eq("userId", userId).eq("customFoodId", args.customFoodId)
      )
      .collect();

    for (const item of pantryItems) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.customFoodId);
    return args.customFoodId;
  },
});

/**
 * Update a custom food's nutrition info
 */
export const updateCustomFood = mutation({
  args: {
    customFoodId: v.id("customFoods"),
    name: v.optional(v.string()),
    proteinPer100g: v.optional(v.number()),
    carbsPer100g: v.optional(v.number()),
    fatPer100g: v.optional(v.number()),
    caloriesPer100g: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to manage custom foods");
    }

    const customFood = await ctx.db.get(args.customFoodId);
    if (!customFood) {
      throw new Error("Custom food not found");
    }

    if (customFood.userId !== userId) {
      throw new Error("You don't have permission to update this food");
    }

    const updates: Partial<{
      name: string;
      proteinPer100g: number;
      carbsPer100g: number;
      fatPer100g: number;
      caloriesPer100g: number;
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.proteinPer100g !== undefined) updates.proteinPer100g = args.proteinPer100g;
    if (args.carbsPer100g !== undefined) updates.carbsPer100g = args.carbsPer100g;
    if (args.fatPer100g !== undefined) updates.fatPer100g = args.fatPer100g;
    if (args.caloriesPer100g !== undefined) updates.caloriesPer100g = args.caloriesPer100g;

    await ctx.db.patch(args.customFoodId, updates);
    return args.customFoodId;
  },
});
