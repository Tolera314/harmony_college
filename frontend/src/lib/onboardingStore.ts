/**
 * Harmony College — Onboarding State Store
 * ─────────────────────────────────────────
 * Frontend-only session state for the multi-stage onboarding flow.
 * Persists to sessionStorage so state survives page navigation.
 * Replace with a proper backend integration (JWT + DB) for production.
 */

export type OnboardingStage =
  | 'create-account'
  | 'verify-contact'
  | 'complete-profile'
  | 'success';

export interface AccountData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  /** Populated after successful POST /api/auth/register. Used by Phase 3 OTP verification. */
  userId: string;
}

export interface ProfileData {
  // Step 1 — Personal
  nationality: string;
  dob: string;
  gender: string;
  region: string;
  city: string;
  nationalId: string;
  // Step 2 — Academic
  program: string;
  programType: string;
  shortProgramDuration: string;
  academicYear: string;
  semester: string;
  matricResult: string;
  ministryResult: string;
  // Step 3 — Uploads (file names for mock)
  profilePictureName: string;
  profilePicturePreview: string;
  faydaIdName: string;
  transcriptName: string;
  // Step 4 — Emergency contact
  emergencyName: string;
  emergencyPhone: string;
  emergencyNotes: string;
}

export interface OnboardingState {
  stage: OnboardingStage;
  account: AccountData;
  contactVerified: boolean;
  profile: ProfileData;
  applicationNumber: string;
  profileCompletionPct: number; // 0–100
}

const STORAGE_KEY = 'hc-onboarding';

const DEFAULT_ACCOUNT: AccountData = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  userId: '',
};

const DEFAULT_PROFILE: ProfileData = {
  nationality: '',
  dob: '',
  gender: '',
  region: '',
  city: '',
  nationalId: '',
  program: '',
  programType: '',
  shortProgramDuration: '',
  academicYear: '2026/2027',
  semester: 'Semester I',
  matricResult: '',
  ministryResult: '',
  profilePictureName: '',
  profilePicturePreview: '',
  faydaIdName: '',
  transcriptName: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyNotes: '',
};

export const DEFAULT_STATE: OnboardingState = {
  stage: 'create-account',
  account: DEFAULT_ACCOUNT,
  contactVerified: false,
  profile: DEFAULT_PROFILE,
  applicationNumber: '',
  profileCompletionPct: 0,
};

function generateAppNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `HC-${year}-${random}`;
}

export function computeCompletion(profile: ProfileData): number {
  const fields: (keyof ProfileData)[] = [
    'nationality', 'dob', 'gender', 'city', 'nationalId',
    'program', 'programType',
    'matricResult', 'ministryResult',
    'profilePictureName', 'transcriptName',
    'emergencyName', 'emergencyPhone',
  ];
  let filled = 0;
  for (const f of fields) {
    if (f === 'nationalId') {
      if (profile.nationalId && /^\d{16}$/.test(profile.nationalId.trim())) filled++;
    } else if (f === 'programType') {
      if (profile.programType === 'TVET') {
        filled++;
      } else if (profile.programType === 'Short Program') {
        if (profile.shortProgramDuration === '2 Months' || profile.shortProgramDuration === '4 Months') filled++;
      }
    } else if (profile[f]) {
      filled++;
    }
  }
  return Math.round((filled / fields.length) * 100);
}

export function loadOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function clearOnboardingState(): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function advanceToVerify(account: AccountData): OnboardingState {
  const state: OnboardingState = {
    ...DEFAULT_STATE,
    stage: 'verify-contact',
    account,
    applicationNumber: generateAppNumber(),
  };
  saveOnboardingState(state);
  return state;
}

export function advanceToProfile(prev: OnboardingState): OnboardingState {
  const state: OnboardingState = {
    ...prev,
    stage: 'complete-profile',
    contactVerified: true,
  };
  saveOnboardingState(state);
  return state;
}

export function updateProfile(prev: OnboardingState, profile: Partial<ProfileData>): OnboardingState {
  const merged = { ...prev.profile, ...profile };
  const state: OnboardingState = {
    ...prev,
    profile: merged,
    profileCompletionPct: computeCompletion(merged),
  };
  saveOnboardingState(state);
  return state;
}

export function completeOnboarding(prev: OnboardingState): OnboardingState {
  const state: OnboardingState = {
    ...prev,
    stage: 'success',
    profileCompletionPct: 100,
  };
  saveOnboardingState(state);
  return state;
}
