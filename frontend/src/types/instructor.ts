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
  | 'assignments'
  | 'quizzes'
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

// ── Quizzes ───────────────────────────────────────────────────────────────────

export type InstructorQuizQuestionType = 'MCQ' | 'TrueFalse' | 'FillBlank' | 'Matching' | 'ShortAnswer' | 'Essay';

export interface InstructorQuizQuestion {
  id: string;
  type: InstructorQuizQuestionType;
  questionText: string;
  options?: string[]; // for MCQ/Matching
  correctAnswer?: string; // or multiple, just a string for mock
  points: number;
}

export interface InstructorQuizAttempt {
  id: string;
  studentId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  startedAt: string;
  submittedAt?: string;
  score?: number;
  answers: Record<string, string>; // questionId -> answer
  feedback?: string;
  // For manual grading:
  needsManualGrading?: boolean;
}

export interface InstructorQuiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  instructions: string;
  durationMinutes: number;
  availableDate: string;
  closingDate: string;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResultsImmediately: boolean;
  status: 'Draft' | 'Published' | 'Closed';
  questions: InstructorQuizQuestion[];
  attempts: InstructorQuizAttempt[];
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

// ── Assignment Workflow ───────────────────────────────────────────────────────
export type SubmissionType = 'File Upload' | 'Text' | 'Both';
export type AssignmentStatus = 'Draft' | 'Published' | 'Closed';
export type SubmissionStatus = 'Not Submitted' | 'Submitted' | 'Late' | 'Graded' | 'Resubmitted';

export interface AssignmentAttachment {
  name: string;
  size: string;
  type: 'PDF' | 'DOCX' | 'ZIP' | 'MP4' | 'Other';
}

export interface LMSAssignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;          // ISO-like string, e.g. 'Aug 20, 2024 23:59'
  maxMarks: number;
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  submissionType: SubmissionType;
  allowLateSubmission: boolean;
  allowResubmission: boolean;
  attachments: AssignmentAttachment[];
  status: AssignmentStatus;
  createdAt: string;
  publishedAt?: string;
  totalSubmissions: number;
  gradedCount: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  status: SubmissionStatus;
  fileAttachments: AssignmentAttachment[];
  textAnswer?: string;
  score?: number;
  feedback?: string;
  gradedAt?: string;
  isLate: boolean;
}
