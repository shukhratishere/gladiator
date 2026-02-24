/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as customFoods from "../customFoods.js";
import type * as foodAi from "../foodAi.js";
import type * as foodLogs from "../foodLogs.js";
import type * as http from "../http.js";
import type * as lib_bodyFat from "../lib/bodyFat.js";
import type * as lib_units from "../lib/units.js";
import type * as mealPhotoAi from "../mealPhotoAi.js";
import type * as mealPlan from "../mealPlan.js";
import type * as nutrition from "../nutrition.js";
import type * as pantry from "../pantry.js";
import type * as profiles from "../profiles.js";
import type * as progressPhotos from "../progressPhotos.js";
import type * as progressPhotosAi from "../progressPhotosAi.js";
import type * as progression from "../progression.js";
import type * as seed from "../seed.js";
import type * as workoutAi from "../workoutAi.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  customFoods: typeof customFoods;
  foodAi: typeof foodAi;
  foodLogs: typeof foodLogs;
  http: typeof http;
  "lib/bodyFat": typeof lib_bodyFat;
  "lib/units": typeof lib_units;
  mealPhotoAi: typeof mealPhotoAi;
  mealPlan: typeof mealPlan;
  nutrition: typeof nutrition;
  pantry: typeof pantry;
  profiles: typeof profiles;
  progressPhotos: typeof progressPhotos;
  progressPhotosAi: typeof progressPhotosAi;
  progression: typeof progression;
  seed: typeof seed;
  workoutAi: typeof workoutAi;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
