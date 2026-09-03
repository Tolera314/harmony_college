/**
 * Typed API client for the Registrar Dashboard.
 * All requests go through /api/registrar/* on the backend (Express).
 * Cookies are sent automatically (credentials: 'include').
 */

const BASE = '';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as any).error ?? `Request failed: ${res.status}`);
  return data as T;
}

// ── Pagination helpers ────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data?: T[];
}

export function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
export interface DashboardStats {
  pendingAdmissions: number;
  activeStudents: number;
  activePrograms: number;
  activeCourses: number;
  activeOfferings: number;
  totalEnrollments: number;
  availableSeats: number;
  scheduleConflicts: number;
  pendingTranscripts: number;
  pendingGraduation: number;
  recentActivity: { id: string; action: string; description: string; entityType: string; actor: string; createdAt: string }[];
  upcomingEvents: { id: string; title: string; eventType: string; startDate: string; endDate: string }[];
}
export const dashboardApi = {
  getStats: () => apiFetch<DashboardStats>('/api/registrar/dashboard'),
};

// ═══════════════════════════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════════════════════════
export interface StudentListItem {
  id: string; studentId: string; status: string; yearLevel: number;
  gpa: number; totalCredits: number; admittedAt: string;
  user: {
    id: string; fullName: string; email: string; phone: string;
    studentProfile?: {
      program?: string | null;
      programType?: string | null;
      shortProgramDuration?: string | null;
      matricResult?: string | null;
      ministryResult?: string | null;
      transcriptUrl?: string | null;
      profilePictureUrl?: string | null;
      nationalId?: string | null;
    } | null;
  };
  program: { id: string; name: string; code: string };
  department: { id: string; name: string; code: string };
  _count: { enrollments: number };
}
export interface StudentListResponse {
  total: number; page: number; limit: number; totalPages: number;
  students: StudentListItem[];
}
export const studentsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<StudentListResponse>(`/api/registrar/students${qs(params)}`),
  getById: (id: string) => apiFetch<StudentListItem & Record<string, any>>(`/api/registrar/students/${id}`),
  updateStatus: (id: string, status: string) =>
    apiFetch(`/api/registrar/students/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMISSIONS
// ═══════════════════════════════════════════════════════════════════════════
export interface Application {
  id: string; fullName: string; status: string; program: string;
  academicYear: string; semester: string; studyMode: string;
  gender: string; dob: string; age: number; nationality: string;
  phone: string; city: string; address: string; emergencyContact: string;
  reviewComment: string | null; reviewedAt: string | null;
  submittedAt: string | null; createdAt: string; updatedAt: string;
  user: { id: string; fullName: string; email: string; phone: string };
  documents: { id: string; type: string; fileUrl: string; uploadedAt: string }[];
}
export interface AdmissionsListResponse {
  total: number; page: number; limit: number; totalPages: number;
  applications: Application[];
}
export const admissionsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<AdmissionsListResponse>(`/api/registrar/admissions${qs(params)}`),
  getById: (id: string) => apiFetch<Application>(`/api/registrar/admissions/${id}`),
  approve: (id: string, comment?: string) =>
    apiFetch(`/api/registrar/admissions/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ comment }) }),
  reject: (id: string, reason: string) =>
    apiFetch(`/api/registrar/admissions/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  requestCorrection: (id: string, comment: string) =>
    apiFetch(`/api/registrar/admissions/${id}/request-correction`, { method: 'PATCH', body: JSON.stringify({ comment }) }),
  addComment: (id: string, comment: string) =>
    apiFetch(`/api/registrar/admissions/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment }) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════════════════════════
export interface CourseItem {
  id: string; code: string; name: string; description: string | null;
  creditHours: number; status: string;
  department: { id: string; name: string; code: string };
  prerequisites: { prerequisite: { id: string; code: string; name: string } }[];
  _count: { offerings: number };
}
export interface CoursesListResponse {
  total: number; page: number; limit: number; totalPages: number;
  courses: CourseItem[];
}
export interface CourseMeta {
  departments: { id: string; name: string; code: string }[];
  programs: { id: string; name: string; code: string; department: { name: string } }[];
}
export const coursesApi = {
  list:    (params: Record<string, unknown> = {}) => apiFetch<CoursesListResponse>(`/api/registrar/courses${qs(params)}`),
  getMeta: () => apiFetch<CourseMeta>('/api/registrar/courses/meta'),
  getById: (id: string) => apiFetch<CourseItem & Record<string, any>>(`/api/registrar/courses/${id}`),
  create:  (data: Record<string, unknown>) => apiFetch(`/api/registrar/courses`, { method: 'POST', body: JSON.stringify(data) }),
  update:  (id: string, data: Record<string, unknown>) => apiFetch(`/api/registrar/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  setStatus: (id: string, status: string) => apiFetch(`/api/registrar/courses/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// COURSE OFFERINGS
// ═══════════════════════════════════════════════════════════════════════════
export interface OfferingItem {
  id: string; capacity: number; section: string; status: string;
  course: { id: string; code: string; name: string; creditHours: number; department: { name: string } };
  semester: { id: string; name: string; academicYear: { name: string } };
  instructor: { id: string; user: { fullName: string } } | null;
  room: { id: string; name: string; building: string; capacity: number } | null;
  timetables: { dayOfWeek: number; startTime: string; endTime: string }[];
  _count: { enrollments: number };
}
export interface OfferingsListResponse {
  total: number; page: number; limit: number; totalPages: number;
  offerings: OfferingItem[];
}
export interface OfferingMeta {
  semesters: { id: string; name: string; isCurrent: boolean; academicYear: { name: string } }[];
  rooms: { id: string; name: string; building: string; capacity: number; roomType: string }[];
  instructors: { id: string; user: { fullName: string }; department: { name: string } }[];
}
export const offeringsApi = {
  list:    (params: Record<string, unknown> = {}) => apiFetch<OfferingsListResponse>(`/api/registrar/offerings${qs(params)}`),
  getMeta: () => apiFetch<OfferingMeta>('/api/registrar/offerings/meta'),
  getById: (id: string) => apiFetch<OfferingItem & Record<string, any>>(`/api/registrar/offerings/${id}`),
  create:  (data: Record<string, unknown>) => apiFetch(`/api/registrar/offerings`, { method: 'POST', body: JSON.stringify(data) }),
  update:  (id: string, data: Record<string, unknown>) => apiFetch(`/api/registrar/offerings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// ENROLLMENTS
// ═══════════════════════════════════════════════════════════════════════════
export interface EnrollmentItem {
  id: string; status: string; enrolledAt: string; droppedAt: string | null;
  isOverride: boolean; overrideReason: string | null;
  studentRecord: {
    id: string; studentId: string;
    user: { fullName: string; email: string };
    program: { name: string; code: string };
  };
  courseOffering: {
    course: { code: string; name: string; creditHours: number };
    semester: { name: string; academicYear: { name: string } };
  };
  grade: { letterGrade: string | null; gradePoints: number | null } | null;
}
export interface EnrollmentsListResponse {
  total: number; page: number; limit: number; totalPages: number;
  enrollments: EnrollmentItem[];
}
export const enrollmentsApi = {
  list:            (params: Record<string, unknown> = {}) => apiFetch<EnrollmentsListResponse>(`/api/registrar/enrollments${qs(params)}`),
  getByStudent:    (studentRecordId: string) => apiFetch<Record<string, any>>(`/api/registrar/enrollments/student/${studentRecordId}`),
  add:             (data: { studentRecordId: string; courseOfferingId: string }) =>
    apiFetch(`/api/registrar/enrollments`, { method: 'POST', body: JSON.stringify(data) }),
  forceAdd:        (data: { studentRecordId: string; courseOfferingId: string; reason: string }) =>
    apiFetch(`/api/registrar/enrollments/force-add`, { method: 'POST', body: JSON.stringify(data) }),
  drop:            (enrollmentId: string, reason?: string) =>
    apiFetch(`/api/registrar/enrollments/${enrollmentId}/drop`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  forceDrop:       (enrollmentId: string, reason: string) =>
    apiFetch(`/api/registrar/enrollments/${enrollmentId}/force-drop`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════
export const auditApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<{ total: number; page: number; limit: number; totalPages: number; logs: Record<string, any>[] }>(`/api/registrar/audit-logs${qs(params)}`),
};

// ═══════════════════════════════════════════════════════════════════════════
// CALENDAR + ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════
export const calendarApi = {
  list:   (params: Record<string, unknown> = {}) => apiFetch<Record<string, any>[]>(`/api/registrar/calendar${qs(params)}`),
  create: (data: Record<string, unknown>) => apiFetch(`/api/registrar/calendar`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/registrar/calendar/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
export const announcementsApi = {
  list:   (params: Record<string, unknown> = {}) => apiFetch<{ total: number; page: number; limit: number; totalPages: number; announcements: Record<string, any>[] }>(`/api/registrar/announcements${qs(params)}`),
  create: (data: Record<string, unknown>) => apiFetch(`/api/registrar/announcements`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/registrar/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// TRANSCRIPTS
// ═══════════════════════════════════════════════════════════════════════════
export const transcriptsApi = {
  list:         (params: Record<string, unknown> = {}) => apiFetch<{ total: number; page: number; limit: number; totalPages: number; requests: Record<string, any>[] }>(`/api/registrar/transcripts${qs(params)}`),
  getStudentData: (studentRecordId: string) => apiFetch<Record<string, any>>(`/api/registrar/transcripts/student/${studentRecordId}`),
  createRequest: (studentRecordId: string, purpose?: string) => apiFetch(`/api/registrar/transcripts/request`, { method: 'POST', body: JSON.stringify({ studentRecordId, purpose }) }),
  approve: (id: string) => apiFetch(`/api/registrar/transcripts/${id}/approve`, { method: 'PATCH' }),
  reject:  (id: string, reason: string) => apiFetch(`/api/registrar/transcripts/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  issue:   (id: string) => apiFetch(`/api/registrar/transcripts/${id}/issue`, { method: 'PATCH' }),
};

// ═══════════════════════════════════════════════════════════════════════════
// GRADUATION
// ═══════════════════════════════════════════════════════════════════════════
export const graduationApi = {
  list:       (params: Record<string, unknown> = {}) => apiFetch<{ total: number; page: number; limit: number; totalPages: number; audits: Record<string, any>[] }>(`/api/registrar/graduation${qs(params)}`),
  runAudit:   (studentRecordId: string) => apiFetch(`/api/registrar/graduation/audit/${studentRecordId}`, { method: 'POST' }),
  approve:    (id: string, notes?: string) => apiFetch(`/api/registrar/graduation/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
  reject:     (id: string, notes?: string) => apiFetch(`/api/registrar/graduation/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATES
// ═══════════════════════════════════════════════════════════════════════════
export const certificatesApi = {
  list:   (params: Record<string, unknown> = {}) => apiFetch<{ total: number; page: number; limit: number; totalPages: number; certificates: Record<string, any>[] }>(`/api/registrar/certificates${qs(params)}`),
  issue:  (studentRecordId: string) => apiFetch(`/api/registrar/certificates/issue`, { method: 'POST', body: JSON.stringify({ studentRecordId }) }),
  revoke: (id: string, reason: string) => apiFetch(`/api/registrar/certificates/${id}/revoke`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════
export const reportsApi = {
  enrollments:       (params: Record<string, unknown> = {}) => apiFetch<Record<string, any>>(`/api/registrar/reports/enrollments${qs(params)}`),
  admissions:        () => apiFetch<Record<string, any>>('/api/registrar/reports/admissions'),
  graduation:        () => apiFetch<Record<string, any>>('/api/registrar/reports/graduation'),
  courseUtilization: (semesterId?: string) => apiFetch<Record<string, any>[]>(`/api/registrar/reports/course-utilization${semesterId ? `?semesterId=${semesterId}` : ''}`),
};

// ═══════════════════════════════════════════════════════════════════════════
// TIMETABLE
// ═══════════════════════════════════════════════════════════════════════════
export type TimetableSlotStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type RoomType = 'CLASSROOM' | 'LAB' | 'LECTURE_HALL' | 'EXAM_HALL' | 'SEMINAR_ROOM';

export interface TimetableSlot {
  id: string;
  courseOfferingId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: TimetableSlotStatus;
  roomId: string | null;
  instructorId: string | null;
  courseOffering: {
    course: { code: string; name: string };
    semester: { name: string; academicYear: { name: string } };
    instructor: { user: { fullName: string } } | null;
    _count?: { enrollments: number };
  };
  room: { building: string; name: string; capacity: number; roomType: RoomType } | null;
}

export interface TimetableConflict {
  type: 'ROOM' | 'INSTRUCTOR';
  dayOfWeek: number;
  slotA: { id: string; courseCode: string; startTime: string; endTime: string };
  slotB: { id: string; courseCode: string; startTime: string; endTime: string };
  resource: string;
}

export interface ConflictCheckResult {
  conflicts: string[];
  hasConflicts: boolean;
}

export const timetableApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<TimetableSlot[]>(`/api/registrar/timetable${qs(params)}`),

  getConflicts: (semesterId?: string) =>
    apiFetch<TimetableConflict[]>(`/api/registrar/timetable/conflicts${semesterId ? `?semesterId=${semesterId}` : ''}`),

  /** Pre-flight conflict check — no DB write (spec §5 "Check Availability") */
  checkConflicts: (data: {
    semesterId: string;
    roomId?: string | null;
    instructorId?: string | null;
    excludeOfferingId?: string;
    timetables: { dayOfWeek: number; startTime: string; endTime: string }[];
  }) => apiFetch<ConflictCheckResult>('/api/registrar/timetable/check-conflicts', {
    method: 'POST', body: JSON.stringify(data),
  }),

  createSlot: (data: Record<string, unknown>) =>
    apiFetch<TimetableSlot>('/api/registrar/timetable', { method: 'POST', body: JSON.stringify(data) }),

  /** Update a slot — reschedule, change room/instructor, change status */
  patchSlot: (id: string, data: {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    roomId?: string | null;
    instructorId?: string | null;
    status?: TimetableSlotStatus;
  }) => apiFetch<TimetableSlot>(`/api/registrar/timetable/${id}`, {
    method: 'PATCH', body: JSON.stringify(data),
  }),

  /** Soft-cancel a slot (sets status → CANCELLED, preserves history) */
  deleteSlot: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/registrar/timetable/${id}`, { method: 'DELETE' }),
};

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
export interface RegistrarProfile {
  id: string; fullName: string; email: string | null;
  phone: string | null; role: string; lastLoginAt: string | null; createdAt: string;
}
export interface SessionItem {
  id: string; deviceInfo: string | null; ipAddress: string | null;
  lastUsedAt: string; createdAt: string; expiresAt: string; isCurrent: boolean;
}
export interface RegistrationSettings {
  semesterId: string | null; semesterName: string | null;
  registrationOpen: boolean;
  registrationStart: string | null; registrationEnd: string | null;
  addDropDeadline: string | null; isCurrent: boolean;
}

export const settingsApi = {
  getProfile:  () => apiFetch<RegistrarProfile>('/api/registrar/settings/profile'),
  updateProfile: (data: { fullName?: string; email?: string; phone?: string }) =>
    apiFetch<RegistrarProfile>('/api/registrar/settings/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    apiFetch('/api/registrar/settings/password', { method: 'POST', body: JSON.stringify(data) }),
  getSessions: () => apiFetch<SessionItem[]>('/api/registrar/settings/sessions'),
  revokeSession: (sessionId: string) =>
    apiFetch(`/api/registrar/settings/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeAllSessions: () =>
    apiFetch('/api/registrar/settings/sessions', { method: 'DELETE' }),
  getRegistration:    () => apiFetch<RegistrationSettings>('/api/registrar/settings/registration'),
  updateRegistration: (data: Record<string, unknown>) =>
    apiFetch('/api/registrar/settings/registration', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════
export interface RegistrarNotification {
  id: string; action: string; description: string;
  entityType: string; actor: string; createdAt: string;
}
export const notificationsApi = {
  list: (limit = 15) =>
    apiFetch<{ total: number; logs: RegistrarNotification[] }>(`/api/registrar/audit-logs?limit=${limit}`),
  markAllRead: () => Promise.resolve({ success: true }), // audit logs don't have read state; UI resets badge
};

// ── Registrar in-app notification inbox (Notification table, userId-scoped) ──
export const registrarNotifApi = {
  list:        (params: Record<string, unknown> = {}) =>
    apiFetch<{ total: number; page: number; limit: number; totalPages: number; unreadCount: number; notifications: { id: string; title: string; message: string; type: string; isRead: boolean; actionTab: string | null; entityType: string | null; entityId: string | null; createdAt: string }[] }>(`/api/registrar/notifications${qs(params)}`),
  markRead:    (id: string) =>
    apiFetch<{ id: string; isRead: boolean }>(`/api/registrar/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiFetch<{ updatedCount: number }>('/api/registrar/notifications/read-all', { method: 'POST' }),
};

// ═══════════════════════════════════════════════════════════════════════════
// GRADE SCALE (registrar-managed)
// ═══════════════════════════════════════════════════════════════════════════
export interface GradeScaleEntry {
  id: string; letterGrade: string; gradePoints: number;
  description: string | null; isPassing: boolean; isActive: boolean; displayOrder: number;
}
export const gradeScaleApi = {
  list:   () => apiFetch<GradeScaleEntry[]>('/api/registrar/grade-scale'),
  create: (data: { letterGrade: string; gradePoints: number; description?: string; isPassing?: boolean; displayOrder?: number }) =>
    apiFetch<GradeScaleEntry>('/api/registrar/grade-scale', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<GradeScaleEntry, 'gradePoints' | 'description' | 'isPassing' | 'isActive' | 'displayOrder'>>) =>
    apiFetch<GradeScaleEntry>(`/api/registrar/grade-scale/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) =>
    apiFetch<GradeScaleEntry>(`/api/registrar/grade-scale/${id}`, { method: 'DELETE' }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DEPARTMENTS & ASSIGN INSTRUCTOR
// ═══════════════════════════════════════════════════════════════════════════
export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  _count?: {
    courses: number;
    instructors: number;
  };
}

export interface DepartmentStructureResponse {
  department: DepartmentItem;
  semesters: { id: string; name: string; isCurrent: boolean; academicYear?: { name: string } }[];
  selectedSemesterId?: string;
  courses: {
    id: string;
    code: string;
    name: string;
    creditHours: number;
    description: string | null;
    offeringId: string | null;
    instructorId: string | null;
    instructor: {
      id: string;
      title: string;
      user: { id: string; fullName: string; email: string; avatarUrl: string | null };
    } | null;
    capacity: number;
    section: string;
    status: string;
  }[];
  instructors: {
    id: string;
    title: string;
    specialization: string | null;
    user: { id: string; fullName: string; email: string; avatarUrl: string | null };
    department: { id: string; name: string; code: string };
  }[];
}

export const departmentsApi = {
  list: () => apiFetch<DepartmentItem[]>('/api/registrar/departments'),
  create: (data: { name: string; code: string; description?: string }) =>
    apiFetch<DepartmentItem>('/api/registrar/departments', { method: 'POST', body: JSON.stringify(data) }),
  toggleStatus: (id: string) =>
    apiFetch<DepartmentItem>(`/api/registrar/departments/${id}/toggle-status`, { method: 'PATCH' }),
  getStructure: (id: string, semesterId?: string) =>
    apiFetch<DepartmentStructureResponse>(`/api/registrar/departments/${id}/structure${semesterId ? `?semesterId=${semesterId}` : ''}`),
  addCourse: (departmentId: string, data: { code: string; name: string; creditHours: number; description?: string; semesterId?: string; instructorId?: string | null }) =>
    apiFetch<any>(`/api/registrar/departments/${departmentId}/courses`, { method: 'POST', body: JSON.stringify(data) }),
  assignInstructor: (data: { courseId: string; semesterId: string; instructorId: string | null }) =>
    apiFetch<any>('/api/registrar/offerings/assign-instructor', { method: 'POST', body: JSON.stringify(data) }),
};

