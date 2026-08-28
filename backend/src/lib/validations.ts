import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

// Ethiopian phone: 09XX... / 07XX... / +251...
const ethioPhoneRegex = /^(?:\+251|0)[79]\d{8}$/;

export const normalizePhone = (phone: string): string => {
  if (phone.startsWith('0')) {
    return '+251' + phone.slice(1);
  }
  return phone;
};

/** Returns true if the string looks like an Ethiopian phone number. */
export function isPhone(identifier: string): boolean {
  return ethioPhoneRegex.test(identifier.trim());
}

export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 characters')
  .max(13, 'Phone number must be at most 13 characters')
  .regex(
    ethioPhoneRegex,
    'Please enter a valid Ethiopian phone number (e.g., 09XX..., 07XX..., or +251...)'
  );

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — LOGIN
// Accepts either an email address or an Ethiopian phone number as identifier.
// ─────────────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  /** Email address or Ethiopian phone number (09XX… / +251…). */
  identifier: z
    .string()
    .trim()
    .min(1, 'Email or phone number is required')
    .max(254, 'Identifier is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export const verifyPhoneSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code:   z.string().length(6, 'Verification code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

export const verifyEmailSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  token:  z.string().length(64, 'Invalid verification token').regex(/^[0-9a-f]{64}$/, 'Invalid token format'),
});

export const resendVerificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type:   z.enum(['phone', 'email'], { error: 'type must be "phone" or "email"' }),
});

export type VerifyPhoneInput  = z.infer<typeof verifyPhoneSchema>;
export type VerifyEmailInput  = z.infer<typeof verifyEmailSchema>;
export type ResendVerifyInput = z.infer<typeof resendVerificationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5 — STUDENT PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/** File URLs must originate from the application's own upload endpoint. */
const uploadUrlSchema = z
  .string()
  .startsWith('/uploads/', 'File URL must be a valid upload path (starting with /uploads/)');

export const patchProfileSchema = z.object({
  // ── Personal ──────────────────────────────────────────────────────────────
  nationality:  z.string().trim().min(1).max(100).optional(),
  dob:          z.string()
                  .refine((d) => !isNaN(Date.parse(d)), 'Invalid date format')
                  .refine((d) => new Date(d) < new Date(), 'Date of birth must be in the past')
                  .optional(),
  gender:       z.enum(['Male', 'Female']).optional(),
  region:       z.string().trim().max(100).optional(),
  city:         z.string().trim().min(1).max(100).optional(),
  address:      z.string().trim().min(1).max(500).optional(),

  // ── Academic ──────────────────────────────────────────────────────────────
  program:      z.string().trim().min(1).max(200).optional(),
  academicYear: z.string().trim().min(1).max(20).optional(),
  semester:     z.string().trim().max(50).optional(),
  matricResult: z.string().trim().max(100).optional(),
  ministryResult: z.string().trim().max(100).optional(),

  // ── Documents (URLs from /api/upload) ─────────────────────────────────────
  profilePictureUrl: uploadUrlSchema.optional(),
  faydaIdUrl:        uploadUrlSchema.optional(),
  transcriptUrl:     uploadUrlSchema.optional(),

  // ── Emergency contact ─────────────────────────────────────────────────────
  emergencyName:         z.string().trim().min(2).max(100).optional(),
  emergencyRelationship: z.string().trim().max(50).optional(),
  emergencyPhone:        phoneSchema.optional(),
  emergencyNotes:        z.string().trim().max(500).optional(),

  // ── Submit flag ───────────────────────────────────────────────────────────
  /** Set to true on the final wizard submission. Triggers full required-field validation. */
  submit: z.boolean().optional().default(false),
});

export type PatchProfileInput = z.infer<typeof patchProfileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — PUBLIC STUDENT REGISTRATION
// Matches the fields sent by ApplyPageInner.tsx stage "create".
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Password rules:
 *  - Minimum 8 characters
 *  - At least one letter (upper or lower case)
 *  - At least one digit
 *  - Letters and numbers only (no special characters)
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long')
  .regex(/^[A-Za-z0-9]+$/, 'Password must contain only letters and numbers')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must be at most 100 characters')
      .regex(/\S+\s+\S+/, 'Please enter both your first and last name'),

    // At least one of email / phone is required — enforced by superRefine below
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address')
      .max(254, 'Email address is too long')
      .optional()
      .or(z.literal('')),

    phone: phoneSchema.optional().or(z.literal('')),

    password: passwordSchema,

    confirmPassword: z.string().min(1, 'Please confirm your password'),

    acceptTerms: z
      .literal(true, {
        error: 'You must accept the Terms of Service and Privacy Policy to continue',
      }),
  })
  .superRefine((data, ctx) => {
    // At least one contact method is required
    const hasEmail = typeof data.email === 'string' && data.email.trim().length > 0;
    const hasPhone = typeof data.phone === 'string' && data.phone.trim().length > 0;

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'At least one of phone number or email address is required',
      });
    }

    // Password confirmation
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY — Sign-in (email only, Phase 2 login is not implemented yet)
// ─────────────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY — Full 5-step application form (old /apply route)
// Kept so existing POST /api/auth/signup handler continues to compile.
// Will be removed when Phase 5 (login/session) refactors auth.ts fully.
// ─────────────────────────────────────────────────────────────────────────────

export const applicationSchema = z.object({
  // Step 1 — Personal
  fullName: z.string().min(2, 'Full name is required'),
  dob: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date of birth format'),
  age: z.coerce.number().min(15, 'Applicant must be at least 15 years old').max(100, 'Invalid age'),
  gender: z.enum(['Male', 'Female']),

  // Step 2 — Contact & account
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  nationality: z.string().min(1, 'Nationality is required'),
  phone: phoneSchema,
  emergencyContact: phoneSchema,
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),

  // Step 3 — Academic
  program: z.string().min(1, 'Program is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.enum(['Semester I', 'Semester II']),
  studyMode: z.enum(['In-Person', 'Online']),

  // Step 4 — Document URLs (uploaded separately via /api/upload)
  matricFileUrl: z.string().min(1, 'Matric document is required'),
  grade8FileUrl: z.string().min(1, 'Grade 8 document is required'),
  transcript910FileUrl: z.string().min(1, 'Transcript 9-10 is required'),
  transcript1112FileUrl: z.string().min(1, 'Transcript 11-12 is required'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;

/**
 * @deprecated Import Role from '@/types/auth' or '@prisma/client' instead.
 * Kept temporarily for backward compatibility with existing routes.
 */
export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'REGISTRAR'
  | 'FINANCE_OFFICER'
  | 'HR_OFFICER'
  | 'INSTRUCTOR'
  | 'STUDENT'
  | 'DEPARTMENT_HEAD';

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6 — PASSWORD RESET
// ─────────────────────────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  /** Email address or Ethiopian phone number. */
  identifier: z.string().trim().min(1, 'Email or phone number is required').max(254),
});

export const resetPasswordSchema = z
  .object({
    userId:          z.string().uuid('Invalid user ID'),
    token:           z.string().min(1, 'Reset token is required').max(64),
    password:        passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' });
    }
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput  = z.infer<typeof resetPasswordSchema>;
