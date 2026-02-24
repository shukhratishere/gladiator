// Navy Method Body Fat Calculation
// Uses waist, neck, height (and hips for females) to estimate body fat percentage

export function calculateBodyFatNavy(
  sex: "male" | "female",
  waistCm: number,
  neckCm: number,
  heightCm: number,
  hipsCm?: number // Required for females
): number {
  if (sex === "male") {
    // Male formula: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
    const waistMinusNeck = waistCm - neckCm;
    if (waistMinusNeck <= 0) return 15; // Invalid measurement, return reasonable default
    
    const bf = 495 / (1.0324 - 0.19077 * Math.log10(waistMinusNeck) + 0.15456 * Math.log10(heightCm)) - 450;
    return Math.max(3, Math.min(50, Math.round(bf * 10) / 10));
  } else {
    // Female formula: 495 / (1.29579 - 0.35004 * log10(waist + hips - neck) + 0.22100 * log10(height)) - 450
    if (!hipsCm) return 25; // Default if hips not provided
    
    const waistPlusHipsMinusNeck = waistCm + hipsCm - neckCm;
    if (waistPlusHipsMinusNeck <= 0) return 25; // Invalid measurement, return reasonable default
    
    const bf = 495 / (1.29579 - 0.35004 * Math.log10(waistPlusHipsMinusNeck) + 0.22100 * Math.log10(heightCm)) - 450;
    return Math.max(8, Math.min(55, Math.round(bf * 10) / 10));
  }
}
