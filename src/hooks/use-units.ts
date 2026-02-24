import { useQuery } from "convex/react";
import { api } from "@convex/api";

export function useUnits() {
  const profile = useQuery(api.profiles.getProfile);
  const isImperial = profile?.unitSystem === "imperial";

  const formatWeight = (kg: number) => {
    if (isImperial) {
      return `${Math.round(kg * 2.205)} lbs`;
    }
    return `${kg} kg`;
  };

  const formatHeight = (cm: number) => {
    if (isImperial) {
      const totalInches = cm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}"`;
    }
    return `${cm} cm`;
  };

  const formatMeasurement = (cm: number) => {
    if (isImperial) {
      return `${Math.round(cm / 2.54 * 10) / 10}"`;
    }
    return `${cm} cm`;
  };

  const toKg = (value: number) => isImperial ? value * 0.453592 : value;
  const toCm = (value: number) => isImperial ? value * 2.54 : value;
  const fromKg = (kg: number) => isImperial ? kg / 0.453592 : kg;
  const fromCm = (cm: number) => isImperial ? cm / 2.54 : cm;

  return {
    isImperial,
    isMetric: !isImperial,
    formatWeight,
    formatHeight,
    formatMeasurement,
    toKg,
    toCm,
    fromKg,
    fromCm,
    weightUnit: isImperial ? "lbs" : "kg",
    heightUnit: isImperial ? "ft/in" : "cm",
    measurementUnit: isImperial ? "in" : "cm",
  };
}
