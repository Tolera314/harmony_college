// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — HR Officer Dashboard Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type HRNavTab =
  | 'overview'
  | 'employees'
  | 'onboarding'
  | 'leave'
  | 'payroll'
  | 'performance'
  | 'documents'
  | 'reports'
  | 'notifications'
  | 'audit_log'
  | 'settings';

// ── HR Officer Profile ────────────────────────────────────────────────────────
export interface HROfficerProfile {
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  officeRoom: string;
  avatar: string;
  employeeId: string;
  academicYear: string;
  currentPayrollMonth: string;
}

// ── Department ────────────────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  head: string;
  headId: string;
  employeeCount: number;
  budget: number;
}

// ── Employee ──────────────────────────────────────────────────────────────────
export type EmploymentType = 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern';
export type ContractStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Probation';
export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
export type Gender = 'Male' | 'Female';

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  avatar: string;
  departmentId: string;
  position: string;
  employmentType: EmploymentType;
  contractStatus: ContractStatus;
  status: EmployeeStatus;
  gender: Gender;
  email: string;
  phone: string;
  hireDate: string;
  contractEndDate?: string;
  managerId?: string;
  // Salary — sensitive, masked by default
  basicSalary: number;
  allowances: number;
  deductions: number;
  // Personal
  nationalId: string;  // masked
  bankAccount: string; // masked
  taxNumber: string;   // masked
  // Emergency
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  // Qualifications
  education: string;
  experience: number; // years
}

// ── Onboarding ────────────────────────────────────────────────────────────────
export type OnboardingStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
export type OnboardingStep =
  | 'personal_info'
  | 'employment_details'
  | 'contract'
  | 'salary'
  | 'benefits'
  | 'documents'
  | 'review';

export interface OnboardingRecord {
  id: string;
  employeeId: string;
  currentStep: number; // 0-6
  status: OnboardingStatus;
  startedAt: string;
  completedAt?: string;
  steps: { id: OnboardingStep; label: string; completed: boolean }[];
}

// ── Leave ─────────────────────────────────────────────────────────────────────
export type LeaveType = 'Annual' | 'Sick' | 'Maternity' | 'Paternity' | 'Emergency' | 'Study';
export type HRLeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Forwarded' | 'Cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: HRLeaveStatus;
  managerApproval?: 'Approved' | 'Rejected' | 'Pending';
  hrApproval?: 'Approved' | 'Rejected' | 'Pending';
  submittedAt: string;
  reviewedAt?: string;
  comment?: string;
}

export interface LeaveBalance {
  employeeId: string;
  annual: { entitled: number; taken: number; remaining: number };
  sick:   { entitled: number; taken: number; remaining: number };
  study:  { entitled: number; taken: number; remaining: number };
}

// ── Payroll ───────────────────────────────────────────────────────────────────
export type PayrollStage = 'Draft' | 'Pending Review' | 'Pending HR Approval' | 'Approved' | 'Locked';

export interface PayrollRecord {
  id: string;
  month: string;
  year: number;
  stage: PayrollStage;
  totalGross: number;
  totalNet: number;
  employeeCount: number;
  generatedAt: string;
  approvals: PayrollApproval[];
}

export interface PayrollApproval {
  stage: string;
  approver: string;
  date: string;
  status: 'Approved' | 'Returned' | 'Pending';
  comment?: string;
}

export interface PayslipEntry {
  employeeId: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  bonuses: number;
  tax: number;
  pension: number;
  otherDeductions: number;
  netSalary: number;
}

// ── Performance ───────────────────────────────────────────────────────────────
export type ReviewCycle = 'Quarterly' | 'Semi-Annual' | 'Annual';
export type ReviewStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  cycle: ReviewCycle;
  period: string;
  status: ReviewStatus;
  dueDate: string;
  overallScore?: number; // 1-5
  goals: number;
  competencies: number;
  attendance: number;
  communication: number;
  leadership: number;
  technicalSkills: number;
  managerComment?: string;
  hrComment?: string;
  completedAt?: string;
}

// ── Document ──────────────────────────────────────────────────────────────────
export type DocumentCategory = 'CV' | 'Contract' | 'National ID' | 'Certificate' | 'Performance Report' | 'Payslip' | 'Leave Document';

export interface HRDocument {
  id: string;
  employeeId: string;
  category: DocumentCategory;
  title: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
}

// ── HR Notification ───────────────────────────────────────────────────────────
export type HRNotifType = 'leave' | 'payroll' | 'performance' | 'contract' | 'onboarding' | 'system';

export interface HRNotification {
  id: string;
  type: HRNotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  tab: HRNavTab;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface HRAuditEntry {
  id: string;
  date: string;
  action: string;
  employee: string;
  module: string;
  user: string;
  description: string;
  status: 'Success' | 'Warning' | 'Failed';
}

// ── Offboarding ───────────────────────────────────────────────────────────────
export type ExitReason = 'Resignation' | 'Termination' | 'Contract Expiry' | 'Retirement';
export type OffboardingStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface OffboardingRecord {
  id: string;
  employeeId: string;
  lastWorkingDay: string;
  exitReason: ExitReason;
  currentStep: number;
  status: OffboardingStatus;
  assetChecklist: { item: string; returned: boolean; notes?: string }[];
}
