// ─────────────────────────────────────────────────────────────────────────────
// Department Head Dashboard — Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type DHNavTab =
  | 'overview'
  | 'courses'
  | 'faculty'
  | 'students'
  | 'approvals'
  | 'reports'
  | 'attendance'
  | 'leave_requests'
  | 'notifications'
  | 'audit_log'
  | 'settings';

// ── Department Head Profile ────────────────────────────────────────────────────
export interface DHProfile {
  name: string;
  title: string;
  department: string;
  college: string;
  email: string;
  phone: string;
  officeRoom: string;
  avatar: string;
  employeeId: string;
  academicYear: string;
  currentSemester: string;
}

// ── Faculty ────────────────────────────────────────────────────────────────────
export type FacultyRank =
  | 'Professor'
  | 'Associate Professor'
  | 'Assistant Professor'
  | 'Lecturer'
  | 'Visiting Lecturer';

export type FacultyStatus = 'Active' | 'On Leave' | 'Part-Time';

export interface Faculty {
  id: string;
  name: string;
  rank: FacultyRank;
  status: FacultyStatus;
  email: string;
  phone: string;
  officeRoom: string;
  avatar: string;
  department: string;
  specialization: string;
  courseIds: string[]; // references Course.id
  weeklyHours: number;
  maxHours: number;
  joinedYear: number;
}

// ── Course ────────────────────────────────────────────────────────────────────
export type CourseStatus = 'Active' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Cancelled';

export interface Course {
  id: string;
  code: string;
  title: string;
  facultyId: string; // references Faculty.id
  semester: 'Fall 2024' | 'Spring 2025';
  credits: number;
  roomId: string; // references Classroom.id
  capacity: number;
  registered: number;
  status: CourseStatus;
  schedule: string;
  description: string;
}

// ── Classroom ─────────────────────────────────────────────────────────────────
export interface Classroom {
  id: string;
  name: string;
  building: string;
  capacity: number;
  type: 'Lecture Hall' | 'Studio' | 'Lab' | 'Seminar Room';
}

// ── Student ───────────────────────────────────────────────────────────────────
export type AcademicStanding = 'Excellent' | 'Good' | 'Warning' | 'Probation';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface DeptStudent {
  id: string;
  name: string;
  studentId: string;
  avatar: string;
  program: string;
  year: 1 | 2 | 3 | 4;
  cgpa: number;
  creditsEarned: number;
  totalCredits: number;
  attendanceRate: number;
  standing: AcademicStanding;
  advisorId: string; // references Faculty.id
  riskLevel: RiskLevel;
  email: string;
  enrolledCourseIds: string[];
}

// ── Approval Request ──────────────────────────────────────────────────────────
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type ApprovalType = 'Course Offering' | 'New Course' | 'Course Change' | 'Room Change';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  courseId: string;
  submittedBy: string; // faculty name
  submittedAt: string;
  status: ApprovalStatus;
  notes?: string;
}

// ── Leave Request ─────────────────────────────────────────────────────────────
export type LeaveType = 'Medical' | 'Personal' | 'Conference' | 'Research' | 'Annual';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Forwarded to HR';

export interface LeaveRequest {
  id: string;
  facultyId: string;
  type: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  submittedAt: string;
  reviewedAt?: string;
  hasDocument: boolean;
  timeline: { date: string; action: string; actor: string }[];
}

// ── Notification ──────────────────────────────────────────────────────────────
export type NotifType = 'approval' | 'alert' | 'info' | 'warning';

export interface DHNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  module: DHNavTab;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  date: string;
  action: string;
  user: string;
  module: string;
  description: string;
  status: 'Success' | 'Warning' | 'Failed';
}

// ── Chart Data ────────────────────────────────────────────────────────────────
export interface EnrollmentPoint {
  semester: string;
  count: number;
}

export interface GPAPoint {
  course: string;
  avgGpa: number;
}

export interface AttendancePoint {
  week: string;
  rate: number;
}

export interface WorkloadPoint {
  facultyName: string;
  hours: number;
  maxHours: number;
}
