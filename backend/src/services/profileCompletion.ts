/**
 * Harmony College — Profile Completion Calculator
 * ─────────────────────────────────────────────────
 * Server-side, deterministic calculation.
 * The frontend may DISPLAY the result but never SET it.
 *
 * Required fields across 4 sections:
 *   Personal:  nationality, dob, gender, city, nationalId (16 digits)
 *   Academic:  program, programType (+ shortProgramDuration if Short Program),
 *              academicYear, semester, matricResult, ministryResult
 *   Documents: profilePictureUrl, transcriptUrl
 *   Emergency: emergencyName, emergencyPhone
 *
 * profileCompleted is only true when ALL required fields are present
 * AND the calculated percentage rounds to 100.
 */

interface ProfileLike {
  nationality?:          string | null;
  dob?:                  Date   | null;
  gender?:               string | null;
  city?:                 string | null;
  nationalId?:           string | null;
  program?:              string | null;
  programType?:          string | null;
  shortProgramDuration?: string | null;
  academicYear?:         string | null;
  semester?:             string | null;
  matricResult?:         string | null;
  ministryResult?:       string | null;
  profilePictureUrl?:    string | null;
  transcriptUrl?:        string | null;
  emergencyName?:        string | null;
  emergencyPhone?:       string | null;
}

type WeightedField = {
  field: keyof ProfileLike;
  weight: number;
};

const WEIGHTED_FIELDS: WeightedField[] = [
  // Personal (1+1+1+1+2 = 6)
  { field: 'nationality',       weight: 1 },
  { field: 'dob',               weight: 1 },
  { field: 'gender',            weight: 1 },
  { field: 'city',              weight: 1 },
  { field: 'nationalId',        weight: 2 },
  // Academic (2+1+1+1+2+2 = 9)
  { field: 'program',           weight: 2 },
  { field: 'programType',       weight: 1 },
  { field: 'academicYear',      weight: 1 },
  { field: 'semester',          weight: 1 },
  { field: 'matricResult',      weight: 2 },
  { field: 'ministryResult',    weight: 2 },
  // Documents (3+2 = 5)
  { field: 'profilePictureUrl', weight: 3 },
  { field: 'transcriptUrl',     weight: 2 },
  // Emergency contact (2+2 = 4)
  { field: 'emergencyName',     weight: 2 },
  { field: 'emergencyPhone',    weight: 2 },
];

const TOTAL_WEIGHT = WEIGHTED_FIELDS.reduce((s, f) => s + f.weight, 0); // 24

/** Returns true if the value counts as "filled". */
function isFilled(field: keyof ProfileLike, value: unknown, profile?: ProfileLike | null): boolean {
  if (value === null || value === undefined) return false;
  if (field === 'nationalId') {
    return typeof value === 'string' && /^\d{16}$/.test(value.trim());
  }
  if (field === 'programType') {
    if (value === 'TVET') return true;
    if (value === 'Short Program') {
      const dur = profile?.shortProgramDuration;
      return dur === '2 Months' || dur === '4 Months';
    }
    return false;
  }
  if (field === 'academicYear') {
    return typeof value === 'string' && value.trim().length > 0 && Boolean(profile?.program && profile.program.trim().length > 0);
  }
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
    if (isFilled(field, profile[field], profile)) earned += weight;
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
    .filter(({ field }) => !isFilled(field, profile[field], profile))
    .map(({ field }) => field as string);
}

/**
 * Returns true if all 12 required fields are filled and completion is 100%.
 */
export function isProfileComplete(profile: ProfileLike | null): boolean {
  return calculateProfileCompletion(profile) === 100;
}
