/**
 * HR API Client — Harmony College
 * All requests hit /api/hr/* on the backend (Express).
 * Cookies (httpOnly accessToken) are forwarded automatically.
 */

const BASE = '/api/hr';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((body as any).message ?? `Request failed: ${res.status}`);
  // Backend wraps responses in { success, data }
  return ((body as any).data ?? body) as T;
}

function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES (mirroring backend Prisma enums / HR types)
// ─────────────────────────────────────────────────────────────────────────────

export type HREmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type HRContractStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PROBATION';
export type HREmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type HRGender         = 'MALE' | 'FEMALE';
export type HRLeaveType      = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'EMERGENCY' | 'STUDY';
export type HRLeaveStatus    = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FORWARDED' | 'CANCELLED';
export type HRApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type HRPayrollStage   = 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_HR_APPROVAL' | 'APPROVED' | 'LOCKED';
export type HRReviewCycle    = 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type HRReviewStatus   = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type HRDocumentCategory = 'CV' | 'CONTRACT' | 'NATIONAL_ID' | 'CERTIFICATE' | 'PERFORMANCE_REPORT' | 'PAYSLIP' | 'LEAVE_DOCUMENT';
export type HROnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
export type HRAuditStatus    = 'SUCCESS' | 'WARNING' | 'FAILED';
export type HRNotifType      = 'LEAVE' | 'PAYROLL' | 'PERFORMANCE' | 'CONTRACT' | 'ONBOARDING' | 'SYSTEM';

// Helpers to map DB enums → display labels used by existing frontend components
export const EMPLOYMENT_TYPE_LABEL: Record<HREmploymentType, string> = {
  FULL_TIME: 'Full-Time', PART_TIME: 'Part-Time', CONTRACT: 'Contract', INTERN: 'Intern',
};
export const CONTRACT_STATUS_LABEL: Record<HRContractStatus, string> = {
  ACTIVE: 'Active', EXPIRING_SOON: 'Expiring Soon', EXPIRED: 'Expired', PROBATION: 'Probation',
};
export const EMPLOYEE_STATUS_LABEL: Record<HREmployeeStatus, string> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', ON_LEAVE: 'On Leave', TERMINATED: 'Terminated',
};
export const LEAVE_TYPE_LABEL: Record<HRLeaveType, string> = {
  ANNUAL: 'Annual', SICK: 'Sick', MATERNITY: 'Maternity', PATERNITY: 'Paternity',
  EMERGENCY: 'Emergency', STUDY: 'Study',
};
export const LEAVE_STATUS_LABEL: Record<HRLeaveStatus, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
  FORWARDED: 'Forwarded', CANCELLED: 'Cancelled',
};
export const REVIEW_CYCLE_LABEL: Record<HRReviewCycle, string> = {
  QUARTERLY: 'Quarterly', SEMI_ANNUAL: 'Semi-Annual', ANNUAL: 'Annual',
};
export const REVIEW_STATUS_LABEL: Record<HRReviewStatus, string> = {
  PENDING: 'Pending', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', OVERDUE: 'Overdue',
};
export const DOC_CATEGORY_LABEL: Record<HRDocumentCategory, string> = {
  CV: 'CV', CONTRACT: 'Contract', NATIONAL_ID: 'National ID', CERTIFICATE: 'Certificate',
  PERFORMANCE_REPORT: 'Performance Report', PAYSLIP: 'Payslip', LEAVE_DOCUMENT: 'Leave Document',
};
export const PAYROLL_STAGE_LABEL: Record<HRPayrollStage, string> = {
  DRAFT: 'Draft', PENDING_REVIEW: 'Pending Review',
  PENDING_HR_APPROVAL: 'Pending HR Approval', APPROVED: 'Approved', LOCKED: 'Locked',
};

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface HRDepartmentApi {
  id: string; name: string; budget: number; headEmployeeId: string | null; isActive: boolean;
  _count?: { employees: number };
}

export interface HREmployeeApi {
  id: string; employeeCode: string; fullName: string; avatarUrl: string | null;
  gender: HRGender; email: string; phone: string | null; position: string;
  dateOfBirth: string | null; address: string | null;
  departmentId: string; department?: { id: string; name: string };
  employmentType: HREmploymentType; contractStatus: HRContractStatus;
  status: HREmployeeStatus; hireDate: string; contractEndDate: string | null;
  managerId: string | null; manager?: { id: string; fullName: string } | null;
  education: string | null; experienceYears: number;
  basicSalary: number; allowances: number; deductions: number;
  nationalId?: string | null; bankAccount?: string | null; taxNumber?: string | null;
  // System role and course (for INSTRUCTOR/DEPARTMENT_HEAD)
  systemRole?: string | null;
  courseId?:   string | null;
  // Document URLs (sensitive — only in /full endpoint)
  faydaIdUrl?: string | null;      faydaIdFileSize?: string | null;
  certificateUrl?: string | null;  certificateFileSize?: string | null;
  emergencyName: string | null; emergencyPhone: string | null; emergencyRelation: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface HRLeaveRequestApi {
  id: string; employeeId: string; leaveType: HRLeaveType;
  startDate: string; endDate: string; daysCount: number; reason: string;
  status: HRLeaveStatus; managerApproval: HRApprovalStatus; hrApproval: HRApprovalStatus;
  reviewComment: string | null; submittedAt: string; reviewedAt: string | null;
  employee?: {
    id: string; fullName: string; employeeCode: string; avatarUrl: string | null;
    position: string; department?: { name: string };
  };
}

export interface HRLeaveBalanceApi {
  id: string; employeeId: string; leaveType: HRLeaveType;
  entitled: number; taken: number; remaining: number; year: number;
  employee?: { id: string; fullName: string; avatarUrl: string | null; position: string };
}

export interface HRPayrollApprovalApi {
  id: string; payrollId: string; stageName: string; approverName: string;
  approvedAt: string | null; status: HRApprovalStatus; comment: string | null;
}

export interface HRPayslipApi {
  id: string; payrollId: string; employeeId: string;
  basicSalary: number; allowances: number; bonuses: number;
  tax: number; pension: number; otherDeductions: number; netSalary: number;
  employee?: { id: string; fullName: string; avatarUrl: string | null; employeeCode: string };
}

export interface HRPayrollRecordApi {
  id: string; month: string; year: number; stage: HRPayrollStage;
  totalGross: number; totalNet: number; employeeCount: number; generatedAt: string;
  approvals: HRPayrollApprovalApi[];
  payslips?: HRPayslipApi[];
  _count?: { payslips: number };
}

export interface HRPerformanceReviewApi {
  id: string; employeeId: string; cycle: HRReviewCycle; period: string;
  status: HRReviewStatus; dueDate: string; overallScore: number | null;
  goalsScore: number | null; competenciesScore: number | null; attendanceScore: number | null;
  communicationScore: number | null; leadershipScore: number | null; technicalScore: number | null;
  managerComment: string | null; hrComment: string | null; completedAt: string | null;
  employee?: { id: string; fullName: string; avatarUrl: string | null; position: string; employeeCode: string };
}

export interface HRDocumentApi {
  id: string; employeeId: string; category: HRDocumentCategory; title: string;
  fileUrl: string | null; fileSize: string | null;
  uploadedByName: string | null; version: number; uploadedAt: string;
  employee?: { id: string; fullName: string; avatarUrl: string | null; employeeCode: string };
}

export interface HROnboardingStepApi {
  id: string; stepKey: string; label: string; completed: boolean; orderIndex: number;
}

export interface HROnboardingRecordApi {
  id: string; employeeId: string; currentStep: number;
  status: HROnboardingStatus; startedAt: string; completedAt: string | null;
  steps: HROnboardingStepApi[];
  employee?: {
    id: string; fullName: string; avatarUrl: string | null;
    position: string; employeeCode: string;
    department?: { id: string; name: string };
  };
}

export interface HRAuditLogApi {
  id: string; actorName: string; action: string; employeeName: string;
  module: string; description: string; status: HRAuditStatus; createdAt: string;
}

export interface HRNotificationApi {
  id: string; employeeId: string | null; type: HRNotifType;
  title: string; message: string; tab: string; isRead: boolean; createdAt: string;
  employee?: { id: string; fullName: string; avatarUrl: string | null } | null;
}

export interface HRDashboardData {
  kpis: {
    totalEmployees: number; activeEmployees: number; onLeave: number; terminated: number;
    pendingLeaveRequests: number; expiringContracts: number; reviewsDue: number; newHiresThisMonth: number;
  };
  currentPayroll: { id: string; month: string; year: number; stage: HRPayrollStage; totalGross: number; totalNet: number; employeeCount: number } | null;
  departmentBreakdown: { id: string; name: string; budget: number; employeeCount: number }[];
  employmentTypeBreakdown: { type: HREmploymentType; count: number }[];
  statusBreakdown: { status: HREmployeeStatus; count: number }[];
  pendingLeaveRequests: HRLeaveRequestApi[];
  expiringContractList: { id: string; fullName: string; avatarUrl: string | null; contractEndDate: string | null; position: string }[];
  recentAudit: HRAuditLogApi[];
}

export interface PaginatedResponse<T> {
  total: number; page: number; limit: number; totalPages: number;
  data?: T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API METHODS
// ─────────────────────────────────────────────────────────────────────────────

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const hrDashboardApi = {
  get: () => apiFetch<HRDashboardData>('/dashboard'),
};

// ── Departments ───────────────────────────────────────────────────────────────
export const hrDepartmentsApi = {
  list: () => apiFetch<HRDepartmentApi[]>('/departments'),
};

// ── Courses (for INSTRUCTOR / DEPARTMENT_HEAD role assignment) ────────────────
export interface HRCourseOption {
  id: string; code: string; name: string; creditHours: number;
  department: { name: string };
}
export const hrCoursesApi = {
  list: () => apiFetch<HRCourseOption[]>('/courses/options'),
};

// ── Employees ─────────────────────────────────────────────────────────────────
export const hrEmployeesApi = {
  list: (params: {
    page?: number; limit?: number; search?: string; departmentId?: string;
    status?: string; employmentType?: string; systemRole?: string;
  } = {}) =>
    apiFetch<{ total: number; page: number; limit: number; totalPages: number; employees: HREmployeeApi[] }>(`/employees${qs(params)}`),

  getById: (id: string) =>
    apiFetch<HREmployeeApi>(`/employees/${id}`),

  /** Full detail including nationalId, bankAccount, taxNumber, faydaIdUrl, certificateUrl — HR roles only */
  getFullById: (id: string) =>
    apiFetch<HREmployeeApi>(`/employees/${id}/full`),

  create: (data: Record<string, unknown>) =>
    apiFetch<HREmployeeApi>('/employees', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<HREmployeeApi>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deactivate: (id: string) =>
    apiFetch<HREmployeeApi>(`/employees/${id}/deactivate`, { method: 'PATCH' }),
};

// ── Leave ─────────────────────────────────────────────────────────────────────
export const hrLeaveApi = {
  list: (params: { status?: string; employeeId?: string; page?: number; limit?: number } = {}) =>
    apiFetch<{ total: number; page: number; limit: number; totalPages: number; requests: HRLeaveRequestApi[] }>(`/leave${qs(params)}`),

  getById: (id: string) =>
    apiFetch<HRLeaveRequestApi>(`/leave/${id}`),

  review: (id: string, data: { action: 'APPROVED' | 'REJECTED'; comment?: string }) =>
    apiFetch<HRLeaveRequestApi>(`/leave/${id}/review`, { method: 'PATCH', body: JSON.stringify(data) }),

  listBalances: (employeeId?: string) =>
    apiFetch<HRLeaveBalanceApi[]>(`/leave/balances${employeeId ? `?employeeId=${employeeId}` : ''}`),
};

// ── Payroll ───────────────────────────────────────────────────────────────────
export const hrPayrollApi = {
  list: () => apiFetch<HRPayrollRecordApi[]>('/payroll'),

  getById: (id: string) => apiFetch<HRPayrollRecordApi>(`/payroll/${id}`),

  approve: (id: string, comment?: string) =>
    apiFetch<HRPayrollRecordApi>(`/payroll/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ comment }) }),

  lock: (id: string) =>
    apiFetch<HRPayrollRecordApi>(`/payroll/${id}/lock`, { method: 'PATCH' }),
};

// ── Performance ───────────────────────────────────────────────────────────────
export const hrPerformanceApi = {
  list: (status?: string) =>
    apiFetch<HRPerformanceReviewApi[]>(`/performance${status && status !== 'All' ? `?status=${status}` : ''}`),

  getById: (id: string) =>
    apiFetch<HRPerformanceReviewApi>(`/performance/${id}`),

  create: (data: { employeeId: string; cycle: string; period: string; dueDate: string }) =>
    apiFetch<HRPerformanceReviewApi>('/performance', { method: 'POST', body: JSON.stringify(data) }),

  submitScores: (id: string, data: {
    goalsScore: number; competenciesScore: number; attendanceScore: number;
    communicationScore: number; leadershipScore: number; technicalScore: number;
    managerComment?: string; hrComment?: string;
  }) => apiFetch<HRPerformanceReviewApi>(`/performance/${id}/scores`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const hrDocumentsApi = {
  list: (params: { search?: string; category?: string; employeeId?: string } = {}) =>
    apiFetch<HRDocumentApi[]>(`/documents${qs(params)}`),

  create: (data: { employeeId: string; category: string; title: string; fileUrl?: string; fileSize?: string; version?: number }) =>
    apiFetch<HRDocumentApi>('/documents', { method: 'POST', body: JSON.stringify(data) }),

  delete: (id: string) =>
    fetch(`${BASE}/documents/${id}`, { method: 'DELETE', credentials: 'include' }).then(r => {
      if (!r.ok && r.status !== 204) throw new Error(`Delete failed: ${r.status}`);
    }),
};

// ── Onboarding ────────────────────────────────────────────────────────────────
export const hrOnboardingApi = {
  list: (params: { page?: number; limit?: number; search?: string; departmentId?: string; status?: string } = {}) =>
    apiFetch<{
      total: number; page: number; limit: number; totalPages: number;
      records: HROnboardingRecordApi[];
    }>(`/onboarding${qs(params)}`),

  getByEmployee: (employeeId: string) =>
    apiFetch<HROnboardingRecordApi>(`/onboarding/${employeeId}`),

  start: (employeeId: string) =>
    apiFetch<HROnboardingRecordApi>('/onboarding', { method: 'POST', body: JSON.stringify({ employeeId }) }),

  advanceStep: (employeeId: string, stepKey: string, completed: boolean) =>
    apiFetch<HROnboardingRecordApi>(`/onboarding/${employeeId}/step`, {
      method: 'PATCH', body: JSON.stringify({ stepKey, completed }),
    }),

  complete: (employeeId: string) =>
    apiFetch<{ message: string }>(`/onboarding/${employeeId}/complete`, { method: 'POST' }),
};

// ── Offboarding ───────────────────────────────────────────────────────────────

export type HRExitReason = 'RESIGNATION' | 'TERMINATION' | 'CONTRACT_EXPIRY' | 'RETIREMENT';
export type HROffboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface HRAssetCheckItemApi {
  id: string; recordId: string; item: string; returned: boolean; notes: string | null;
}

export interface HROffboardingRecordApi {
  id: string; employeeId: string;
  lastWorkingDay: string; exitReason: HRExitReason;
  currentStep: number; status: HROffboardingStatus;
  createdAt: string; updatedAt: string;
  assetChecklist: HRAssetCheckItemApi[];
  employee?: {
    id: string; fullName: string; avatarUrl: string | null;
    position: string; employeeCode: string;
    department?: { name: string };
  };
}

export const EXIT_REASON_LABEL: Record<HRExitReason, string> = {
  RESIGNATION: 'Resignation', TERMINATION: 'Termination',
  CONTRACT_EXPIRY: 'Contract Expiry', RETIREMENT: 'Retirement',
};

export const hrOffboardingApi = {
  list: (params: { page?: number; limit?: number; search?: string; departmentId?: string; status?: string } = {}) =>
    apiFetch<{
      total: number; page: number; limit: number; totalPages: number;
      records: HROffboardingRecordApi[];
    }>(`/offboarding${qs(params)}`),

  getByEmployee: (employeeId: string) =>
    apiFetch<HROffboardingRecordApi>(`/offboarding/${employeeId}`),

  start: (data: {
    employeeId: string; lastWorkingDay: string;
    exitReason: HRExitReason; customAssets?: string[];
  }) => apiFetch<HROffboardingRecordApi>('/offboarding', {
    method: 'POST', body: JSON.stringify(data),
  }),

  updateAsset: (recordId: string, assetId: string, data: { returned: boolean; notes?: string }) =>
    apiFetch<HROffboardingRecordApi>(`/offboarding/${recordId}/assets/${assetId}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  finalize: (recordId: string) =>
    apiFetch<{ message: string }>(`/offboarding/${recordId}/finalize`, { method: 'POST' }),
};

export interface HRSalaryHistoryEntry {
  id: string; employeeId: string;
  effectiveDate: string;
  basicSalary: number; allowances: number; deductions: number; grossSalary: number;
  reason: string | null; changedByName: string; changedByUserId: string | null;
  createdAt: string;
}

export const hrSalaryHistoryApi = {
  list: (employeeId: string) =>
    apiFetch<{ employee: { fullName: string }; history: HRSalaryHistoryEntry[] }>(
      `/employees/${employeeId}/salary-history`
    ),

  record: (employeeId: string, data: {
    effectiveDate: string;
    basicSalary: number; allowances: number; deductions: number;
    reason?: string;
  }) => apiFetch<HRSalaryHistoryEntry>(`/employees/${employeeId}/salary-history`, {
    method: 'POST', body: JSON.stringify(data),
  }),
};

// ── Contract Renewals ─────────────────────────────────────────────────────────

export interface HRContractRenewalEntry {
  id: string; employeeId: string;
  previousEndDate: string; newEndDate: string;
  reason: string | null; documentId: string | null;
  approvedByName: string; approvedByUserId: string | null;
  approvedAt: string; createdAt: string;
}

export const hrContractRenewalApi = {
  list: (employeeId: string) =>
    apiFetch<{ employee: { fullName: string }; renewals: HRContractRenewalEntry[] }>(
      `/employees/${employeeId}/contract-renewals`
    ),

  renew: (employeeId: string, data: {
    newEndDate: string;
    reason?: string;
    documentId?: string;
  }) => apiFetch<HRContractRenewalEntry>(`/employees/${employeeId}/contract-renewals`, {
    method: 'POST', body: JSON.stringify(data),
  }),
};
export const hrAuditApi = {
  list: (params: { search?: string; module?: string; page?: number; limit?: number } = {}) =>
    apiFetch<{ total: number; page: number; limit: number; totalPages: number; logs: HRAuditLogApi[] }>(`/audit-logs${qs(params)}`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const hrNotificationsApi = {
  list: () => apiFetch<HRNotificationApi[]>('/notifications'),

  markRead: (id: string) =>
    apiFetch<HRNotificationApi>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch<{ message: string }>('/notifications/read-all', { method: 'POST' }),
};
