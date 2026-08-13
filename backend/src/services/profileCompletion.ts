/**
 * Harmony College — Profile Completion Calculator
 * ─────────────────────────────────────────────────
 * Server-side, deterministic calculation.
 * The frontend may DISPLAY the result but never SET it.
 *
 * 12 required fields across 4 sections.
 * Each field carries a weight so the total always sums to 100.
 *
 * Section weights:
 *   Personal  (5 fields × 1pt each) =  5 pts
 *   Academic  (program×2 + year×1 + semester×1) = 4 pts
 *   Documents (profilePic×3 + faydaId×3)         = 6 pts
 *   Emergency (name×3 + phone×3)                  = 6 pts
 *   Total = 21 pts → scaled to 100%
 *
 * profileCompleted is only true when ALL 12 required fields are present
 * AND the calculated percentage rounds to 100.
 */

import type { StudentProfile } from '@prisma/client';

interface ProfileLike {
  nationality?:      string | null;
  dob?:              Date   | null;
  gender?:           string | null;
  city?:             string | null;
  address?:          string | null;
  program?:          string | null;
  academicYear?:     string | null;
  semester?:         string | null;
  profilePictureUrl?:string | null;
  faydaIdUrl?:       string | null;
  emergencyName?:    string | null;
  emergencyPhone?:   string | null;
}

type WeightedField = {
  field: keyof ProfileLike;
  weight: number;
};

const WEIGHTED_FIELDS: WeightedField[] = [
  // Personal (5 × 1 = 5)
  { field: 'nationality', weight: 1 },
  { field: 'dob',         weight: 1 },
  { field: 'gender',      weight: 1 },
  { field: 'city',        weight: 1 },
  { field: 'address',     weight: 1 },
  // Academic (2+1+1 = 4)
  { field: 'program',      weight: 2 },
  { field: 'academicYear', weight: 1 },
  { field: 'semester',     weight: 1 },
  // Documents (3+3 = 6)
  { field: 'profilePictureUrl', weight: 3 },
  { field: 'faydaIdUrl',        weight: 3 },
  // Emergency contact (3+3 = 6)
  { field: 'emergencyName',  weight: 3 },
  { field: 'emergencyPhone', weight: 3 },
];

const TOTAL_WEIGHT = WEIGHTED_FIELDS.reduce((s, f) => s + f.weight, 0); // 21

/** Returns true if the value counts as "filled". */
function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (value instanceof Date) return !isNaN(value.getTime());
  return true;
}

/**
 * Calculates profile completion percentage (0–100) from a StudentProfile row
 * or any object that implements the same required fields.
 */
export function calculateProfileCompletion(profile: ProfileLike | null): number {
  if (!profile) return 0;
  let earned = 0;
  for (const { field, weight } of WEIGHTED_FIELDS) {
    if (isFilled(profile[field])) earned += weight;
  }
  return Math.round((earned / TOTAL_WEIGHT) * 100);
}

/**
 * Returns the list of required field names that are not yet filled.
 * Used by the submit endpoint to return actionable feedback.
 */
export function getMissingFields(profile: ProfileLike | null): string[] {
  if (!profile) return WEIGHTED_FIELDS.map((f) => f.field as string);
  return WEIGHTED_FIELDS
    .filter(({ field }) => !isFilled(profile[field]))
    .map(({ field }) => field as string);
}

/**
 * Returns true only when every required field is filled and completion === 100.
 */
export function isProfileComplete(profile: ProfileLike | null): boolean {
  return calculateProfileCompletion(profile) === 100;
}
