/**
 * Typed API client for the Student Dashboard.
 * All requests hit /api/student/dashboard/* via Next.js proxy → Express backend.
 * Cookies (httpOnly accessToken) are forwarded automatically.
 */

const BASE = '/api/student/dashboard';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as any).error ?? `Request failed: ${res.status}`);
  return data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StudentKPIs {
  gpa: number;
  completedCredits: number;
  totalRequiredCredits: number;
  attendanceRate: number;
  accountBalance: number;
  clearedForTerm: string | null;
  pendingAssignments: number;
  isGraduationEligible: boolean;
}

export interface TimetableSlot {
  id: string;
  time: string;
  title: string;
  courseCode: string;
  location: string;
}

export interface DashboardData {
  student: {
    studentId: string; fullName: string; email: string | null; phone: string | null;
    program: string; programCode: string; department: string;
    yearLevel: number; status: string; admittedAt: string;
  };
  kpis: StudentKPIs;
  courses: CourseListItem[];
  todayTimetable: TimetableSlot[];
  announcements: { id: string; title: string; content: string; priority: string; publishedAt: string | null }[];
  upcomingEvents: { id: string; title: string; eventType: string; startDate: string; endDate: string }[];
}

export interface CourseListItem {
  enrollmentId: string; offeringId: string; courseId: string;
  code: string; name: string; description: string | null; creditHours: number;
  instructor: { name: string; title: string; email: string | null } | null;
  room: string | null;
  timetables: { dayOfWeek: number; startTime: string; endTime: string }[];
  semester: string;
  currentGrade: string | null; attendanceRate: number; progress: number;
  nextAssignment: { id: string; title: string; dueDate: string } | null;
}

export interface CourseDetail {
  enrollmentId: string; offeringId: string; courseId: string;
  code: string; name: string; description: string | null; creditHours: number;
  instructor: { name: string; title: string; email: string | null; specialization: string | null } | null;
  room: { name: string; building: string } | string | null;
  timetables: { dayOfWeek: number; startTime: string; endTime: string }[];
  semester: { name: string; academicYear: string; startDate: string; endDate: string } | string;
  currentGrade: string | null; attendanceRate: number; progress: number;
  nextAssignment: { id: string; title: string; dueDate: string } | null;
  course: {
    code: string; name: string; description: string | null; creditHours: number;
    department: string;
    prerequisites: { code: string; name: string }[];
  };
  grade: { letterGrade: string | null; gradePoints: number | null; gradedAt: string | null } | null;
  attendanceSummary: { total: number; present: number; absent: number; late: number };
  assignments: AssignmentItem[];
  quizzes: QuizItem[];
  enrollmentStatus?: string;
  enrolledAt?: string;
  courseOffering?: { id: string; section: string; status: string };
}

export interface AssignmentItem {
  id: string; title: string; description: string; instructions: string;
  dueDate: string; totalPoints: number; allowLateSubmit: boolean;
  isPastDue: boolean; isDueSoon: boolean;
  courseCode: string; courseName: string; courseOfferingId: string;
  instructor: string | null;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  attachments: { name: string; size: string; type: string; url: string }[];
  submission: {
    id: string; status: string; submittedAt: string;
    score: number | null; letterGrade: string | null;
    feedback: string | null; fileName: string | null;
    fileUrl: string | null; textContent: string | null; gradedAt: string | null;
  } | null;
}

export interface QuizQuestion {
  id: string; type: string; questionText: string; points: number;
  options: { id: string; text: string }[];
}

export interface QuizItem {
  id: string; title: string; description: string | null; instructions: string | null;
  durationMinutes: number; availableFrom: string; availableUntil: string;
  passingScore: number; maxAttempts: number; totalPoints: number;
  showResultsImmediately: boolean; questionCount: number;
  questions: QuizQuestion[];
  attempt: {
    id: string; status: string; startedAt: string; submittedAt: string | null;
    score: number | null; percentageScore: number | null; isPassing: boolean | null;
    feedback: string | null; answers: Record<string, string>;
  } | null;
}

export interface GradeRecord {
  id: string;
  courseCode: string;
  courseTitle: string;
  term: string;
  semester: string;
  academicYear: string;
  credits: number;
  creditHours?: number;
  ects?: number;
  finalMark?: number | null;
  grade: string;
  gradePoints: number;
  numericGpa?: number;
  qualityPoints?: number;
  instructor: string;
  status?: string;
  gradedAt: string | null;
}

export interface TermSummary {
  term: string;
  academicYear: string;
  semester: string;
  yearLevelLabel: string;
  courses: GradeRecord[];
  totalEcts: number;
  totalQualityPoints: number;
  semesterGpa: number;
}

export interface GradeHistory {
  records: GradeRecord[];
  termSummaries: TermSummary[];
  academicSummary?: {
    totalEcts: number;
    totalQualityPoints: number;
    cgpa: number;
  };
  cumulativeGPA: number;
  totalCredits: number;
  isGradePortalOpen?: boolean;
}

export interface FinancialSummary {
  balance: number; clearedForTerm: string | null;
  totalFinancialAid: number; lastUpdatedAt: string;
  feeStatement: { description: string; amount: number }[];
  transactions: {
    id: string; date: string; description: string; category: string;
    type: string; amount: number; status: string; receiptId: string | null;
  }[];
}

export interface DegreeAudit {
  student: { fullName: string; studentId: string; program: string; department: string; yearLevel: number };
  degree: { name: string; totalCredits: number; durationYears: number };
  progress: { completedCredits: number; totalRequired: number; completionPercentage: number; cumulativeGPA: number; isEligible: boolean };
  milestones: { label: string; description: string; met: boolean }[];
  categories: {
    title: string; category: string; requiredCredits: number; completedCredits: number; minimumGPA: number;
    courses: { code: string; title: string; credits: number; status: string; grade?: string }[];
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API methods
// ─────────────────────────────────────────────────────────────────────────────

export const studentDashApi = {
  // Dashboard
  getDashboard: () => apiFetch<DashboardData>('/'),

  // Courses
  getCourses:      ()           => apiFetch<CourseDetail[]>('/courses'),
  getCourse:       (offeringId: string) => apiFetch<CourseDetail>(`/courses/${offeringId}`),

  // Assignments
  getAssignments: (params?: { status?: string; courseOfferingId?: string; upcoming?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.status)           q.set('status', params.status);
    if (params?.courseOfferingId) q.set('courseOfferingId', params.courseOfferingId);
    if (params?.upcoming)         q.set('upcoming', 'true');
    const qs = q.toString();
    return apiFetch<AssignmentItem[]>(`/assignments${qs ? `?${qs}` : ''}`);
  },
  getAssignment: (id: string) => apiFetch<any>(`/assignments/${id}`),
  submitAssignment: (id: string, data: { fileUrl?: string; fileName?: string; fileSize?: string; textContent?: string }) =>
    apiFetch(`/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),

  // Quizzes
  getQuizzes:      (courseOfferingId: string) => apiFetch<QuizItem[]>(`/quizzes/${courseOfferingId}`),
  startQuiz:       (quizId: string)           => apiFetch<{ attemptId: string; questions: QuizQuestion[]; durationMinutes: number }>(`/quizzes/${quizId}/start`, { method: 'POST' }),
  saveAnswer:      (attemptId: string, questionId: string, answer: string) =>
    apiFetch(`/quizzes/attempts/${attemptId}/answer`, { method: 'POST', body: JSON.stringify({ questionId, answer }) }),
  submitQuiz:      (attemptId: string) => apiFetch(`/quizzes/attempts/${attemptId}/submit`, { method: 'POST' }),
  getQuizResult:   (attemptId: string) => apiFetch<any>(`/quizzes/attempts/${attemptId}/result`),

  // Grades
  getGrades:    () => apiFetch<GradeHistory>('/grades'),
  getTranscript:() => apiFetch<any>('/transcript'),

  // Financials
  getFinancials: () => apiFetch<FinancialSummary>('/financials'),
  processPayment: (data: { amount: number; cardLastFour?: string; cardHolder?: string }) =>
    apiFetch<{ receiptId: string; amount: number; newBalance: number; isCleared: boolean }>('/financials/pay', { method: 'POST', body: JSON.stringify(data) }),

  // Degree audit
  getDegreeAudit: () => apiFetch<DegreeAudit>('/degree-audit'),

  // Timetable — full weekly schedule (spec §12)
  getTimetable: () => apiFetch<{
    slots: {
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      status: string;
      courseOffering: {
        id: string;
        course: { code: string; name: string; creditHours: number };
        instructor: { user: { fullName: string } } | null;
        room: { name: string; building: string; roomType: string } | null;
        semester: { name: string; academicYear: { name: string } };
      };
    }[];
    offeringIds: string[];
  }>('/timetable'),

  // Support / Appointments
  getAppointments: ()      => apiFetch<any[]>('/support/appointments'),
  bookAppointment: (data: { topic: string; requestedDate: string; requestedTime: string; advisorUserId?: string }) =>
    apiFetch('/support/appointments', { method: 'POST', body: JSON.stringify(data) }),
  cancelAppointment: (id: string) => apiFetch(`/support/appointments/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings:     () => apiFetch<any>('/settings'),
  updateProfile:   (data: { fullName?: string; phone?: string; email?: string }) =>
    apiFetch('/settings/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  updateNotifications: (data: Record<string, boolean>) =>
    apiFetch('/settings/notifications', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    apiFetch('/settings/password', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: ()      => apiFetch<any[]>('/notifications'),
  markNotifRead:    (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead:      ()      => apiFetch('/notifications/mark-all-read', { method: 'POST' }),

  // Announcements
  getAnnouncements: () => apiFetch<any[]>('/announcements'),
};
