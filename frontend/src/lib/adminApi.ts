/**
 * Typed API client for the Admin Dashboard.
 * All requests go through /api/admin/* (proxied by Next.js to the backend).
 * Cookies are sent automatically (credentials: 'include').
 */

const BASE = '';

// Track whether a refresh is already in-flight so concurrent 401s don't
// each trigger their own refresh, causing a race / token rotation conflict.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch('/api/auth/refresh', {
    method:      'POST',
    credentials: 'include',
  })
    .then(r => r.ok)
    .catch(() => false)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = () =>
    fetch(`${BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });

  let res = await doFetch();

  // On 401 attempt a silent token refresh, then retry once.
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (!refreshed) {
      // Refresh itself failed — session is gone, redirect to sign-in.
      window.location.href = '/signin';
      // Return a never-resolving promise so callers don't see a partial error.
      return new Promise(() => {});
    }
    res = await doFetch();
  }

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as any).error ?? `Request failed: ${res.status}`);
  return data as T;
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
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  data?:      T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalUsers:          number;
  usersByRole:         Record<string, number>;
  usersByStatus:       Record<string, number>;
  newUsersToday:       number;
  newUsersThisWeek:    number;
  newUsersThisMonth:   number;
  activeSessions:      number;
  loginSuccessToday:   number;
  loginFailedToday:    number;
  recentAuditLogs: {
    id:        string;
    action:    string;
    userId:    string | null;
    ipAddress: string | null;
    createdAt: string;
    user:      { fullName: string; role: string } | null;
  }[];
}

export const adminDashboardApi = {
  getStats: () => apiFetch<AdminDashboardStats>('/api/admin/dashboard'),
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id:                  string;
  fullName:            string;
  email:               string | null;
  phone:               string | null;
  role:                string;
  status:              string;
  emailVerified:       boolean;
  phoneVerified:       boolean;
  profileCompleted:    boolean;
  profileCompletion:   number;
  failedLoginAttempts: number;
  lastLoginAt:         string | null;
  createdAt:           string;
  updatedAt:           string;
  activeSessions:      number;
}

export interface AdminUserDetail extends AdminUser {
  oauthAccounts: { provider: string; providerAccountId: string; createdAt: string }[];
  sessions:      AdminSessionItem[];
  auditLogs:     { id: string; action: string; ipAddress: string | null; userAgent: string | null; metadata: unknown; createdAt: string }[];
  studentRecord: {
    id: string; studentId: string; status: string; yearLevel: number;
    gpa: number; totalCredits: number;
    program:    { name: string; code: string };
    department: { name: string };
  } | null;
}

export interface UsersListResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  users:      AdminUser[];
}

export interface CreateUserPayload {
  fullName:  string;
  email?:    string;
  phone?:    string;
  password:  string;
  role:      string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?:    string;
  phone?:    string;
  role?:     string;
}

export const adminUsersApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<UsersListResponse>(`/api/admin/users${qs(params)}`),

  getById: (id: string) =>
    apiFetch<AdminUserDetail>(`/api/admin/users/${id}`),

  create: (data: CreateUserPayload) =>
    apiFetch<AdminUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: UpdateUserPayload) =>
    apiFetch<AdminUser>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string, reason?: string) =>
    apiFetch<AdminUser>(`/api/admin/users/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status, reason }),
    }),

  updateRole: (id: string, role: string) =>
    apiFetch<AdminUser>(`/api/admin/users/${id}/role`, {
      method: 'PATCH', body: JSON.stringify({ role }),
    }),

  softDelete: (id: string) =>
    apiFetch<AdminUser>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  getSessions: (userId: string) =>
    apiFetch<AdminSessionItem[]>(`/api/admin/users/${userId}/sessions`),

  revokeAllSessions: (userId: string) =>
    apiFetch<{ revokedCount: number }>(`/api/admin/users/${userId}/sessions`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminSessionItem {
  id:         string;
  deviceInfo: string | null;
  ipAddress:  string | null;
  lastUsedAt: string;
  createdAt:  string;
  expiresAt:  string;
  isCurrent?: boolean;
}

export const adminSessionsApi = {
  revokeOne: (sessionId: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/sessions/${sessionId}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminAuditLog {
  id:        string;
  action:    string;
  userId:    string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata:  unknown;
  createdAt: string;
  user:      { fullName: string; email: string | null; role: string } | null;
}

export interface AuditLogsResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  logs:       AdminAuditLog[];
}

export const adminAuditApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<AuditLogsResponse>(`/api/admin/audit-logs${qs(params)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiNotification {
  id:         string;
  userId:     string;
  title:      string;
  message:    string;
  type:       string;
  isRead:     boolean;
  entityType: string | null;
  entityId:   string | null;
  createdAt:  string;
}

export interface NotificationsResponse {
  total:         number;
  page:          number;
  limit:         number;
  totalPages:    number;
  notifications: ApiNotification[];
}

export const adminNotificationsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<NotificationsResponse>(`/api/admin/notifications${qs(params)}`),

  create: (data: {
    userId: string; title: string; message: string;
    type?: string; entityType?: string; entityId?: string;
  }) => apiFetch<ApiNotification>('/api/admin/notifications', { method: 'POST', body: JSON.stringify(data) }),

  broadcast: (data: {
    title: string; message: string; type?: string;
    role?: string; entityType?: string; entityId?: string;
  }) => apiFetch<{ sent: number }>('/api/admin/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),

  markRead: (id: string) =>
    apiFetch<ApiNotification>(`/api/admin/notifications/${id}/read`, { method: 'PATCH' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiDepartment {
  id:          string;
  name:        string;
  code:        string;
  description: string | null;
  isActive:    boolean;
  createdAt:   string;
  updatedAt:   string;
  _count: {
    programs:    number;
    courses:     number;
    instructors: number;
  };
}

export const adminDepartmentsApi = {
  list: () =>
    apiFetch<ApiDepartment[]>('/api/admin/departments'),

  create: (data: { name: string; code: string; description?: string }) =>
    apiFetch<ApiDepartment>('/api/admin/departments', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    apiFetch<ApiDepartment>(`/api/admin/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiProgram {
  id:            string;
  name:          string;
  code:          string;
  description:   string | null;
  durationYears: number;
  totalCredits:  number;
  isActive:      boolean;
  departmentId:  string;
  createdAt:     string;
  updatedAt:     string;
  department:    { id: string; name: string; code: string };
  _count: {
    studentRecords: number;
    courses:        number;
  };
}

export const adminProgramsApi = {
  list: (departmentId?: string) =>
    apiFetch<ApiProgram[]>(`/api/admin/programs${departmentId ? `?departmentId=${departmentId}` : ''}`),

  create: (data: {
    name: string; code: string; description?: string;
    durationYears?: number; totalCredits?: number; departmentId: string;
  }) => apiFetch<ApiProgram>('/api/admin/programs', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: {
    name?: string; description?: string;
    durationYears?: number; totalCredits?: number; isActive?: boolean;
  }) => apiFetch<ApiProgram>(`/api/admin/programs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS (own account)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminProfile {
  id:          string;
  fullName:    string;
  email:       string | null;
  phone:       string | null;
  role:        string;
  lastLoginAt: string | null;
  createdAt:   string;
}

export interface AdminOwnSession {
  id:         string;
  deviceInfo: string | null;
  ipAddress:  string | null;
  lastUsedAt: string;
  createdAt:  string;
  expiresAt:  string;
  isCurrent:  boolean;
}

export const adminSettingsApi = {
  getProfile: () =>
    apiFetch<AdminProfile>('/api/admin/settings/profile'),

  updateProfile: (data: { fullName?: string; email?: string; phone?: string }) =>
    apiFetch<AdminProfile>('/api/admin/settings/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    apiFetch<{ success: boolean; message: string }>('/api/admin/settings/password', {
      method: 'POST', body: JSON.stringify(data),
    }),

  getSessions: () =>
    apiFetch<AdminOwnSession[]>('/api/admin/settings/sessions'),

  revokeSession: (sessionId: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/settings/sessions/${sessionId}`, { method: 'DELETE' }),

  revokeAllOtherSessions: () =>
    apiFetch<{ success: boolean; revokedCount: number }>('/api/admin/settings/sessions', { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLE ↔ DISPLAY NAME MAPS  (Prisma enum → UI display name)
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN:     'Super Admin',
  ADMIN:           'Admin',
  REGISTRAR:       'Registrar',
  FINANCE_OFFICER: 'Finance Officer',
  HR_OFFICER:      'HR Officer',
  DEPARTMENT_HEAD: 'Department Head',
  INSTRUCTOR:      'Instructor',
  STUDENT:         'Student',
};

export const DISPLAY_TO_ROLE: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_DISPLAY).map(([k, v]) => [v, k])
);

export const STATUS_DISPLAY: Record<string, string> = {
  ACTIVE:               'Active',
  PENDING_VERIFICATION: 'Pending',
  SUSPENDED:            'Suspended',
  DEACTIVATED:          'Inactive',
  LOCKED:               'Locked',
};

export const DISPLAY_TO_STATUS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_DISPLAY).map(([k, v]) => [v, k])
);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS (admin-level, real DB)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminStudentRecord {
  id:           string;
  studentId:    string;
  status:       string;
  yearLevel:    number;
  gpa:          number;
  totalCredits: number;
  createdAt:    string;
  user: {
    id:            string;
    fullName:       string;
    email:          string | null;
    phone:          string | null;
    status:         string;
    lastLoginAt:    string | null;
    profileCompleted: boolean;
  };
  program:    { id: string; name: string; code: string } | null;
  department: { id: string; name: string; code: string } | null;
}

export interface StudentsListResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  students:   AdminStudentRecord[];
}

export const adminStudentsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<StudentsListResponse>(`/api/admin/students${qs(params)}`),

  getById: (id: string) =>
    apiFetch<AdminStudentRecord & {
      enrollments: unknown[];
      graduationAudit: unknown | null;
      certificate: unknown | null;
    }>(`/api/admin/students/${id}`),

  create: (data: {
    fullName: string; email?: string; phone?: string; password: string;
    programId: string; departmentId: string; studentId?: string; yearLevel?: number;
  }) => apiFetch<AdminStudentRecord>('/api/admin/students', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: {
    fullName?: string; email?: string; phone?: string;
    programId?: string; departmentId?: string;
    status?: string; yearLevel?: number; gpa?: number;
  }) => apiFetch<AdminStudentRecord>(`/api/admin/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  suspend: (id: string) =>
    apiFetch<AdminStudentRecord>(`/api/admin/students/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTORS (admin-level, real DB)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminInstructorRecord {
  id:             string;
  employeeId:     string;
  title:          string;
  specialization: string | null;
  isActive:       boolean;
  createdAt:      string;
  user: {
    id:          string;
    fullName:     string;
    email:        string | null;
    phone:        string | null;
    status:       string;
    lastLoginAt:  string | null;
  };
  department: { id: string; name: string; code: string };
  _count: { offerings: number };
}

export interface InstructorsListResponse {
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
  instructors: AdminInstructorRecord[];
}

export const adminInstructorsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<InstructorsListResponse>(`/api/admin/instructors${qs(params)}`),

  getById: (id: string) =>
    apiFetch<AdminInstructorRecord & {
      offerings: unknown[];
    }>(`/api/admin/instructors/${id}`),

  create: (data: {
    fullName: string; email?: string; phone?: string; password: string;
    employeeId?: string; title?: string; specialization?: string; departmentId: string;
  }) => apiFetch<AdminInstructorRecord>('/api/admin/instructors', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: {
    fullName?: string; email?: string; phone?: string;
    title?: string; specialization?: string; departmentId?: string; isActive?: boolean;
  }) => apiFetch<AdminInstructorRecord>(`/api/admin/instructors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deactivate: (id: string) =>
    apiFetch<AdminInstructorRecord>(`/api/admin/instructors/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// COURSES (admin-level CRUD)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminCourseRecord {
  id:          string;
  code:        string;
  name:        string;
  description: string | null;
  creditHours: number;
  status:      string;
  createdAt:   string;
  department:  { id: string; name: string; code: string };
  prerequisites: { prerequisite: { id: string; code: string; name: string } }[];
  _count: { offerings: number };
}

export interface CoursesListResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  courses:    AdminCourseRecord[];
}

export const adminCoursesApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<CoursesListResponse>(`/api/admin/courses${qs(params)}`),

  getById: (id: string) =>
    apiFetch<AdminCourseRecord>(`/api/admin/courses/${id}`),

  create: (data: {
    code: string; name: string; description?: string;
    creditHours?: number; departmentId: string; status?: string;
    prerequisiteIds?: string[];
  }) => apiFetch<AdminCourseRecord>('/api/admin/courses', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: {
    name?: string; description?: string; creditHours?: number;
    departmentId?: string; status?: string; prerequisiteIds?: string[];
  }) => apiFetch<AdminCourseRecord>(`/api/admin/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deactivate: (id: string) =>
    apiFetch<AdminCourseRecord>(`/api/admin/courses/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC YEARS
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiAcademicYear {
  id:        string;
  name:      string;
  startDate: string;
  endDate:   string;
  isCurrent: boolean;
  isActive:  boolean;
  createdAt: string;
  semesters: ApiSemester[];
}

export interface ApiSemester {
  id:                string;
  name:              string;
  academicYearId:    string;
  startDate:         string;
  endDate:           string;
  registrationStart: string;
  registrationEnd:   string;
  addDropDeadline:   string;
  isCurrent:         boolean;
  isActive:          boolean;
  academicYear?:     { id: string; name: string };
}

export const adminAcademicYearsApi = {
  list: () => apiFetch<ApiAcademicYear[]>('/api/admin/academic-years'),
  getById: (id: string) => apiFetch<ApiAcademicYear>(`/api/admin/academic-years/${id}`),
  create: (data: {
    name: string; startDate: string; endDate: string; isCurrent?: boolean; isActive?: boolean;
  }) => apiFetch<ApiAcademicYear>('/api/admin/academic-years', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: {
    name?: string; startDate?: string; endDate?: string; isCurrent?: boolean; isActive?: boolean;
  }) => apiFetch<ApiAcademicYear>(`/api/admin/academic-years/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivate: (id: string) =>
    apiFetch<ApiAcademicYear>(`/api/admin/academic-years/${id}`, { method: 'DELETE' }),
};

export const adminSemestersApi = {
  list: (academicYearId?: string) =>
    apiFetch<ApiSemester[]>(`/api/admin/semesters${academicYearId ? `?academicYearId=${academicYearId}` : ''}`),
  getById: (id: string) => apiFetch<ApiSemester>(`/api/admin/semesters/${id}`),
  create: (data: {
    name: string; academicYearId: string; startDate: string; endDate: string;
    registrationStart: string; registrationEnd: string; addDropDeadline: string;
    isCurrent?: boolean; isActive?: boolean;
  }) => apiFetch<ApiSemester>('/api/admin/semesters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: {
    name?: string; startDate?: string; endDate?: string;
    registrationStart?: string; registrationEnd?: string; addDropDeadline?: string;
    isCurrent?: boolean; isActive?: boolean;
  }) => apiFetch<ApiSemester>(`/api/admin/semesters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivate: (id: string) =>
    apiFetch<ApiSemester>(`/api/admin/semesters/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiAdmission {
  id:          string;
  fullName:    string;
  status:      string;
  program:     string;
  academicYear: string;
  onboardingStatus: string;
  createdAt:   string;
  reviewedAt:  string | null;
  reviewComment: string | null;
  user:        { id: string; fullName: string; email: string | null; phone: string | null };
  documents:   { id: string; type: string; fileUrl: string }[];
}

export interface AdmissionsListResponse {
  total:        number;
  page:         number;
  limit:        number;
  totalPages:   number;
  applications: ApiAdmission[];
}

export const adminAdmissionsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<AdmissionsListResponse>(`/api/admin/admissions${qs(params)}`),

  getById: (id: string) =>
    apiFetch<ApiAdmission>(`/api/admin/admissions/${id}`),

  updateStatus: (id: string, status: string, comment?: string) =>
    apiFetch<ApiAdmission>(`/api/admin/admissions/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status, comment }),
    }),

  reviewOnboarding: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) =>
    apiFetch<ApiAdmission>(`/api/admin/admissions/${id}/onboarding`, {
      method: 'PATCH', body: JSON.stringify({ status, reason }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// COURSE OFFERINGS (admin read-only)
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiOffering {
  id:          string;
  status:      string;
  capacity:    number;
  section:     string;
  createdAt:   string;
  enrolledCount: number;
  utilizationPct: number;
  course: {
    id: string; code: string; name: string; creditHours: number;
    department: { name: string; code: string };
  };
  semester: {
    id: string; name: string; isCurrent: boolean;
    academicYear: { name: string };
  };
  instructor: { id: string; title: string; user: { fullName: string } } | null;
  room: { name: string; building: string; capacity: number } | null;
}

export interface OfferingsListResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  offerings:  ApiOffering[];
}

export const adminOfferingsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<OfferingsListResponse>(`/api/admin/offerings${qs(params)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS (institution-wide reports)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminAnalytics {
  enrollment: {
    total:        number;
    byDepartment: { name: string; code: string; count: number }[];
    byProgram:    { name: string; code: string; count: number }[];
    byStatus:     Record<string, number>;
    byYearLevel:  { year: number; count: number }[];
  };
  academic: {
    avgGpa:       number;
    gpaByDept:    { name: string; code: string; avgGpa: number; count: number }[];
    gpaByProgram: { name: string; code: string; avgGpa: number; count: number }[];
    gradeDist:    { grade: string; count: number }[];
    atRiskCount:  number;
  };
  attendance: {
    overallRate:        number | null;
    byDepartment:       { name: string; code: string; rate: number | null; total: number; present: number }[];
    lowAttendanceCount: number;
  };
  faculty: {
    total:        number;
    active:       number;
    byDepartment: { name: string; code: string; count: number }[];
    avgOfferings: number;
  };
  offerings: {
    total:         number;
    active:        number;
    avgUtilization: number;
    byDepartment:  { name: string; code: string; active: number; total: number }[];
  };
  courses: {
    total:    number;
    active:   number;
    inactive: number;
  };
}

export const adminAnalyticsApi = {
  get: () => apiFetch<AdminAnalytics>('/api/admin/analytics'),
};

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL TRANSACTIONS (admin read-only view)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminTransaction {
  id:              string;
  type:            string;
  amount:          number;
  description:     string;
  category:        string;
  receiptId:       string | null;
  status:          string;
  referenceId:     string | null;
  transactionDate: string;
  createdAt:       string;
  financialAccount: {
    studentRecord: {
      user:    { fullName: string; email: string | null };
      program: { name: string } | null;
    };
  };
}

export interface TransactionsListResponse {
  total:        number;
  page:         number;
  limit:        number;
  totalPages:   number;
  transactions: AdminTransaction[];
}

export const adminTransactionsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<TransactionsListResponse>(`/api/admin/transactions${qs(params)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM HEALTH (real backend check)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminSystemHealth {
  status: string;
  responseTimeMs: number;
  services: { name: string; status: string; responseTime: string; detail: string }[];
  stats: { activeSessions: number; totalUsers: number; activeStudents: number; activeOfferings: number };
  timestamp: string;
}

export const adminSystemApi = {
  health: () => apiFetch<AdminSystemHealth>('/api/admin/system-health'),
};
