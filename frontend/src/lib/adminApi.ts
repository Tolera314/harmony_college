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
    apiFetch<{ success: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
};

export interface ApiStaffInvitation {
  id:              string;
  email:           string;
  fullName:        string;
  role:            string;
  departmentId:    string;
  positionTitle?:  string;
  employeeId?:     string;
  phone?:          string;
  specialization?: string;
  expiresAt:       string;
  acceptedAt?:     string;
  revokedAt?:      string;
  createdAt:       string;
  status:          'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  department?:     { id: string; name: string; code: string };
  invitedByUser?:  { id: string; fullName: string; email: string };
  acceptedByUser?: { id: string; fullName: string; email: string };
}

export interface InvitationsListResponse {
  invitations: ApiStaffInvitation[];
  total:       number;
  page:       number;
  limit:       number;
  totalPages:  number;
}

export const adminInvitationsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<InvitationsListResponse>(`/api/admin/invitations${qs(params)}`),

  create: (data: {
    fullName: string;
    email: string;
    role: string;
    departmentId: string;
    positionTitle?: string;
    employeeId?: string;
    phone?: string;
    specialization?: string;
  }) => apiFetch<{ success: boolean; message: string; invitation: ApiStaffInvitation; emailWarning?: string; invitationLink?: string }>('/api/admin/invitations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: {
    fullName?: string;
    email?: string;
    role?: string;
    departmentId?: string;
    positionTitle?: string;
    employeeId?: string;
    phone?: string;
    specialization?: string;
  }) => apiFetch<{ success: boolean; message: string; invitation: ApiStaffInvitation; emailWarning?: string; invitationLink?: string }>(`/api/admin/invitations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  resend: (id: string) =>
    apiFetch<{ success: boolean; message: string; invitation: ApiStaffInvitation; emailWarning?: string; invitationLink?: string }>(`/api/admin/invitations/${id}/resend`, {
      method: 'POST',
    }),

  revoke: (id: string) =>
    apiFetch<{ success: boolean; message: string; invitation: ApiStaffInvitation }>(`/api/admin/invitations/${id}/revoke`, {
      method: 'POST',
    }),
};

export const adminUserSessionsApi = {
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
  id:          string;
  action:      string;
  module:      string;
  actorName:   string;
  actorEmail?: string | null;
  actorRole?:  string | null;
  actorUserId?: string | null;
  ipAddress?:  string | null;
  userAgent?:  string | null;
  metadata?:   unknown;
  createdAt:   string;
  user?:       { fullName: string; email: string | null; role: string } | null;
}

export interface AdminAuditStats {
  totalLogs:   number;
  authLogs:    number;
  financeLogs: number;
  hrLogs:      number;
}

export interface AuditLogsResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  logs:       AdminAuditLog[];
}

export const adminAuditApi = {
  getStats: () => apiFetch<AdminAuditStats>('/api/admin/audit-logs/stats'),
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<AuditLogsResponse>(`/api/admin/audit-logs${qs(params)}`),
};

// ── SECURITY CENTER ───────────────────────────────────────────────────────────

export interface AdminSecurityStats {
  activeSessions:   number;
  lockedAccounts:   number;
  failedLogins24h:  number;
  mfaEnabledCount:  number;
  totalUsers:       number;
}

export interface AdminSessionApi {
  id:           string;
  userId:       string;
  userFullName: string;
  userEmail:    string | null;
  userRole:     string;
  deviceInfo:   string;
  ipAddress:    string;
  lastUsedAt:   string;
  createdAt:    string;
  expiresAt:    string;
}

export interface AdminLockedAccountApi {
  id:               string;
  fullName:         string;
  email:            string | null;
  phone:            string | null;
  role:             string;
  accountStatus:    string;
  failedLoginCount: number;
  lockedUntil:      string | null;
  updatedAt:        string;
}

export const adminSecurityApi = {
  getStats: () => apiFetch<AdminSecurityStats>('/api/admin/security/stats'),

  listSessions: (params: Record<string, unknown> = {}) =>
    apiFetch<{ total: number; page: number; limit: number; totalPages: number; sessions: AdminSessionApi[] }>(
      `/api/admin/security/sessions${qs(params)}`
    ),

  revokeSession: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/security/sessions/${id}/revoke`, { method: 'POST' }),

  listLockedAccounts: () =>
    apiFetch<AdminLockedAccountApi[]>('/api/admin/security/locked-accounts'),

  unlockUser: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/security/users/${id}/unlock`, { method: 'POST' }),
};

// ── BACKUP & RECOVERY ────────────────────────────────────────────────────────

export interface AdminBackupStats {
  totalSnapshots:    number;
  totalSizeBytes:    number;
  totalSizeMB:       string;
  lastBackupAt:      string | null;
  maintenanceActive: boolean;
  maintenanceReason?: string;
}

export interface AdminBackupSnapshot {
  id:        string;
  filename:  string;
  type:      'FULL' | 'DATABASE' | 'DOCUMENTS';
  sizeBytes: number;
  status:    'COMPLETED' | 'FAILED';
  createdAt: string;
  createdBy: string;
}

export const adminBackupApi = {
  getStats: () => apiFetch<AdminBackupStats>('/api/admin/backup/stats'),

  listSnapshots: () => apiFetch<AdminBackupSnapshot[]>('/api/admin/backup/snapshots'),

  triggerBackup: (type: 'FULL' | 'DATABASE' | 'DOCUMENTS' = 'FULL') =>
    apiFetch<AdminBackupSnapshot>('/api/admin/backup/trigger', { method: 'POST', body: JSON.stringify({ type }) }),

  getMaintenance: () => apiFetch<{ active: boolean; reason?: string }>('/api/admin/backup/maintenance'),

  setMaintenance: (active: boolean, reason?: string) =>
    apiFetch<{ active: boolean; reason?: string }>('/api/admin/backup/maintenance', { method: 'POST', body: JSON.stringify({ active, reason }) }),
};

// ── SYSTEM CONFIGURATION ──────────────────────────────────────────────────────

export interface SystemConfigData {
  identity: {
    institutionName: string;
    shortName:       string;
    contactEmail:    string;
    supportPhone:    string;
    campusAddress:   string;
    currency:        string;
  };
  academics: {
    academicYear:          string;
    currentSemester:       string;
    maxCreditHours:        number;
    defaultPassingGrade:   string;
    allowLateRegistration: boolean;
    addDropGraceDays:      number;
  };
  financials: {
    defaultCreditHourFee:    number;
    admissionApplicationFee: number;
    paymentGraceDays:        number;
    autoLockUnpaidAccounts:  boolean;
  };
  security: {
    maxLoginAttempts:           number;
    sessionTimeoutMinutes:      number;
    requireMFA:                 boolean;
    allowStaffSelfRegistration: boolean;
  };
  notifications: {
    senderName:        string;
    senderEmail:       string;
    enableEmailNotifs: boolean;
    enableSmsNotifs:   boolean;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export const adminSystemConfigApi = {
  get: () => apiFetch<SystemConfigData>('/api/admin/system-config'),

  update: (data: Partial<SystemConfigData>) =>
    apiFetch<SystemConfigData>('/api/admin/system-config', { method: 'PUT', body: JSON.stringify(data) }),

  resetDefaults: () =>
    apiFetch<SystemConfigData>('/api/admin/system-config/reset', { method: 'POST' }),
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

  delete: (id: string) =>
    apiFetch<ApiDepartment>(`/api/admin/departments/${id}`, { method: 'DELETE' }),
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

  delete: (id: string) =>
    apiFetch<ApiProgram>(`/api/admin/programs/${id}`, { method: 'DELETE' }),
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

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE (admin management & institution-wide analytics)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminAttendanceStats {
  overallRate:        number | null;
  todayRate:          number | null;
  totalRecords:       number;
  present:            number;
  absent:             number;
  late:               number;
  excused:            number;
  totalSessions:      number;
  lowAttendanceCount: number;
}

export interface AdminAttendanceRecordItem {
  id:               string;
  status:           'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  method:           'MANUAL' | 'QR_CODE' | 'SELF_CHECKIN' | 'SYSTEM';
  markedAt:         string;
  markedBy:         string;
  note:             string | null;
  correctedAt:      string | null;
  correctionReason: string | null;
  student: {
    id:         string;
    studentId:  string;
    fullName:   string;
    email:      string | null;
    department: { id: string; name: string; code: string } | null;
    program:    { id: string; name: string; code: string } | null;
  };
  course: { id: string; name: string; code: string };
  instructor: { id: string; fullName: string };
  session: {
    id:             string;
    classSessionId: string;
    date:           string;
    startTime:      string;
    endTime:        string;
    title:          string | null;
    room:           string | null;
  };
}

export interface AdminAttendanceListResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  records:    AdminAttendanceRecordItem[];
}

export interface AdminAttendanceRecordDetail {
  id:               string;
  status:           'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  method:           'MANUAL' | 'QR_CODE' | 'SELF_CHECKIN' | 'SYSTEM';
  markedAt:         string;
  markedBy:         string;
  note:             string | null;
  correctedAt:      string | null;
  correctionReason: string | null;
  student: {
    id:         string;
    studentId:  string;
    userId:     string;
    fullName:   string;
    email:      string | null;
    phone:      string | null;
    department: { id: string; name: string; code: string } | null;
    program:    { id: string; name: string; code: string } | null;
  };
  courseOffering: {
    id:           string;
    course:       { id: string; name: string; code: string };
    instructor:   { id: string; fullName: string; email: string | null } | null;
    department:   { id: string; name: string; code: string } | null;
    academicYear: string;
    semester:     string;
    section:      string;
  };
  session: {
    id:             string;
    classSessionId: string;
    date:           string;
    startTime:      string;
    endTime:        string;
    title:          string | null;
    room:           string | null;
    status:         string;
    lifecycle:      string;
  };
  corrections: {
    id:        string;
    oldStatus: string;
    newStatus: string;
    reason:    string;
    changedBy: string;
    changedAt: string;
  }[];
}

export interface AdminAttendanceTrends {
  period: string;
  trends: { date: string; total: number; present: number; rate: number }[];
  byDepartment: { id: string; name: string; code: string; total: number; present: number; rate: number | null }[];
}

export interface AdminLowAttendanceStudentItem {
  student: {
    id:         string;
    studentId:  string;
    user:       { fullName: string; email: string | null; phone: string | null };
    department: { id: string; name: string; code: string } | null;
    program:    { id: string; name: string; code: string } | null;
  };
  totalSessions:  number;
  present:        number;
  absent:         number;
  late:           number;
  excused:        number;
  attendanceRate: number;
}

export interface AdminLowAttendanceResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  threshold:  number;
  students:   AdminLowAttendanceStudentItem[];
}

export interface AdminStudentAttendanceDetail {
  student: {
    id:         string;
    studentId:  string;
    fullName:   string;
    email:      string | null;
    phone:      string | null;
    department: { id: string; name: string; code: string } | null;
    program:    { id: string; name: string; code: string } | null;
  };
  overallRate:   number | null;
  totalSessions: number;
  present:       number;
  absent:        number;
  late:          number;
  excused:       number;
  courseBreakdown: {
    courseOfferingId: string;
    course:           { id: string; name: string; code: string };
    instructorName:   string;
    totalSessions:    number;
    present:          number;
    absent:           number;
    rate:             number | null;
  }[];
  recentRecords: {
    id:           string;
    status:       string;
    method:       string;
    markedAt:     string;
    note:         string | null;
    course:       { id: string; name: string; code: string };
    sessionDate:  string;
    sessionTitle: string | null;
  }[];
}

export interface AdminCourseAttendanceDetail {
  offering: {
    id:              string;
    course:          { id: string; name: string; code: string };
    department:      { id: string; name: string; code: string } | null;
    instructor:      { id: string; fullName: string } | null;
    academicYear:    string;
    semester:        string;
    section:         string;
    enrollmentCount: number;
  };
  overallRate:  number | null;
  totalRecords: number;
  present:      number;
  absent:       number;
  late:         number;
  excused:      number;
  students: {
    studentId:     string;
    customId:      string;
    fullName:      string;
    email:         string | null;
    totalSessions: number;
    present:       number;
    absent:        number;
    rate:          number | null;
  }[];
  sessions: {
    id:        string;
    date:      string;
    startTime: string;
    endTime:   string;
    title:     string | null;
    room:      string | null;
    status:    string;
    attendanceSession: {
      id:           string;
      lifecycle:    string;
      recordsCount: number;
    } | null;
  }[];
}

export interface AdminDepartmentAttendance {
  id:           string;
  name:         string;
  code:         string;
  totalRecords: number;
  rate:         number | null;
  programs: {
    id:            string;
    name:          string;
    code:          string;
    studentsCount: number;
    totalRecords:  number;
    rate:          number | null;
  }[];
}

export const adminAttendanceApi = {
  getStats: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminAttendanceStats>(`/api/admin/attendance/stats${qs(params)}`),

  listRecords: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminAttendanceListResponse>(`/api/admin/attendance/records${qs(params)}`),

  getRecordDetail: (id: string) =>
    apiFetch<AdminAttendanceRecordDetail>(`/api/admin/attendance/records/${id}`),

  correctRecord: (id: string, newStatus: string, reason: string) =>
    apiFetch<{ id: string; status: string }>(`/api/admin/attendance/records/${id}/correct`, {
      method: 'PATCH',
      body: JSON.stringify({ newStatus, reason }),
    }),

  getTrends: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminAttendanceTrends>(`/api/admin/attendance/trends${qs(params)}`),

  getLowAttendance: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminLowAttendanceResponse>(`/api/admin/attendance/low-attendance${qs(params)}`),

  getStudentDetail: (studentId: string) =>
    apiFetch<AdminStudentAttendanceDetail>(`/api/admin/attendance/students/${studentId}`),

  getCourseDetail: (offeringId: string) =>
    apiFetch<AdminCourseAttendanceDetail>(`/api/admin/attendance/courses/${offeringId}`),

  getDepartmentAnalytics: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminDepartmentAttendance[]>(`/api/admin/attendance/departments${qs(params)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE (admin management & institution-wide financial ledger)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminFinanceStats {
  totalRevenue:        number;
  totalOutstanding:    number;
  totalCredits:        number;
  totalTuitionCharged: number;
  totalFeesCharged:    number;
  totalScholarships:   number;
  totalRefunds:        number;
  clearedCount:        number;
  unclearedCount:      number;
  totalAccounts:       number;
  totalTransactions:   number;
}

export interface AdminFinanceTransactionItem {
  id:              string;
  type:            'TUITION' | 'FEE' | 'SCHOLARSHIP' | 'GRANT' | 'PAYMENT' | 'REFUND' | 'PENALTY';
  amount:          number;
  description:     string;
  category:        string;
  receiptId:       string | null;
  status:          'POSTED' | 'PENDING' | 'REVERSED';
  referenceId:     string | null;
  transactionDate: string;
  createdAt:       string;
  student: {
    id:         string;
    studentId:  string;
    fullName:   string;
    email:      string | null;
    department: { id: string; name: string; code: string } | null;
    program:    { id: string; name: string; code: string } | null;
  };
}

export interface AdminTransactionsListResponse {
  total:        number;
  page:         number;
  limit:        number;
  totalPages:   number;
  transactions: AdminFinanceTransactionItem[];
}

export interface AdminStudentFinancialAccountItem {
  id:              string;
  studentRecordId: string;
  student: {
    id:         string;
    studentId:  string;
    fullName:   string;
    email:      string | null;
    phone:      string | null;
    department: { id: string; name: string; code: string } | null;
    program:    { id: string; name: string; code: string } | null;
  };
  balance:        number;
  clearedForTerm: string | null;
  isCleared:      boolean;
  lastUpdatedAt:  string;
}

export interface AdminStudentAccountsListResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  accounts:   AdminStudentFinancialAccountItem[];
}

export interface AdminStudentFinancialDetail {
  student: {
    id:         string;
    studentId:  string;
    fullName:   string;
    email:      string | null;
    phone:      string | null;
    department: { id: string; name: string; code: string } | null;
    program:    { id: string; name: string; code: string } | null;
  };
  account: {
    id:             string;
    balance:        number;
    clearedForTerm: string | null;
    lastUpdatedAt:  string;
  };
  summary: {
    totalCharges:  number;
    totalPayments: number;
    totalAid:      number;
    balance:       number;
    isCleared:     boolean;
  };
  transactions: {
    id:              string;
    type:            string;
    amount:          number;
    description:     string;
    category:        string;
    receiptId:       string | null;
    status:          string;
    referenceId:     string | null;
    transactionDate: string;
  }[];
}

export interface AdminFinanceTrends {
  period: string;
  trends: { date: string; payments: number; charges: number }[];
}

export const adminFinanceApi = {
  getStats: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminFinanceStats>(`/api/admin/finance/stats${qs(params)}`),

  listTransactions: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminTransactionsListResponse>(`/api/admin/finance/transactions${qs(params)}`),

  postTransaction: (body: {
    studentRecordId: string;
    type: string;
    amount: number;
    description: string;
    category?: string;
    referenceId?: string;
    transactionDate?: string;
  }) =>
    apiFetch<{ transaction: AdminFinanceTransactionItem; accountBalance: number }>(
      '/api/admin/finance/transactions',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),

  reverseTransaction: (id: string, reason: string) =>
    apiFetch<{ transaction: AdminFinanceTransactionItem; accountBalance: number }>(
      `/api/admin/finance/transactions/${id}/reverse`,
      {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }
    ),

  listAccounts: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminStudentAccountsListResponse>(`/api/admin/finance/accounts${qs(params)}`),

  getStudentDetail: (studentId: string) =>
    apiFetch<AdminStudentFinancialDetail>(`/api/admin/finance/accounts/student/${studentId}`),

  updateClearance: (studentId: string, clearedForTerm: string | null) =>
    apiFetch<{ clearedForTerm: string | null }>(
      `/api/admin/finance/accounts/student/${studentId}/clearance`,
      {
        method: 'PATCH',
        body: JSON.stringify({ clearedForTerm }),
      }
    ),

  getTrends: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminFinanceTrends>(`/api/admin/finance/trends${qs(params)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS MODULE
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminDocumentItem {
  id: string;
  title: string;
  category: 'STUDENT_ADMISSION' | 'HR_STAFF' | 'FINANCIAL_RECEIPT' | 'INSTITUTIONAL';
  fileUrl: string | null;
  fileType: string;
  fileSizeLabel?: string;
  entityName: string;
  entityId: string;
  description: string;
  uploadedAt: string;
  metadata?: any;
}

export interface AdminDocumentStats {
  totalDocuments: number;
  studentDocs: number;
  hrDocs: number;
  financialReceipts: number;
  institutionalDocs: number;
}

export interface AdminDocumentsListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  documents: AdminDocumentItem[];
}

export const adminDocumentsApi = {
  getStats: () => apiFetch<AdminDocumentStats>('/api/admin/documents/stats'),
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<AdminDocumentsListResponse>(`/api/admin/documents${qs(params)}`),
};

