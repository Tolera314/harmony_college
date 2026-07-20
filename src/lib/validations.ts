import { z } from 'zod';

/**
 * Regex for Ethiopian Phone Numbers:
 * Supports:
 * - Ethio Telecom: +2519..., 09...
 * - Safaricom Ethiopia: +2517..., 07...
 */
const ethioPhoneRegex = /^(?:\+251|0)[79]\d{8}$/;

/**
 * Normalizes an Ethiopian phone number to +251 format.
 * Example: 0911223344 -> +251911223344
 */
export const normalizePhone = (phone: string) => {
  if (phone.startsWith('0')) {
    return '+251' + phone.slice(1);
  }
  return phone;
};

export const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 characters')
  .max(13, 'Phone number must be at most 13 characters')
  .regex(ethioPhoneRegex, 'Please enter a valid Ethiopian phone number (e.g., 09XX..., 07XX..., or +251...)');

// =====================================
// SIGN IN SCHEMA
// =====================================
export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// =====================================
// REGISTRATION (SIGN UP) SCHEMA
// =====================================
// We validate the fields provided in the 5-step /apply process
export const applicationSchema = z.object({
  // Step 1: Personal
  fullName: z.string().min(2, 'Full name is required'),
  dob: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, 'Invalid date of birth format'),
  age: z.coerce.number().min(15, 'Applicant must be at least 15 years old').max(100, 'Invalid age'),
  gender: z.enum(['Male', 'Female']),

  // Step 2: Contact & Account Creation
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  nationality: z.string().min(1, 'Nationality is required'),
  phone: phoneSchema,
  emergencyContact: phoneSchema,
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),

  // Step 3: Academic
  program: z.string().min(1, 'Program is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.enum(['Semester I', 'Semester II']),
  studyMode: z.enum(['In-Person', 'Online']),
  
  // Document URLs (Grade reports/transcripts)
  matricFileUrl: z.string().url('Matric document is required'),
  grade8FileUrl: z.string().url('Grade 8 document is required'),
  transcript910FileUrl: z.string().url('Transcript 9-10 is required'),
  transcript1112FileUrl: z.string().url('Transcript 11-12 is required'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type Role = 'SUPER_ADMIN' | 'REGISTRAR_OFFICER' | 'FINANCE_OFFICER' | 'HR_OFFICER' | 'LECTURER' | 'STUDENT' | 'DEPARTMENT_HEAD';
