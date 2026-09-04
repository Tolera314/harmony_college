/**
 * Typed API client for the Instructor Dashboard.
 * All requests go to /api/instructor/* (proxied by Next.js to the backend).
 * Cookies are sent automatically (credentials: 'include').
 * Silent token-refresh on 401, redirect to /signin on failure.
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
    if (!refreshed) {
      window.location.href = '/signin';
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

const BASE = '/api/instructor';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface InstructorProfileData {
  id:             string;
  userId:         string;
  employeeId:     string;
  title:          string;
  specialization: string | null;
  isActive:       boolean;
  fullName:       string;
  email:          string | null;
  phone:          string | null;
  department:     { id: string; name: string; code: string };
  createdAt:      string;
}

export interface DashboardKPIs {
  classesToday:        number;
  studentsTaught:      number;
  activeSessions:      number;
  pendingAssignments:  number;
  ungradedSubmissions: number;
  upcomingClasses:     number;
  currentOfferings:    number;
  totalOfferings:      number;
}

export interface TodaySession {
  id:                          string;
  courseCode:                  string;
  courseName:                  string;
  room:                        string;
  startTime:                   string;
  endTime:                     string;
  date:                        string;
  attendanceSessionId:         string | null;
  attendanceSessionLifecycle:  string | null;
  courseOfferingId:            string;
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
  instructor:          InstructorProfileData & { department: { id: string; name: string; code: string } };
  academicContext?: {
    activeProgramType: 'TVET' | 'SHORT_PROGRAM';
    hasTVET: boolean;
    hasShortProgram: boolean;
  };
  kpis:                DashboardKPIs;
  todaySessions:       TodaySession[];
  attendanceTrend:     number[];
  notifications:       DashboardNotification[];
  unreadNotifications: number;
}

export interface ScheduleSlot {
  id:              string;
  dayOfWeek:       number;
  dayName:         string;
  startTime:       string;
  endTime:         string;
  courseCode:      string;
  courseName:      string;
  section:         string;
  room:            string;
  building:        string;
  semester:        string;
  academicYear:    string;
  isCurrent:       boolean;
  courseOfferingId: string;
}

export interface ClassOffering {
  id:       string;
  section:  string;
  status:   string;
  capacity: number;
  enrolled: number;
  submissionStatus?: 'PUBLISHED' | 'SUBMITTED' | 'IN_PROGRESS' | 'PENDING';
  submittedCount?: number;
  programType?: 'TVET' | 'SHORT_PROGRAM';
  shortProgramDuration?: string | null;
  department?: { id: string; name: string };
  course: {
    id:          string;
    code:        string;
    name:        string;
    description: string | null;
    creditHours: number;
  };
  semester: {
    id:          string;
    name:        string;
    isCurrent:   boolean;
    startDate:   string;
    endDate:     string;
    academicYear: string;
  };
  room: { name: string; building: string; capacity: number } | null;
  schedule: { day: string; startTime: string; endTime: string }[];
  stats: { assignments: number; quizzes: number };
}

export interface RosterStudent {
  enrollmentId:      string;
  enrollmentStatus:  string;
  enrolledAt:        string;
  studentRecordId:   string;
  studentId:         string;
  fullName:          string;
  email:             string | null;
  phone:             string | null;
  program:           { name: string; code: string } | null;
  gpa:               number;
  yearLevel:         number;
  attendanceRate:    number | null;
  attendanceSessions: number;
}

export interface RosterResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  students:   RosterStudent[];
}

export interface StudentAcademicView {
  student: {
    studentId: string;
    fullName:  string;
    email:     string | null;
    program:   { name: string; code: string } | null;
    yearLevel: number;
    gpa:       number;
  };
  enrollment: { id: string; status: string; enrolledAt: string };
  attendance: {
    total:   number;
    present: number;
    absent:  number;
    late:    number;
    excused: number;
    rate:    number | null;
    records: { date: string; status: string; method: string; markedAt: string }[];
  };
  submissions: {
    assignmentTitle: string;
    totalPoints:     number;
    submittedAt:     string;
    status:          string;
    score:           number | null;
    feedback:        string | null;
  }[];
  quizAttempts: {
    quizTitle:       string;
    totalPoints:     number;
    score:           number | null;
    percentageScore: number | null;
    status:          string;
    startedAt:       string;
    submittedAt:     string | null;
  }[];
}

export interface AssignmentSummary {
  id:              string;
  title:           string;
  description:     string;
  instructions:    string;
  dueDate:         string;
  totalPoints:     number;
  status:          string;
  allowLateSubmit: boolean;
  courseCode:      string;
  courseName:      string;
  courseOfferingId: string;
  createdAt:       string;
  submissionCount: number;
  attachmentCount: number;
}

export interface AssignmentDetail extends Omit<AssignmentSummary, 'submissionCount' | 'attachmentCount'> {
  attachments: { id: string; fileName: string; fileUrl: string; fileSize: string; fileType: string }[];
  submissions: {
    id:          string;
    studentName: string;
    studentId:   string;
    status:      string;
    submittedAt: string;
    score:       number | null;
    feedback:    string | null;
    gradedAt:    string | null;
    isLate:      boolean;
    fileUrl?:    string | null;
    fileName?:   string | null;
    fileSize?:   string | null;
    textContent?: string | null;
  }[];
  stats: { total: number; ungraded: number; graded: number; submitted: number };
}

export interface QuizSummary {
  id:              string;
  title:           string;
  description:     string | null;
  durationMinutes: number;
  availableFrom:   string;
  availableUntil:  string;
  passingScore:    number;
  maxAttempts:     number;
  totalPoints:     number;
  status:          string;
  courseOffering:  { course: { code: string; name: string } };
  _count:          { questions: number; attempts: number };
}

export interface CourseGradeEntry {
  enrollmentId:    string;
  studentRecordId: string;
  studentId:       string;
  fullName:        string;
  gpa:             number;
  creditHours?:    number;
  ects?:           number;
  gradeStatus?:    'DRAFT' | 'SUBMITTED' | 'PUBLISHED';
  currentGrade: {
    assignmentMarks?: number | null;
    quizMarks?:       number | null;
    midExamMarks?:    number | null;
    finalExamMarks?:  number | null;
    attendanceMarks?: number | null;
    otherMarks?:      number | null;
    finalMark?:       number | null;
    letterGrade:      string;
    gradePoints:      number;
    creditHours:      number;
    ects?:            number;
    qualityPoints?:   number;
    status?:          'DRAFT' | 'SUBMITTED' | 'PUBLISHED';
    submittedAt?:     string | null;
    publishedAt?:     string | null;
    gradedAt:         string;
  } | null;
}

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
  unreadCount:   number;
  notifications: ApiNotification[];
}

export interface AuditLogEntry {
  id:          string;
  userId:      string;
  action:      string;
  entityType:  string;
  entityId:    string;
  description: string;
  metadata:    unknown;
  ipAddress:   string | null;
  createdAt:   string;
}

export interface AuditLogResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  logs:       AuditLogEntry[];
}

export interface AttendanceReportResponse {
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
  overallRate: number;
  records:     {
    id:              string;
    status:          string;
    method:          string;
    markedAt:        string;
    studentRecord:   { studentId: string; user: { fullName: string }; program: { name: string } };
    attendanceSession: {
      lifecycle: string;
      classSession: { date: string; startTime: string; endTime: string };
    };
  }[];
}

export interface LowAttendanceStudent {
  studentRecordId: string;
  studentId:       string;
  fullName:        string;
  rate:            number;
  total:           number;
  present:         number;
  absent:          number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API NAMESPACES
// ─────────────────────────────────────────────────────────────────────────────

export const instructorProfileApi = {
  get: () =>
    apiFetch<InstructorProfileData>(`${BASE}/profile`),

  update: (data: { title?: string; specialization?: string }) =>
    apiFetch<InstructorProfileData>(`${BASE}/profile`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    apiFetch<{ success: boolean; message: string }>(`${BASE}/settings/password`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
};

export const instructorDashboardApi = {
  get: (programType?: 'TVET' | 'SHORT_PROGRAM') =>
    apiFetch<DashboardData>(`${BASE}/dashboard${programType ? `?programType=${programType}` : ''}`),
};

export const instructorClassesApi = {
  list: (programType?: 'TVET' | 'SHORT_PROGRAM') =>
    apiFetch<ClassOffering[]>(`${BASE}/classes${programType ? `?programType=${programType}` : ''}`),

  timetable: () =>
    apiFetch<ScheduleSlot[]>(`${BASE}/timetable`),

  getRoster: (offeringId: string, params: Record<string, unknown> = {}) =>
    apiFetch<RosterResponse>(`${BASE}/classes/${offeringId}/roster${qs(params)}`),

  getStudentView: (offeringId: string, studentRecordId: string) =>
    apiFetch<StudentAcademicView>(`${BASE}/classes/${offeringId}/student/${studentRecordId}`),

  getCourseGrades: (offeringId: string) =>
    apiFetch<CourseGradeEntry[]>(`${BASE}/classes/${offeringId}/grades`),

  submitCourseGrade: (offeringId: string, enrollmentId: string, data: { letterGrade: string; gradePoints: number }) =>
    apiFetch<CourseGradeEntry>(`${BASE}/classes/${offeringId}/grades/${enrollmentId}`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  saveAssessmentGrade: (
    offeringId: string,
    enrollmentId: string,
    marks: {
      assignment?: number | null;
      quiz?: number | null;
      midExam?: number | null;
      finalExam?: number | null;
      attendance?: number | null;
    }
  ) =>
    apiFetch<CourseGradeEntry>(`${BASE}/classes/${offeringId}/grades/${enrollmentId}/assessments`, {
      method: 'POST',
      body: JSON.stringify(marks),
    }),

  saveBatchAssessments: (
    offeringId: string,
    entries: Array<{
      enrollmentId: string;
      breakdown: {
        assignment?: number | null;
        quiz?: number | null;
        midExam?: number | null;
        finalExam?: number | null;
        attendance?: number | null;
      };
    }>
  ) =>
    apiFetch<{ count: number }>(`${BASE}/classes/${offeringId}/grades/batch-assessments`, {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),

  submitGradesToRegistrar: (offeringId: string) =>
    apiFetch<{ count: number; message: string }>(`${BASE}/classes/${offeringId}/grades/submit-to-registrar`, {
      method: 'POST',
    }),

  getGradeEditingStatus: () =>
    apiFetch<{ isOpen: boolean }>(`${BASE}/grade-editing-status`),

  getAttendanceReport: (offeringId: string, params: Record<string, unknown> = {}) =>
    apiFetch<AttendanceReportResponse>(`${BASE}/classes/${offeringId}/attendance/report${qs(params)}`),

  getLowAttendance: (offeringId: string, threshold?: number) =>
    apiFetch<LowAttendanceStudent[]>(
      `${BASE}/classes/${offeringId}/attendance/low${threshold ? `?threshold=${threshold}` : ''}`,
    ),
};

export const instructorAssignmentsApi = {
  list: (courseOfferingId?: string) =>
    apiFetch<AssignmentSummary[]>(`${BASE}/assignments${courseOfferingId ? `?courseOfferingId=${courseOfferingId}` : ''}`),

  get: (id: string) =>
    apiFetch<AssignmentDetail>(`${BASE}/assignments/${id}`),

  create: (data: {
    courseOfferingId: string;
    title: string;
    description: string;
    instructions: string;
    dueDate: string;
    totalPoints?: number;
    allowLateSubmit?: boolean;
    attachments?: Array<{ name: string; size: number | string; url: string; type?: string }>;
  }) =>
    apiFetch<AssignmentSummary>(`${BASE}/assignments`, { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<AssignmentSummary>(`${BASE}/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<{ id: string }>(`${BASE}/assignments/${id}`, { method: 'DELETE' }),

  gradeSubmission: (submissionId: string, data: { score: number; feedback?: string; letterGrade?: string }) =>
    apiFetch<unknown>(`${BASE}/submissions/${submissionId}/grade`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
};

export const instructorQuizzesApi = {
  list: (courseOfferingId?: string) =>
    apiFetch<QuizSummary[]>(`${BASE}/quizzes${courseOfferingId ? `?courseOfferingId=${courseOfferingId}` : ''}`),

  get: (id: string) =>
    apiFetch<unknown>(`${BASE}/quizzes/${id}`),

  create: (data: {
    courseOfferingId: string;
    title: string;
    description?: string;
    instructions?: string;
    availableFrom: string;
    availableUntil: string;
    durationMinutes?: number;
    passingScore?: number;
    maxAttempts?: number;
    totalPoints?: number;
    showResultsImmediately?: boolean;
    shuffleQuestions?: boolean;
    questions?: Array<{
      questionText: string;
      type: string;
      points?: number;
      options?: Array<{ text: string; isCorrect?: boolean }>;
    }>;
  }) =>
    apiFetch<QuizSummary>(`${BASE}/quizzes`, { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<QuizSummary>(`${BASE}/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const instructorNotificationsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<NotificationsResponse>(`${BASE}/notifications${qs(params)}`),

  markRead: (id: string) =>
    apiFetch<ApiNotification>(`${BASE}/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch<{ updatedCount: number }>(`${BASE}/notifications/read-all`, { method: 'POST' }),
};

export const instructorAuditApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiFetch<AuditLogResponse>(`${BASE}/audit-log${qs(params)}`),
};
