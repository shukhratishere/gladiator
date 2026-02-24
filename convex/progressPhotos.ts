import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Generate upload URL for photo
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to upload photos");
    return await ctx.storage.generateUploadUrl();
  },
});

// Save photo after upload
export const savePhoto = mutation({
  args: {
    storageId: v.id("_storage"),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to save photos");

    const date = args.date || new Date().toISOString().split("T")[0];

    const photoId = await ctx.db.insert("progressPhotos", {
      userId,
      date,
      storageId: args.storageId,
      analysisComplete: false,
    });

    // Schedule AI analysis
    await ctx.scheduler.runAfter(
      0,
      internal.progressPhotosAi.analyzePhotoInternal,
      {
        photoId,
      }
    );

    return photoId;
  },
});

// Get user's progress photos
export const getPhotos = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const photos = await ctx.db
      .query("progressPhotos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 20);

    return Promise.all(
      photos.map(async (photo) => ({
        _id: photo._id,
        date: photo.date,
        imageUrl: await ctx.storage.getUrl(photo.storageId),
        analysisComplete: photo.analysisComplete,
        muscleAnalysis: photo.muscleAnalysis,
      }))
    );
  },
});

// Get latest analysis
export const getLatestAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const latestPhoto = await ctx.db
      .query("progressPhotos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("analysisComplete"), true))
      .order("desc")
      .first();

    if (!latestPhoto || !latestPhoto.muscleAnalysis) return null;

    return {
      date: latestPhoto.date,
      ...latestPhoto.muscleAnalysis,
    };
  },
});

// Internal query to get photo by ID
export const getPhotoById = internalQuery({
  args: { photoId: v.id("progressPhotos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) return null;
    return {
      _id: photo._id,
      userId: photo.userId,
      storageId: photo.storageId,
      date: photo.date,
    };
  },
});

// Internal query to get storage URL
export const getStorageUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Internal mutation to save analysis
export const saveAnalysis = internalMutation({
  args: {
    photoId: v.id("progressPhotos"),
    analysis: v.object({
      overallScore: v.number(),
      laggingMuscles: v.array(v.string()),
      strongMuscles: v.array(v.string()),
      recommendations: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, {
      analysisComplete: true,
      muscleAnalysis: args.analysis,
    });
    return null;
  },
});

// Internal mutation to mark analysis as failed
export const markAnalysisFailed = internalMutation({
  args: { photoId: v.id("progressPhotos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, {
      analysisComplete: true,
    });
    return null;
  },
});

// Internal mutation to reset analysis status
export const resetAnalysisStatus = internalMutation({
  args: { photoId: v.id("progressPhotos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.photoId, {
      analysisComplete: false,
      muscleAnalysis: undefined,
    });
    return null;
  },
});

// Delete a photo
export const deletePhoto = mutation({
  args: { photoId: v.id("progressPhotos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to delete photos");

    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== userId) {
      throw new Error("Photo not found");
    }

    // Delete from storage
    await ctx.storage.delete(photo.storageId);
    // Delete record
    await ctx.db.delete(args.photoId);

    return null;
  },
});

// Get a single photo with analysis details
export const getPhoto = query({
  args: { photoId: v.id("progressPhotos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== userId) return null;

    return {
      _id: photo._id,
      date: photo.date,
      imageUrl: await ctx.storage.getUrl(photo.storageId),
      analysisComplete: photo.analysisComplete,
      muscleAnalysis: photo.muscleAnalysis,
    };
  },
});
