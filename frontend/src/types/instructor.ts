// ─────────────────────────────────────────────────────────────────────────────
// Instructor Dashboard — Type Definitions
// Instructor = Dr. Marcus Vance (f01), teaching FILM402 + FILM301
// ─────────────────────────────────────────────────────────────────────────────

export type InstructorNavTab =
  | 'overview'
  | 'my_classes'
  | 'attendance'
  | 'students'
  | 'grades'
  | 'materials'
  | 'announcements'
  | 'reports'
  | 'notifications'
  | 'audit_log'
  | 'settings';

// ── Instructor Profile ────────────────────────────────────────────────────────
export interface InstructorProfile {
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  officeRoom: string;
  avatar: string;
  employeeId: string;
  academicYear: string;
  currentSemester: string;
  specialization: string;
}

// ── Today's Schedule ──────────────────────────────────────────────────────────
export interface ScheduleClass {
  courseId: string;
  startTime: string;
  endTime: string;
  room: string;
  building: string;
  duration: string;
  isNow: boolean;
  isNext: boolean;
}

// ── Attendance ────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Excused';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  markedAt?: string;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  qrCode: string;
  records: AttendanceRecord[];
}

// ── Grade ─────────────────────────────────────────────────────────────────────
export type AssessmentType = 'Assignment' | 'Quiz' | 'Midterm' | 'Final' | 'Participation' | 'Project';
export type GradeStatus = 'Draft' | 'Submitted' | 'Published' | 'Pending';

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  type: AssessmentType;
  maxScore: number;
  weight: number; // percentage of final grade
  dueDate: string;
  status: GradeStatus;
}

export interface GradeEntry {
  id: string;
  studentId: string;
  assessmentId: string;
  score: number | null;
  remarks?: string;
  status: GradeStatus;
  updatedAt: string;
}

// ── Course Material ───────────────────────────────────────────────────────────
export type MaterialType = 'PDF' | 'Slides' | 'Assignment' | 'Video' | 'Reference' | 'Syllabus';
export type MaterialVisibility = 'Published' | 'Draft' | 'Scheduled';

export interface CourseMaterial {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: MaterialType;
  fileSize: string;
  downloads: number;
  visibility: MaterialVisibility;
  uploadedAt: string;
  scheduledAt?: string;
}

// ── Announcement ──────────────────────────────────────────────────────────────
export type AnnouncementAudience = 'All Courses' | 'FILM402' | 'FILM301';
export type AnnouncementStatus = 'Published' | 'Draft' | 'Scheduled' | 'Pinned';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  publishedAt: string;
  views: number;
  isPinned: boolean;
}

// ── Instructor Notification ───────────────────────────────────────────────────
export type InstructorNotifType = 'grade' | 'attendance' | 'schedule' | 'enrollment' | 'announcement' | 'system';

export interface InstructorNotification {
  id: string;
  type: InstructorNotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  tab: InstructorNavTab;
}

// ── Instructor Audit Log ──────────────────────────────────────────────────────
export interface InstructorAuditEntry {
  id: string;
  date: string;
  action: string;
  course: string;
  student?: string;
  description: string;
  status: 'Success' | 'Warning' | 'Failed';
}

// ── Clock In/Out ──────────────────────────────────────────────────────────────
export interface ClockEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  hoursWorked?: number;
  status: 'Active' | 'Completed';
}
