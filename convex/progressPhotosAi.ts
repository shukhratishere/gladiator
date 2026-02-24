"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

/**
 * Check if OpenAI API key is configured
 */
function checkOpenAIKey() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-api-key-here") {
    throw new Error("OpenAI API key not configured. Please add your API key in the Database tab → Settings → Environment Variables.");
  }
}

// Internal action to analyze photo with AI
export const analyzePhotoInternal = internalAction({
  args: {
    photoId: v.id("progressPhotos"),
  },
  handler: async (ctx, args) => {
    // Get photo data
    const photo = await ctx.runQuery(internal.progressPhotos.getPhotoById, {
      photoId: args.photoId,
    });

    if (!photo) {
      throw new Error("Photo not found");
    }

    // Get image URL
    const imageUrl = await ctx.runQuery(internal.progressPhotos.getStorageUrl, {
      storageId: photo.storageId,
    });

    if (!imageUrl) {
      throw new Error("Could not get image URL");
    }

    // Analyze with GPT-4 Vision
    const prompt = `You are an expert bodybuilding coach and physique analyst. Analyze this progress photo and provide feedback on muscle development.

Evaluate the following muscle groups if visible:
- Chest (upper, middle, lower)
- Shoulders (front delts, side delts, rear delts)
- Back (lats, traps, rhomboids, lower back)
- Arms (biceps, triceps, forearms)
- Core (abs, obliques)
- Legs (quads, hamstrings, calves, glutes)

Respond with ONLY a JSON object in this exact format:
{
  "overallScore": <number 1-10>,
  "laggingMuscles": ["muscle1", "muscle2"],
  "strongMuscles": ["muscle1", "muscle2"],
  "recommendations": ["specific recommendation 1", "specific recommendation 2", "specific recommendation 3"]
}

For laggingMuscles and strongMuscles, use these exact muscle names:
- chest, upper_chest, shoulders, front_delts, side_delts, rear_delts
- lats, upper_back, traps, lower_back
- biceps, triceps, forearms
- abs, obliques
- quads, hamstrings, calves, glutes

Be specific and actionable in recommendations. Focus on what exercises or techniques would help bring up lagging areas.`;

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
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse AI response");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Save analysis to database
      await ctx.runMutation(internal.progressPhotos.saveAnalysis, {
        photoId: args.photoId,
        analysis: {
          overallScore: analysis.overallScore,
          laggingMuscles: analysis.laggingMuscles,
          strongMuscles: analysis.strongMuscles,
          recommendations: analysis.recommendations,
        },
      });

      // Adjust workout priorities based on lagging muscles
      await ctx.runMutation(internal.workoutAi.adjustWorkoutPriorities, {
        userId: photo.userId,
        laggingMuscles: analysis.laggingMuscles,
      });
    } catch (error) {
      console.error("Photo analysis failed:", error);
      // Mark as complete but with no analysis
      await ctx.runMutation(internal.progressPhotos.markAnalysisFailed, {
        photoId: args.photoId,
      });
    }

    return null;
  },
});

// Public action to manually trigger analysis for a photo (if it failed or needs re-analysis)
export const retryAnalysis = action({
  args: { photoId: v.id("progressPhotos") },
  handler: async (ctx, args) => {
    // Verify photo exists
    const photo = await ctx.runQuery(internal.progressPhotos.getPhotoById, {
      photoId: args.photoId,
    });

    if (!photo) {
      throw new Error("Photo not found");
    }

    // Reset analysis status
    await ctx.runMutation(internal.progressPhotos.resetAnalysisStatus, {
      photoId: args.photoId,
    });

    // Run analysis via internal action
    await ctx.runAction(internal.progressPhotosAi.analyzePhotoInternal, {
      photoId: args.photoId,
    });

    return { success: true };
  },
});
