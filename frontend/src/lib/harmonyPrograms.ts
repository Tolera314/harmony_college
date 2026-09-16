/**
 * Official Harmony College Programs — single source of truth for frontend.
 * Use this everywhere programs, departments, or study areas are listed.
 * DO NOT add or remove programs without updating all consuming files.
 */

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

/** Departments — each maps to one or more programs above */
export const HARMONY_DEPARTMENTS = [
  { name: 'Photography & Visual Media',    code: 'PHOTO',  programs: ['Photography & Videography'] },
  { name: 'Theatrical Art & Filmmaking',   code: 'FILM',   programs: ['Theatrical Art & Filmmaking'] },
  { name: 'Music & Performing Arts',       code: 'MUSIC',  programs: ['Music Instruments & Vocal', 'Cubase Music Production'] },
  { name: 'Design & Marketing',            code: 'DESIGN', programs: ['Graphic Design', 'Digital Marketing'] },
  { name: 'Media & Communication',         code: 'MEDIA',  programs: ['Journalism', 'Languages'] },
  { name: 'Information Technology',        code: 'IT',     programs: ['Information Technology (IT)'] },
  { name: 'Pharmacy & Health Sciences',    code: 'PHARM',  programs: ['Pharmacy'] },
] as const;
