import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get all pantry items with food details (both standard and custom foods)
 */
export const getPantry = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { standard: [], custom: [] };

    // Get standard pantry items
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const standardItems = await Promise.all(
      pantryItems.map(async (item) => {
        const food = await ctx.db.get(item.foodItemId);
        return {
          ...item,
          food,
          type: "standard" as const,
        };
      })
    );

    // Get custom pantry items
    const customPantryItems = await ctx.db
      .query("customPantryItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const customItems = await Promise.all(
      customPantryItems.map(async (item) => {
        const food = await ctx.db.get(item.customFoodId);
        return {
          ...item,
          food,
          type: "custom" as const,
        };
      })
    );

    return {
      standard: standardItems.filter((item) => item.food !== null),
      custom: customItems.filter((item) => item.food !== null),
    };
  },
});

/**
 * Get all available food items (for adding to pantry)
 */
export const getFoodItems = query({
  args: {},
  handler: async (ctx) => {
    const foodItems = await ctx.db.query("foodItems").collect();

    // Group by category for easier display
    const grouped = {
      lean_protein: foodItems.filter((f) => f.group === "lean_protein"),
      fattier_protein: foodItems.filter((f) => f.group === "fattier_protein"),
      starchy_carb: foodItems.filter((f) => f.group === "starchy_carb"),
      fat_source: foodItems.filter((f) => f.group === "fat_source"),
    };

    return {
      all: foodItems,
      grouped,
    };
  },
});

/**
 * Add food item to pantry (or update if exists)
 */
export const addToPantry = mutation({
  args: {
    foodItemId: v.id("foodItems"),
    gramsAvailable: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to manage your pantry");
    }

    if (args.gramsAvailable < 0) {
      throw new Error("Grams available cannot be negative");
    }

    // Verify food item exists
    const foodItem = await ctx.db.get(args.foodItemId);
    if (!foodItem) {
      throw new Error("Food item not found");
    }

    // Check if already in pantry
    const existing = await ctx.db
      .query("pantryItems")
      .withIndex("by_user_and_food", (q) =>
        q.eq("userId", userId).eq("foodItemId", args.foodItemId)
      )
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        gramsAvailable: args.gramsAvailable,
      });
      return existing._id;
    }

    // Create new entry
    const pantryId = await ctx.db.insert("pantryItems", {
      userId,
      foodItemId: args.foodItemId,
      gramsAvailable: args.gramsAvailable,
    });

    return pantryId;
  },
});

/**
 * Update grams available for a pantry item
 */
export const updatePantryItem = mutation({
  args: {
    pantryItemId: v.id("pantryItems"),
    gramsAvailable: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to manage your pantry");
    }

    if (args.gramsAvailable < 0) {
      throw new Error("Grams available cannot be negative");
    }

    const pantryItem = await ctx.db.get(args.pantryItemId);
    if (!pantryItem) {
      throw new Error("Pantry item not found");
    }

    if (pantryItem.userId !== userId) {
      throw new Error("You don't have permission to update this item");
    }

    await ctx.db.patch(args.pantryItemId, {
      gramsAvailable: args.gramsAvailable,
    });

    return args.pantryItemId;
  },
});

/**
 * Remove item from pantry
 */
export const removePantryItem = mutation({
  args: {
    pantryItemId: v.id("pantryItems"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to manage your pantry");
    }

    const pantryItem = await ctx.db.get(args.pantryItemId);
    if (!pantryItem) {
      throw new Error("Pantry item not found");
    }

    if (pantryItem.userId !== userId) {
      throw new Error("You don't have permission to remove this item");
    }

    await ctx.db.delete(args.pantryItemId);

    return args.pantryItemId;
  },
});

/**
 * Add custom food to pantry (or update if exists)
 */
export const addCustomFoodToPantry = mutation({
  args: {
    customFoodId: v.id("customFoods"),
    gramsAvailable: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to manage your pantry");
    }

    if (args.gramsAvailable < 0) {
      throw new Error("Grams available cannot be negative");
    }

    // Verify custom food exists and belongs to user
    const customFood = await ctx.db.get(args.customFoodId);
    if (!customFood) {
      throw new Error("Custom food not found");
    }

    if (customFood.userId !== userId) {
      throw new Error("You don't have permission to add this food");
    }

    // Check if already in pantry
    const existing = await ctx.db
      .query("customPantryItems")
      .withIndex("by_user_and_food", (q) =>
        q.eq("userId", userId).eq("customFoodId", args.customFoodId)
      )
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        gramsAvailable: args.gramsAvailable,
      });
      return existing._id;
    }

    // Create new entry
    return await ctx.db.insert("customPantryItems", {
      userId,
      customFoodId: args.customFoodId,
      gramsAvailable: args.gramsAvailable,
    });
  },
});

/**
 * Update grams available for a custom pantry item
 */
export const updateCustomPantryItem = mutation({
  args: {
    customPantryItemId: v.id("customPantryItems"),
    gramsAvailable: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to manage your pantry");
    }

    if (args.gramsAvailable < 0) {
      throw new Error("Grams available cannot be negative");
    }

    const pantryItem = await ctx.db.get(args.customPantryItemId);
    if (!pantryItem) {
      throw new Error("Pantry item not found");
    }

    if (pantryItem.userId !== userId) {
      throw new Error("You don't have permission to update this item");
    }

    await ctx.db.patch(args.customPantryItemId, {
      gramsAvailable: args.gramsAvailable,
    });

    return args.customPantryItemId;
  },
});

/**
 * Remove custom food item from pantry
 */
export const removeCustomPantryItem = mutation({
  args: {
    customPantryItemId: v.id("customPantryItems"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to manage your pantry");
    }

    const pantryItem = await ctx.db.get(args.customPantryItemId);
    if (!pantryItem) {
      throw new Error("Pantry item not found");
    }

    if (pantryItem.userId !== userId) {
      throw new Error("You don't have permission to remove this item");
    }

    await ctx.db.delete(args.customPantryItemId);

    return args.customPantryItemId;
  },
});
