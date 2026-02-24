"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

/**
 * AI-powered food nutrition lookup
 * Takes any food name and returns estimated macros per 100g
 */
export const lookupFood = action({
  args: {
    foodName: v.string(),
  },
  handler: async (_ctx, args) => {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-api-key-here") {
      throw new Error("OpenAI API key not configured. Please add your API key in the Database tab → Settings → Environment Variables.");
    }

    const openai = new OpenAI();
    
    const prompt = `You are a nutrition database. Given a food item, provide accurate nutritional information per 100 grams.

Food: "${args.foodName}"

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "name": "standardized food name",
  "proteinPer100g": number,
  "carbsPer100g": number,
  "fatPer100g": number,
  "caloriesPer100g": number,
  "confidence": "high" | "medium" | "low"
}

Use "high" confidence for common foods with well-known nutrition (chicken breast, rice, eggs).
Use "medium" for prepared foods or regional dishes.
Use "low" for vague descriptions or unusual items.

Be accurate - these values will be used for diet tracking.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Could not get nutrition data. Please try again.");
    }

    try {
      const data = JSON.parse(content.trim());
      return {
        name: String(data.name || args.foodName),
        proteinPer100g: Math.round(Number(data.proteinPer100g) * 10) / 10,
        carbsPer100g: Math.round(Number(data.carbsPer100g) * 10) / 10,
        fatPer100g: Math.round(Number(data.fatPer100g) * 10) / 10,
        caloriesPer100g: Math.round(Number(data.caloriesPer100g)),
        confidence: (data.confidence === "high" || data.confidence === "medium" || data.confidence === "low")
          ? data.confidence as "high" | "medium" | "low"
          : "medium" as const,
      };
    } catch {
      throw new Error("Could not parse nutrition data. Please try a different food name.");
    }
  },
});
