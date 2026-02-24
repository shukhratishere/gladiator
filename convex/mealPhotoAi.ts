"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

/**
 * Check if OpenAI API key is configured
 */
function checkOpenAIKey() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-api-key-here") {
    throw new Error("OpenAI API key not configured. Please add your API key in the Database tab → Settings → Environment Variables.");
  }
}

// Analyze a meal photo and return estimated nutrition
export const analyzeMealPhoto = action({
  args: {
    imageUrl: v.string(),
  },
  returns: v.object({
    description: v.string(),
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
    confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    tips: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const prompt = `You are an expert nutritionist and food analyst. Analyze this meal photo and provide detailed nutritional estimates.

For each food item visible in the image:
1. Identify the food item
2. Estimate the portion size in grams (be realistic based on typical serving sizes and visual cues like plate size)
3. Calculate the nutritional values based on the estimated portion

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "description": "Brief description of the meal (e.g., 'Grilled chicken breast with rice and steamed vegetables')",
  "items": [
    {
      "name": "Food item name",
      "grams": estimated_grams,
      "calories": calories_for_portion,
      "protein": protein_grams,
      "carbs": carb_grams,
      "fat": fat_grams
    }
  ],
  "totalCalories": sum_of_all_calories,
  "totalProtein": sum_of_all_protein,
  "totalCarbs": sum_of_all_carbs,
  "totalFat": sum_of_all_fat,
  "confidence": "high" | "medium" | "low",
  "tips": "Optional tip about the meal (e.g., 'This is a well-balanced meal with good protein content' or 'Consider adding more vegetables for fiber')"
}

Confidence levels:
- "high": Clear photo, easily identifiable foods, standard portions
- "medium": Some items unclear or unusual portions
- "low": Poor image quality, obscured foods, or very unusual items

Be accurate - these values will be used for diet tracking. If you can't identify something clearly, make a reasonable estimate and use "medium" or "low" confidence.

Common portion estimates:
- Chicken breast: 150-200g cooked
- Rice (cooked): 150-200g per serving
- Steak: 150-250g
- Pasta (cooked): 200-250g
- Vegetables: 100-150g per side
- Bread slice: 30-40g
- Egg: 50g each`;

    try {
      checkOpenAIKey();
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: args.imageUrl } },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.3, // Lower temperature for more consistent estimates
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      // Parse JSON response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse AI response");
      }

      const data = JSON.parse(jsonMatch[0]);

      // Validate and round values
      const items = (data.items as Array<{
        name: unknown;
        grams: unknown;
        calories: unknown;
        protein: unknown;
        carbs: unknown;
        fat: unknown;
      }>).map((item) => ({
        name: String(item.name),
        grams: Math.round(Number(item.grams) || 0),
        calories: Math.round(Number(item.calories) || 0),
        protein: Math.round((Number(item.protein) || 0) * 10) / 10,
        carbs: Math.round((Number(item.carbs) || 0) * 10) / 10,
        fat: Math.round((Number(item.fat) || 0) * 10) / 10,
      }));

      return {
        description: String(data.description || "Meal"),
        items,
        totalCalories: Math.round(Number(data.totalCalories) || 0),
        totalProtein: Math.round((Number(data.totalProtein) || 0) * 10) / 10,
        totalCarbs: Math.round((Number(data.totalCarbs) || 0) * 10) / 10,
        totalFat: Math.round((Number(data.totalFat) || 0) * 10) / 10,
        confidence: (data.confidence === "high" || data.confidence === "medium" || data.confidence === "low") 
          ? data.confidence 
          : "medium",
        tips: data.tips ? String(data.tips) : undefined,
      };
    } catch (error) {
      console.error("Meal photo analysis failed:", error);
      throw new Error("Failed to analyze meal photo. Please try again or log manually.");
    }
  },
});

// Analyze a text description of a meal (for when user describes what they ate)
export const analyzeMealDescription = action({
  args: {
    description: v.string(),
  },
  returns: v.object({
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
  }),
  handler: async (_ctx, args) => {
    const prompt = `You are an expert nutritionist. Parse this meal description and provide nutritional estimates.

Meal description: "${args.description}"

For each food item mentioned:
1. Identify the food item
2. If a portion is specified, use it. Otherwise, estimate a typical serving size.
3. Calculate nutritional values

Respond with ONLY a JSON object:
{
  "items": [
    {
      "name": "Food item",
      "grams": portion_in_grams,
      "calories": calories,
      "protein": protein_g,
      "carbs": carbs_g,
      "fat": fat_g
    }
  ],
  "totalCalories": sum,
  "totalProtein": sum,
  "totalCarbs": sum,
  "totalFat": sum
}

Be accurate with nutritional values. Use standard nutritional data.`;

    try {
      checkOpenAIKey();
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse response");
      }

      const data = JSON.parse(jsonMatch[0]);

      const items = (data.items as Array<{
        name: unknown;
        grams: unknown;
        calories: unknown;
        protein: unknown;
        carbs: unknown;
        fat: unknown;
      }>).map((item) => ({
        name: String(item.name),
        grams: Math.round(Number(item.grams) || 0),
        calories: Math.round(Number(item.calories) || 0),
        protein: Math.round((Number(item.protein) || 0) * 10) / 10,
        carbs: Math.round((Number(item.carbs) || 0) * 10) / 10,
        fat: Math.round((Number(item.fat) || 0) * 10) / 10,
      }));

      return {
        items,
        totalCalories: Math.round(Number(data.totalCalories) || 0),
        totalProtein: Math.round((Number(data.totalProtein) || 0) * 10) / 10,
        totalCarbs: Math.round((Number(data.totalCarbs) || 0) * 10) / 10,
        totalFat: Math.round((Number(data.totalFat) || 0) * 10) / 10,
      };
    } catch (error) {
      console.error("Meal description analysis failed:", error);
      throw new Error("Failed to analyze meal description");
    }
  },
});
