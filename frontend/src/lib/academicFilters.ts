/**
 * Academic Filter Utilities for Department Head Dashboard
 * 
 * Provides dynamic filter generation based on program type context (TVET vs Short Program).
 * TVET uses year levels (Year 1, Year 2), Short Programs use durations (2 Months, 4 Months, etc.)
 */

export type ProgramType = 'TVET' | 'SHORT_PROGRAM';

export interface AcademicFilter {
  value: string;
  label: string;
  displayLabel: string;
}

/**
 * Short Program duration options based on system configuration
 * These values must match the backend enum validation
 */
export const SHORT_PROGRAM_DURATIONS = [
  { value: '2 Months', label: '2 Months', displayLabel: '2M' },
  { value: '4 Months', label: '4 Months', displayLabel: '4M' },
  { value: '8 Months', label: '8 Months', displayLabel: '8M' },
  { value: 'Summer', label: 'Summer', displayLabel: 'Summer' },
] as const;

/**
 * TVET year level options (Year 1 and Year 2 only - no Year 3 or Year 4)
 */
export const TVET_YEAR_LEVELS = [
  { value: '1', label: 'Year 1', displayLabel: 'Year 1' },
  { value: '2', label: 'Year 2', displayLabel: 'Year 2' },
] as const;

/**
 * Get academic filters based on program type
 * 
 * @param programType - 'TVET' or 'SHORT_PROGRAM'
 * @returns Array of filter options with "All" option prepended
 */
export function getAcademicFilters(programType: ProgramType): AcademicFilter[] {
  if (programType === 'SHORT_PROGRAM') {
    return [
      { value: '', label: 'All Durations', displayLabel: 'All' },
      ...SHORT_PROGRAM_DURATIONS.map(d => ({ ...d })),
    ];
  }
  
  // TVET - Year 1 and Year 2 only
  return [
    { value: '', label: 'All Years', displayLabel: 'All Years' },
    ...TVET_YEAR_LEVELS.map(y => ({ ...y })),
  ];
}

/**
 * Get the query parameter name for filtering based on program type
 * 
 * @param programType - 'TVET' or 'SHORT_PROGRAM'
 * @returns 'yearLevel' for TVET, 'shortProgramDuration' for SHORT_PROGRAM
 */
export function getFilterParamName(programType: ProgramType): string {
  return programType === 'SHORT_PROGRAM' ? 'shortProgramDuration' : 'yearLevel';
}

/**
 * Transform filter value for API request based on program type
 * 
 * @param programType - 'TVET' or 'SHORT_PROGRAM'
 * @param filterValue - The selected filter value
 * @returns Transformed value for API (number for TVET yearLevel, string for duration)
 */
export function transformFilterValue(
  programType: ProgramType,
  filterValue: string
): number | string | undefined {
  if (!filterValue) return undefined;
  
  if (programType === 'SHORT_PROGRAM') {
    // Short Program: pass duration string as-is
    return filterValue;
  }
  
  // TVET: convert year string to number
  return parseInt(filterValue, 10);
}

/**
 * Check if a filter value is valid for the given program type
 * 
 * @param programType - 'TVET' or 'SHORT_PROGRAM'
 * @param filterValue - The filter value to validate
 * @returns true if valid, false otherwise
 */
export function isValidFilterValue(
  programType: ProgramType,
  filterValue: string
): boolean {
  if (!filterValue) return true; // Empty = "All" is always valid
  
  if (programType === 'SHORT_PROGRAM') {
    return SHORT_PROGRAM_DURATIONS.some(d => d.value === filterValue);
  }
  
  // TVET: only '1' and '2' are valid
  return filterValue === '1' || filterValue === '2';
}

/**
 * Get display label for a filter value
 * 
 * @param programType - 'TVET' or 'SHORT_PROGRAM'
 * @param filterValue - The filter value
 * @returns Display label for the value
 */
export function getFilterDisplayLabel(
  programType: ProgramType,
  filterValue: string
): string {
  if (!filterValue) {
    return programType === 'SHORT_PROGRAM' ? 'All Durations' : 'All Years';
  }
  
  const filters = getAcademicFilters(programType);
  const filter = filters.find(f => f.value === filterValue);
  return filter?.displayLabel ?? filterValue;
}
