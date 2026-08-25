/**
 * Harmony College — Department Head API Client
 * All requests go to /api/department-head/* (proxied to backend).
 * Cookies are sent automatically (credentials: 'include').
 * Silent 401 refresh → redirect to /signin on failure.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch with silent refresh
// ─────────────────────────────────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(r => r.ok)
    .catch(() => false)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = () =>
    fetch(path, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (!refreshed) { window.location.href = '/signin'; return new Promise(() => {}); }
    res = await doFetch();
  }

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
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

const BASE = '/api/department-head';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface HoDProfile {
  id:       string;
  fullName: string;
  email:    string | null;
  phone:    string | null;
  profileCompleted: boolean;
  createdAt: string;
  departmentHeadRecord: {
    id:         string;
    employeeId: string;
    title:      string;
    isActive:   boolean;
    createdAt:  string;
    department: { id: string; name: string; code: string; description: string | null };
  } | null;
}

export interface DashboardKPIs {
  activeFaculty:       number;
  activeStudents:      number;
  activeOfferings:     number;
  pendingOfferings:    number;
  pendingLeaves:       number;
  totalCourses:        number;
  avgGpa:              number;
  attendanceRate:      number;
  capacityUtilization: number;
}

export interface DashboardNotification {
  id:        string;
  title:     string;
  message:   string;
  type:      string;
  isRead:    boolean;
  createdAt: string;
}

export interface DashboardData {
  department:         { id: string };
  kpis:               DashboardKPIs;
  enrollmentTrend:    { semester: string; count: number }[];
  notifications:      DashboardNotification[];
  unreadNotifications: number;
}

export interface TimetableSlot {
  dayOfWeek: number;
  startTime: string;
  endTime:   string;
}

export interface CourseOfferingSummary {
  id:       string;
  status:   string;
  capacity: number;
  section:  string;
  createdAt: string;
  course: {
    id: string; code: string; name: string; creditHours: number;
    prerequisites: { prerequisite: { code: string; name: string } }[];
  };
  semester: {
    id: string; name: string; isCurrent: boolean;
    academicYear: { name: string };
  };
  instructor: {
    id: string; title: string; employeeId: string;
    user: { fullName: string; email: string | null };
  } | null;
  room: { id: string; name: string; building: string; capacity: number } | null;
  timetables:    TimetableSlot[];
  enrolledCount: number;
  utilizationPct: number;
}

export interface CourseOfferingDetail extends Omit<CourseOfferingSummary, 'course'> {
  course: {
    id: string; code: string; name: string; creditHours: number;
    description: string | null; status: string;
    prerequisites: { prerequisite: { id: string; code: string; name: string } }[];
  };
  enrollments: {
    id: string; status: string; enrolledAt: string;
    studentRecord: {
      id: string; studentId: string; gpa: number; yearLevel: number;
      user: { fullName: string };
    };
  }[];
}

export interface OfferingsResponse {
  total: number; page: number; limit: number; totalPages: number;
  offerings: CourseOfferingSummary[];
}

export interface FacultySummary {
  id: string; employeeId: string; title: string; specialization: string | null;
  isActive: boolean; joinedAt: string; fullName: string;
  email: string | null; phone: string | null;
  currentOfferings: number;
}

export interface FacultyResponse {
  total: number; page: number; limit: number; totalPages: number;
  faculty: FacultySummary[];
}

export interface FacultyDetail {
  id: string; employeeId: string; title: string; specialization: string | null;
  isActive: boolean; departmentId: string; createdAt: string;
  user: { fullName: string; email: string | null; phone: string | null };
  offerings: {
    id: string; status: string; capacity: number; section: string;
    course: { code: string; name: string; creditHours: number };
    timetables: TimetableSlot[];
    _count: { enrollments: number };
  }[];
  leaveRequests: {
    id: string; leaveType: string; status: string;
    startDate: string; endDate: string; durationDays: number; createdAt: string;
  }[];
}

export interface StudentSummary {
  id: string; studentId: string; fullName: string; email: string | null;
  program: { id: string; name: string; code: string; totalCredits: number } | null;
  yearLevel: number; gpa: number; totalCredits: number; status: string;
  attendanceRate: number | null; activeEnrollments: number;
}

export interface StudentsResponse {
  total: number; page: number; limit: number; totalPages: number;
  students: StudentSummary[];
}

export interface StudentDetail {
  id: string; studentId: string; yearLevel: number; gpa: number;
  totalCredits: number; status: string; admittedAt: string;
  user: { fullName: string; email: string | null; phone: string | null };
  program: { id: string; name: string; code: string; totalCredits: number } | null;
  attendance: {
    total: number; present: number; absent: number; late: number; excused: number;
    rate: number | null;
  };
  enrollments: {
    id: string; status: string; enrolledAt: string;
    courseOffering: {
      id: string; section: string; status: string;
      course: { code: string; name: string; creditHours: number };
      semester: { name: string; academicYear: { name: string } };
    };
    grade: { letterGrade: string | null; gradePoints: number | null; creditHours: number; gradedAt: string | null } | null;
  }[];
}

export interface LeaveRequestSummary {
  id: string; leaveType: string; startDate: string; endDate: string;
  durationDays: number; reason: string; supportingDocUrl: string | null;
  status: string; dhComment: string | null; dhReviewedAt: string | null;
  hrComment: string | null; hrReviewedAt: string | null;
  createdAt: string; updatedAt: string;
  instructor: {
    id: string; employeeId: string; title: string; specialization: string | null;
    user: { fullName: string; email: string | null };
  };
}

export interface LeaveRequestsResponse {
  total: number; page: number; limit: number; totalPages: number;
  requests: LeaveRequestSummary[];
}

export interface ApiNotification {
  id: string; userId?: string; title: string; message: string; type: string;
  isRead: boolean; entityType?: string | null; entityId?: string | null; createdAt: string;
}

export interface NotificationsResponse {
  total: number; page: number; limit: number; totalPages: number;
  unreadCount: number; notifications: ApiNotification[];
}

export interface AuditLogEntry {
  id: string; action: string; entityType: string; entityId: string;
  description: string; metadata: unknown; ipAddress: string | null;
  createdAt: string; user: { fullName: string };
}

export interface AuditLogResponse {
  total: number; page: number; limit: number; totalPages: number;
  logs: AuditLogEntry[];
}

export interface EnrollmentReport {
  byCourse:  { code: string; name: string; enrolled: number; capacity: number; pct: number }[];
  byProgram: { program: string; count: number }[];
  trend:     { semester: string; count: number }[];
}

export interface AttendanceReport {
  byCourse:    { code: string; name: string; total: number; present: number; rate: number }[];
  lowStudents: { id: string; name: string; studentId: string; rate: number }[];
  weeklyTrend: { week: string; rate: number }[];
}

export interface PerformanceReport {
  avgGpa:       number;
  gpaByProgram: { program: string; avgGpa: number; count: number }[];
  gradeDist:    { grade: string; count: number }[];
  atRiskCount:  number;
}

export interface WorkloadReport {
  instructorId: string; fullName: string; employeeId: string;
  offerings: number; enrolled: number;
}

export interface Semester {
  id: string; name: string; isCurrent: boolean;
  academicYear: { name: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// API NAMESPACES
// ─────────────────────────────────────────────────────────────────────────────

export const hodProfileApi = {
  get: () => apiFetch<HoDProfile>(`${BASE}/profile`),
  update: (data: { title?: string }) =>
    apiFetch<{ id: string; title: string }>(`${BASE}/profile`, { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    apiFetch<{ success: boolean; message: string }>(`${BASE}/settings/password`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const hodDashboardApi = {
  get: () => apiFetch<DashboardData>(`${BASE}/dashboard`),
};

export const hodOfferingsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<OfferingsResponse>(`${BASE}/course-offerings${qs(params)}`),
  get: (id: string) =>
    apiFetch<CourseOfferingDetail>(`${BASE}/course-offerings/${id}`),
  approve: (id: string) =>
    apiFetch<{ id: string; status: string }>(`${BASE}/course-offerings/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason: string) =>
    apiFetch<{ id: string; status: string }>(`${BASE}/course-offerings/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

export const hodFacultyApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<FacultyResponse>(`${BASE}/faculty${qs(params)}`),
  get: (id: string) =>
    apiFetch<FacultyDetail>(`${BASE}/faculty/${id}`),
};

export const hodStudentsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<StudentsResponse>(`${BASE}/students${qs(params)}`),
  get: (id: string) =>
    apiFetch<StudentDetail>(`${BASE}/students/${id}`),
};

export const hodReportsApi = {
  enrollment:  () => apiFetch<EnrollmentReport>(`${BASE}/reports/enrollment`),
  attendance:  () => apiFetch<AttendanceReport>(`${BASE}/reports/attendance`),
  performance: () => apiFetch<PerformanceReport>(`${BASE}/reports/performance`),
  workload:    () => apiFetch<WorkloadReport[]>(`${BASE}/reports/workload`),
};

export const hodLeaveApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<LeaveRequestsResponse>(`${BASE}/leave-requests${qs(params)}`),
  approve: (id: string, comment?: string) =>
    apiFetch<{ id: string; status: string }>(`${BASE}/leave-requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment }) }),
  reject: (id: string, reason: string) =>
    apiFetch<{ id: string; status: string }>(`${BASE}/leave-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

export const hodNotificationsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<NotificationsResponse>(`${BASE}/notifications${qs(params)}`),
  markRead: (id: string) =>
    apiFetch<{ id: string; isRead: boolean }>(`${BASE}/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiFetch<{ updatedCount: number }>(`${BASE}/notifications/read-all`, { method: 'POST' }),
};

export const hodAuditApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<AuditLogResponse>(`${BASE}/audit-log${qs(params)}`),
};

export const hodSemestersApi = {
  list: () => apiFetch<Semester[]>(`${BASE}/semesters`),
};
