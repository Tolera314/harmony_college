// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — Super Admin Dashboard Type Definitions
// Highest-privilege dashboard in the entire system
// ─────────────────────────────────────────────────────────────────────────────

export type AdminNavTab =
  | 'overview'
  | 'users'
  | 'students'
  | 'faculty'
  | 'departments'
  | 'programs'
  | 'admissions'
  | 'registrar'
  | 'attendance'
  | 'finance'
  | 'hr'
  | 'payments'
  | 'documents'
  | 'reports'
  | 'audit_logs'
  | 'security'
  | 'backup'
  | 'system_config'
  | 'notifications'
  | 'settings';

// ── Super Admin Profile ────────────────────────────────────────────────────────
export interface AdminProfile {
  name: string;
  title: string;
  email: string;
  avatar: string;
  adminId: string;
  role: 'Super Admin';
  twoFactorEnabled: boolean;
  lastLogin: string;
  lastLoginIp: string;
  lastLoginDevice: string;
}

// ── System User (for user management) ─────────────────────────────────────────
export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'Department Head'
  | 'Instructor'
  | 'HR Officer'
  | 'Finance Officer'
  | 'Registrar'
  | 'Student';

export type UserStatus = 'Active' | 'Inactive' | 'Suspended' | 'Locked' | 'Pending';

export interface SystemUser {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  email: string;
  role: UserRole;
  department?: string;
  status: UserStatus;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  sessions: number;
  loginCount: number;
  failedLoginAttempts: number;
}

// ── Student (admin view) ───────────────────────────────────────────────────────
export type StudentStatus = 'Active' | 'Graduated' | 'Suspended' | 'Dropped' | 'On Leave';
export type AcademicStanding = 'Excellent' | 'Good' | 'Warning' | 'Probation';

export interface AdminStudent {
  id: string;
  studentId: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  programId: string;
  departmentId: string;
  year: 1 | 2 | 3 | 4;
  cgpa: number;
  creditsEarned: number;
  totalCredits: number;
  attendanceRate: number;
  standing: AcademicStanding;
  status: StudentStatus;
  enrolledAt: string;
  tuitionBalance: number;
  scholarshipAmount: number;
}

// ── Program ────────────────────────────────────────────────────────────────────
export interface Program {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  level: 'Undergraduate' | 'Postgraduate' | 'Certificate';
  duration: number; // years
  credits: number;
  status: 'Active' | 'Inactive' | 'Under Review';
  studentCount: number;
  courseCount: number;
  headFacultyId?: string;
  createdAt: string;
}

// ── Course ─────────────────────────────────────────────────────────────────────
export interface AdminCourse {
  id: string;
  code: string;
  title: string;
  programId: string;
  departmentId: string;
  facultyId: string;
  credits: number;
  capacity: number;
  enrolled: number;
  semester: string;
  status: 'Active' | 'Pending' | 'Cancelled';
  attendanceAvg: number;
  gradeAvg: number;
}

// ── Admission ──────────────────────────────────────────────────────────────────
export type AdmissionStatus = 'Applied' | 'Under Review' | 'Approved' | 'Rejected' | 'Waitlisted' | 'Enrolled';

export interface Admission {
  id: string;
  applicationId: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  programId: string;
  appliedAt: string;
  status: AdmissionStatus;
  entryScore: number;
  interviewScore?: number;
  reviewedBy?: string;
  notes?: string;
}

// ── Payment ────────────────────────────────────────────────────────────────────
export type PaymentStatus = 'Completed' | 'Pending' | 'Failed' | 'Refunded' | 'Partial';
export type PaymentMethod = 'Chapa' | 'Telebirr' | 'Bank Transfer' | 'Cash' | 'Commercial Bank';
export type PaymentCategory = 'Tuition' | 'Registration' | 'Examination' | 'Library' | 'Dormitory' | 'Other';

export interface Payment {
  id: string;
  transactionId: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: PaymentMethod;
  category: PaymentCategory;
  status: PaymentStatus;
  date: string;
  reference: string;
}

// ── Security Event ─────────────────────────────────────────────────────────────
export type SecurityEventType =
  | 'Login Success'
  | 'Login Failed'
  | 'New Device'
  | 'Password Changed'
  | 'Account Locked'
  | '2FA Enabled'
  | '2FA Disabled'
  | 'Role Escalation'
  | 'Session Revoked'
  | 'Impersonation Started'
  | 'Impersonation Ended';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  userId: string;
  userName: string;
  role: UserRole;
  ip: string;
  device: string;
  browser: string;
  location: string;
  timestamp: string;
  status: 'Success' | 'Warning' | 'Critical' | 'Info';
  details?: string;
}

// ── System Health ──────────────────────────────────────────────────────────────
export type HealthStatus = 'Healthy' | 'Degraded' | 'Down';

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  uptime: string;
  responseTime: string;
  lastChecked: string;
  details?: string;
}

// ── Backup Record ──────────────────────────────────────────────────────────────
export type BackupType = 'Full' | 'Incremental' | 'Manual';
export type BackupStatus = 'Completed' | 'In Progress' | 'Failed' | 'Scheduled';

export interface BackupRecord {
  id: string;
  type: BackupType;
  status: BackupStatus;
  size: string;
  duration: string;
  startedAt: string;
  completedAt?: string;
  location: string;
  triggeredBy: string;
}

// ── Impersonation Session ──────────────────────────────────────────────────────
export interface ImpersonationSession {
  id: string;
  adminId: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  targetRole: UserRole;
  startTime: string;
  endTime?: string;
  duration?: string;
  ip: string;
  device: string;
  reason?: string;
  actionsPerformed: number;
}

// ── Admin Notification ─────────────────────────────────────────────────────────
export type AdminNotifType =
  | 'security'
  | 'admission'
  | 'payment'
  | 'system'
  | 'backup'
  | 'hr'
  | 'academic';

export interface AdminNotification {
  id: string;
  type: AdminNotifType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  tab: AdminNavTab;
}

// ── Super Admin Audit Entry ────────────────────────────────────────────────────
export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  role: UserRole;
  module: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  ip: string;
  device: string;
  status: 'Success' | 'Warning' | 'Failed';
  isImpersonated: boolean;
  impersonatedBy?: string;
  description: string;
}

// ── Academic Year ──────────────────────────────────────────────────────────────
export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Upcoming' | 'Completed';
  semesters: { id: string; name: string; start: string; end: string; status: string }[];
}

// ── Payment Gateway Config ─────────────────────────────────────────────────────
export interface GatewayConfig {
  id: string;
  name: string;
  enabled: boolean;
  connected: boolean;
  lastTested: string;
  transactionCount: number;
  totalVolume: number;
  webhookStatus: 'Active' | 'Inactive' | 'Error';
}

// ── Maintenance Mode ───────────────────────────────────────────────────────────
export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  bypassRoles: UserRole[];
}

// ── Role Permission ────────────────────────────────────────────────────────────
export interface RolePermission {
  role: UserRole;
  module: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canApprove: boolean;
  canSensitive: boolean;
}
