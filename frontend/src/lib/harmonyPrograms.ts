/**
 * Official Harmony College Programs
 * 
 * DEPRECATED: Static constants below are kept for backward compatibility only.
 * NEW CODE SHOULD USE: fetchPublicDepartments() from lib/publicApi.ts
 * 
 * Database is the single source of truth. Registrar-created departments
 * appear automatically via API without code changes.
 */

import { fetchPublicDepartments, type PublicDepartment } from './publicApi';

// ── DEPRECATED CONSTANTS (use fetchPublicDepartments instead) ─────────────────

export const HARMONY_PROGRAMS = [
  'Photography & Videography',
  'Theatrical Art & Filmmaking',
  'Music Instruments & Vocal',
  'Cubase Music Production',
  'Graphic Design',
  'Digital Marketing',
  'Journalism',
  'Information Technology (IT)',
  'Languages',
  'Pharmacy',
] as const;

export type HarmonyProgram = typeof HARMONY_PROGRAMS[number];

/** @deprecated Use fetchPublicDepartments() instead */
export const HARMONY_DEPARTMENTS = [
  { name: 'Photography & Visual Media',    code: 'PHOTO',  programs: ['Photography & Videography'] },
  { name: 'Theatrical Art & Filmmaking',   code: 'FILM',   programs: ['Theatrical Art & Filmmaking'] },
  { name: 'Music & Performing Arts',       code: 'MUSIC',  programs: ['Music Instruments & Vocal', 'Cubase Music Production'] },
  { name: 'Design & Marketing',            code: 'DESIGN', programs: ['Graphic Design', 'Digital Marketing'] },
  { name: 'Media & Communication',         code: 'MEDIA',  programs: ['Journalism', 'Languages'] },
  { name: 'Information Technology',        code: 'IT',     programs: ['Information Technology (IT)'] },
  { name: 'Pharmacy & Health Sciences',    code: 'PHARM',  programs: ['Pharmacy'] },
] as const;

// ── DYNAMIC API HELPERS ───────────────────────────────────────────────────────

/**
 * Fetch all active departments from database (optionally filtered by programType)
 * This is the recommended way to get departments dynamically.
 */
export async function getDepartments(
  programType?: 'TVET' | 'SHORT_PROGRAM'
): Promise<PublicDepartment[]> {
  return fetchPublicDepartments(programType);
}

/**
 * Get departments as select options for dropdowns
 */
export async function getDepartmentOptions(programType?: 'TVET' | 'SHORT_PROGRAM') {
  const depts = await getDepartments(programType);
  return depts.map(d => ({ value: d.id, label: d.name, code: d.code }));
}
