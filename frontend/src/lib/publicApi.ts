/**
 * Public API client for unauthenticated endpoints (landing page, etc.)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface PublicDepartment {
  id: string;
  name: string;
  code: string;
  description?: string;
  programType: 'TVET' | 'SHORT_PROGRAM';
}

export interface PublicProgram {
  id: string;
  name: string;
  code: string;
  durationYears: number;
  department: {
    id: string;
    name: string;
    code: string;
  };
}

/**
 * Fetch all active departments (optionally filtered by programType)
 */
export async function fetchPublicDepartments(
  programType?: 'TVET' | 'SHORT_PROGRAM'
): Promise<PublicDepartment[]> {
  const url = programType
    ? `${API_BASE}/api/departments?programType=${programType}`
    : `${API_BASE}/api/departments`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch departments: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch all active programs
 */
export async function fetchPublicPrograms(): Promise<PublicProgram[]> {
  const res = await fetch(`${API_BASE}/api/programs`);
  if (!res.ok) {
    throw new Error(`Failed to fetch programs: ${res.statusText}`);
  }
  return res.json();
}
