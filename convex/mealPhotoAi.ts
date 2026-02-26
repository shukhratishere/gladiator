import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getGeminiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured in Convex env vars.");
  return key;
}

function toNum(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItems(items: any[]) {
  return (items ?? []).map((i) => ({
    name: String(i?.name ?? "Unknown"),
    grams: toNum(i?.grams, 0),
    calories: toNum(i?.calories, 0),
    protein: toNum(i?.protein, 0),
    carbs: toNum(i?.carbs, 0),
    fat: toNum(i?.fat, 0),
  }));
}

function extractJson(text: string) {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("Model did not return JSON.");
  return JSON.parse(text.slice(a, b + 1));
}

export const analyzeMealPhoto = action({
  args: { imageUrl: v.string() },
  handler: async (_ctx, args) => {
    try {
      const genAI = new GoogleGenerativeAI(getGeminiKey());
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const res = await fetch(args.imageUrl);
      if (!res.ok) throw new Error(`Could not fetch image: ${res.status}`);

      const contentType = res.headers.get("content-type") || "image/jpeg";
      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString("base64");

      const prompt = `
Return ONLY valid JSON with this exact shape:
{
  "description": string,
  "confidence": "low" | "medium" | "high",
  "items": [
    {"name": string, "grams": number, "calories": number, "protein": number, "carbs": number, "fat": number}
  ]
}

Rules:
- Be realistic and conservative.
- Use edible portion grams.
- If unsure, lower confidence.
`;

      const out = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: contentType, data: base64 } },
      ]);

      const text = out.response.text();
      const parsed = extractJson(text);

      return {
        description: String(parsed.description ?? "Meal"),
        confidence:
          parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
            ? parsed.confidence
            : "medium",
        items: normalizeItems(parsed.items),
      };
    } catch (e) {
      console.error("Meal photo analysis failed:", e);
      if (e instanceof Error) throw new Error(e.message);
      throw new Error(String(e));
    }
  },
});

export const analyzeMealDescription = action({
  args: { description: v.string() },
  handler: async (_ctx, args) => {
    try {
      const genAI = new GoogleGenerativeAI(getGeminiKey());
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
User description: ${args.description}

Return ONLY valid JSON with this exact shape:
{
  "description": string,
  "confidence": "low" | "medium" | "high",
  "items": [
    {"name": string, "grams": number, "calories": number, "protein": number, "carbs": number, "fat": number}
  ]
}

Rules:
- Realistic nutrition values.
- If vague, infer portions and lower confidence.
`;

      const out = await model.generateContent(prompt);
      const text = out.response.text();
      const parsed = extractJson(text);
      const items = normalizeItems(parsed.items);

      return {
        description: String(parsed.description ?? "Meal"),
        confidence:
          parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
            ? parsed.confidence
            : "medium",
        items,
        totalCalories: items.reduce((s, i) => s + i.calories, 0),
        totalProtein: items.reduce((s, i) => s + i.protein, 0),
        totalCarbs: items.reduce((s, i) => s + i.carbs, 0),
        totalFat: items.reduce((s, i) => s + i.fat, 0),
      };
    } catch (e) {
      console.error("Meal description analysis failed:", e);
      if (e instanceof Error) throw new Error(e.message);
      throw new Error(String(e));
    }
  },
});