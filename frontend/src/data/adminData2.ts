// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — Super Admin Dataset Part 2
// Admissions, Payments, Security Events, Notifications, Audit Log, etc.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Admission, Payment, SecurityEvent, ServiceHealth, BackupRecord,
  ImpersonationSession, AdminNotification, AdminAuditEntry,
  GatewayConfig, MaintenanceConfig, RolePermission,
} from '../types/admin';

// ── Admissions (40) ────────────────────────────────────────────────────────
export const admissions: Admission[] = [
  { id: 'ad01', applicationId: 'APP-2024-0001', name: 'Ayana Bekele',      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', email: 'ayana.b@gmail.com',   phone: '+251911200001', programId: 'p01', appliedAt: 'Jun 01, 2024', status: 'Approved',    entryScore: 88, interviewScore: 90, reviewedBy: 'Robel Bekele',    notes: 'Excellent portfolio.' },
  { id: 'ad02', applicationId: 'APP-2024-0002', name: 'Dawit Getachew',    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=300&q=80', email: 'dawit.g@gmail.com',   phone: '+251911200002', programId: 'p04', appliedAt: 'Jun 05, 2024', status: 'Enrolled',    entryScore: 92, interviewScore: 88, reviewedBy: 'Robel Bekele' },
  { id: 'ad03', applicationId: 'APP-2024-0003', name: 'Hana Tesfaye',      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80', email: 'hana.t@gmail.com',    phone: '+251911200003', programId: 'p05', appliedAt: 'Jun 08, 2024', status: 'Under Review',entryScore: 78, reviewedBy: undefined },
  { id: 'ad04', applicationId: 'APP-2024-0004', name: 'Kiros Haile',       avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80', email: 'kiros.h@gmail.com',   phone: '+251911200004', programId: 'p02', appliedAt: 'Jun 10, 2024', status: 'Rejected',    entryScore: 55, interviewScore: 60, reviewedBy: 'Robel Bekele',    notes: 'Below minimum entry requirement.' },
  { id: 'ad05', applicationId: 'APP-2024-0005', name: 'Meron Solomon',     avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', email: 'meron.s@gmail.com',   phone: '+251911200005', programId: 'p03', appliedAt: 'Jun 12, 2024', status: 'Approved',    entryScore: 85, interviewScore: 87, reviewedBy: 'Robel Bekele' },
  { id: 'ad06', applicationId: 'APP-2024-0006', name: 'Netsanet Girma',    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80', email: 'netsanet.g@gmail.com',phone: '+251911200006', programId: 'p04', appliedAt: 'Jun 15, 2024', status: 'Waitlisted',  entryScore: 74, reviewedBy: 'Robel Bekele' },
  { id: 'ad07', applicationId: 'APP-2024-0007', name: 'Petros Alemu',      avatar: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?auto=format&fit=crop&w=300&q=80', email: 'petros.a@gmail.com',  phone: '+251911200007', programId: 'p06', appliedAt: 'Jun 18, 2024', status: 'Applied',     entryScore: 0  },
  { id: 'ad08', applicationId: 'APP-2024-0008', name: 'Rahel Yohannes',    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80', email: 'rahel.y@gmail.com',   phone: '+251911200008', programId: 'p07', appliedAt: 'Jun 20, 2024', status: 'Enrolled',    entryScore: 90, interviewScore: 92, reviewedBy: 'Robel Bekele' },
  { id: 'ad09', applicationId: 'APP-2024-0009', name: 'Samuel Kassa',      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', email: 'samuel.k@gmail.com',  phone: '+251911200009', programId: 'p04', appliedAt: 'Jun 22, 2024', status: 'Under Review',entryScore: 80 },
  { id: 'ad10', applicationId: 'APP-2024-0010', name: 'Tigist Worku Jr.',  avatar: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=300&q=80', email: 'tigist.w2@gmail.com', phone: '+251911200010', programId: 'p11', appliedAt: 'Jun 25, 2024', status: 'Approved',    entryScore: 87, interviewScore: 85, reviewedBy: 'Robel Bekele' },
];

// ── Payments (sample 20) ───────────────────────────────────────────────────
export const payments: Payment[] = [
  { id: 'py01', transactionId: 'TXN-240701-001', studentId: 's01', studentName: 'Selam Alemayehu',    amount: 18500, method: 'Chapa',           category: 'Tuition',      status: 'Completed', date: 'Jul 01, 2024', reference: 'CHK-8832-T01' },
  { id: 'py02', transactionId: 'TXN-240701-002', studentId: 's03', studentName: 'Hana Wolde',          amount: 18500, method: 'Telebirr',        category: 'Tuition',      status: 'Completed', date: 'Jul 01, 2024', reference: 'TLB-9001-T01' },
  { id: 'py03', transactionId: 'TXN-240703-001', studentId: 's04', studentName: 'Yonas Kebede',        amount: 8000,  method: 'Bank Transfer',   category: 'Tuition',      status: 'Partial',   date: 'Jul 03, 2024', reference: 'BNK-5520-T01' },
  { id: 'py04', transactionId: 'TXN-240705-001', studentId: 's07', studentName: 'Feven Hailu',         amount: 11000, method: 'Cash',            category: 'Tuition',      status: 'Pending',   date: 'Jul 05, 2024', reference: 'CSH-8510-T01' },
  { id: 'py05', transactionId: 'TXN-240708-001', studentId: 's11', studentName: 'Selamawit Desta Jr.', amount: 4500,  method: 'Chapa',           category: 'Tuition',      status: 'Completed', date: 'Jul 08, 2024', reference: 'CHK-4980-T01' },
  { id: 'py06', transactionId: 'TXN-240710-001', studentId: 's06', studentName: 'Dawit Mekonnen Jr.',  amount: 2000,  method: 'Commercial Bank', category: 'Tuition',      status: 'Completed', date: 'Jul 10, 2024', reference: 'CMB-7200-T01' },
  { id: 'py07', transactionId: 'TXN-240712-001', studentId: 's16', studentName: 'Samuel Teklu Jr.',    amount: 6000,  method: 'Telebirr',        category: 'Tuition',      status: 'Failed',    date: 'Jul 12, 2024', reference: 'TLB-7050-T01' },
  { id: 'py08', transactionId: 'TXN-240715-001', studentId: 's20', studentName: 'Abebe Tesfaye',       amount: 9000,  method: 'Bank Transfer',   category: 'Tuition',      status: 'Completed', date: 'Jul 15, 2024', reference: 'BNK-6700-T01' },
  { id: 'py09', transactionId: 'TXN-240718-001', studentId: 's23', studentName: 'Marta Girma',         amount: 3500,  method: 'Chapa',           category: 'Registration', status: 'Completed', date: 'Jul 18, 2024', reference: 'CHK-3400-R01' },
  { id: 'py10', transactionId: 'TXN-240720-001', studentId: 's02', studentName: 'Biruk Teshome',       amount: 5200,  method: 'Cash',            category: 'Tuition',      status: 'Completed', date: 'Jul 20, 2024', reference: 'CSH-7641-T01' },
  { id: 'py11', transactionId: 'TXN-240721-001', studentId: 's21', studentName: 'Kidist Solomon',      amount: 18500, method: 'Chapa',           category: 'Tuition',      status: 'Completed', date: 'Jul 21, 2024', reference: 'CHK-7900-T01' },
  { id: 'py12', transactionId: 'TXN-240722-001', studentId: 's22', studentName: 'Yared Alemu',         amount: 18500, method: 'Telebirr',        category: 'Tuition',      status: 'Completed', date: 'Jul 22, 2024', reference: 'TLB-9200-T01' },
  { id: 'py13', transactionId: 'TXN-240722-002', studentId: 's24', studentName: 'Solomon Bekele',      amount: 650,   method: 'Chapa',           category: 'Library',      status: 'Completed', date: 'Jul 22, 2024', reference: 'CHK-5800-L01' },
  { id: 'py14', transactionId: 'TXN-240722-003', studentId: 's25', studentName: 'Hiwot Tesfaye',       amount: 1200,  method: 'Commercial Bank', category: 'Registration', status: 'Completed', date: 'Jul 22, 2024', reference: 'CMB-2100-R01' },
  { id: 'py15', transactionId: 'TXN-240722-004', studentId: 's05', studentName: 'Liya Girma',          amount: 18500, method: 'Chapa',           category: 'Tuition',      status: 'Completed', date: 'Jul 22, 2024', reference: 'CHK-1122-T01' },
];

// ── Security Events ────────────────────────────────────────────────────────
export const securityEvents: SecurityEvent[] = [
  { id: 'se01', type: 'Login Success',         userId: 'u01', userName: 'Dr. Bekele Ayalew',  role: 'Super Admin',    ip: '196.188.210.45', device: 'MacBook Pro',  browser: 'Chrome 126', location: 'Addis Ababa, ET', timestamp: 'Jul 22, 2024 08:30 AM', status: 'Info' },
  { id: 'se02', type: 'Login Failed',          userId: 'u10', userName: 'Biruk Teshome',      role: 'Student',        ip: '196.188.100.12', device: 'iPhone 15',    browser: 'Safari',     location: 'Addis Ababa, ET', timestamp: 'Jul 22, 2024 07:45 AM', status: 'Warning', details: '3rd consecutive failed attempt' },
  { id: 'se03', type: 'Account Locked',        userId: 'u10', userName: 'Biruk Teshome',      role: 'Student',        ip: 'System',         device: 'System',       browser: 'System',     location: 'System',          timestamp: 'Jul 22, 2024 07:46 AM', status: 'Critical', details: 'Auto-locked after 3 failed logins' },
  { id: 'se04', type: 'New Device',            userId: 'u03', userName: 'Dr. Marcus Vance',   role: 'Instructor',     ip: '197.156.80.22',  device: 'iPad Pro',     browser: 'Safari',     location: 'Bahir Dar, ET',   timestamp: 'Jul 21, 2024 06:00 PM', status: 'Warning' },
  { id: 'se05', type: 'Impersonation Started', userId: 'u01', userName: 'Dr. Bekele Ayalew',  role: 'Super Admin',    ip: '196.188.210.45', device: 'MacBook Pro',  browser: 'Chrome 126', location: 'Addis Ababa, ET', timestamp: 'Jul 20, 2024 02:00 PM', status: 'Warning', details: 'Impersonating: Registrar Robel Bekele' },
  { id: 'se06', type: 'Password Changed',      userId: 'u04', userName: 'Tigist Haile',       role: 'HR Officer',     ip: '196.188.200.30', device: 'Dell Laptop',  browser: 'Chrome',     location: 'Addis Ababa, ET', timestamp: 'Jul 19, 2024 11:00 AM', status: 'Info' },
  { id: 'se07', type: '2FA Enabled',           userId: 'u06', userName: 'Robel Bekele',       role: 'Registrar',      ip: '196.188.100.44', device: 'HP Laptop',    browser: 'Firefox',    location: 'Addis Ababa, ET', timestamp: 'Jul 18, 2024 10:00 AM', status: 'Info' },
  { id: 'se08', type: 'Login Success',         userId: 'u05', userName: 'Selamawit Desta',    role: 'Finance Officer',ip: '196.188.210.51', device: 'MacBook Air',  browser: 'Chrome',     location: 'Addis Ababa, ET', timestamp: 'Jul 22, 2024 08:45 AM', status: 'Info' },
];

// ── System Health ──────────────────────────────────────────────────────────
export const systemHealth: ServiceHealth[] = [
  { name: 'Database (PostgreSQL)',  status: 'Healthy',  uptime: '99.98%', responseTime: '12ms',  lastChecked: '2 min ago' },
  { name: 'API Server (Node.js)',   status: 'Healthy',  uptime: '99.95%', responseTime: '45ms',  lastChecked: '1 min ago' },
  { name: 'Auth Service (JWT)',     status: 'Healthy',  uptime: '100%',   responseTime: '8ms',   lastChecked: '1 min ago' },
  { name: 'File Storage',          status: 'Degraded', uptime: '99.80%', responseTime: '320ms', lastChecked: '3 min ago', details: 'High I/O — storage 89% used' },
  { name: 'Email Service',         status: 'Healthy',  uptime: '99.90%', responseTime: '180ms', lastChecked: '5 min ago' },
  { name: 'Chapa Payment Gateway', status: 'Healthy',  uptime: '99.85%', responseTime: '95ms',  lastChecked: '2 min ago' },
  { name: 'Telebirr Gateway',      status: 'Healthy',  uptime: '99.70%', responseTime: '110ms', lastChecked: '2 min ago' },
  { name: 'Backup Service',        status: 'Healthy',  uptime: '100%',   responseTime: '—',     lastChecked: '10 min ago' },
  { name: 'Cache (Redis)',          status: 'Healthy',  uptime: '99.99%', responseTime: '3ms',   lastChecked: '1 min ago' },
  { name: 'Queue Workers',         status: 'Healthy',  uptime: '99.95%', responseTime: '—',     lastChecked: '5 min ago' },
];

// ── Backup Records ─────────────────────────────────────────────────────────
export const backupRecords: BackupRecord[] = [
  { id: 'bk01', type: 'Full',        status: 'Completed',   size: '4.2 GB',  duration: '18 min',  startedAt: 'Jul 22, 2024 02:00 AM', completedAt: 'Jul 22, 2024 02:18 AM', location: 'AWS S3 / bucket-hc-backup-prod',   triggeredBy: 'Scheduled' },
  { id: 'bk02', type: 'Incremental', status: 'Completed',   size: '320 MB',  duration: '3 min',   startedAt: 'Jul 21, 2024 02:00 AM', completedAt: 'Jul 21, 2024 02:03 AM', location: 'AWS S3 / bucket-hc-backup-prod',   triggeredBy: 'Scheduled' },
  { id: 'bk03', type: 'Incremental', status: 'Completed',   size: '290 MB',  duration: '3 min',   startedAt: 'Jul 20, 2024 02:00 AM', completedAt: 'Jul 20, 2024 02:03 AM', location: 'AWS S3 / bucket-hc-backup-prod',   triggeredBy: 'Scheduled' },
  { id: 'bk04', type: 'Manual',      status: 'Completed',   size: '4.1 GB',  duration: '17 min',  startedAt: 'Jul 15, 2024 10:30 AM', completedAt: 'Jul 15, 2024 10:47 AM', location: 'Local NAS / harmony-backup-local',  triggeredBy: 'Dr. Bekele Ayalew' },
  { id: 'bk05', type: 'Full',        status: 'Completed',   size: '3.9 GB',  duration: '16 min',  startedAt: 'Jul 15, 2024 02:00 AM', completedAt: 'Jul 15, 2024 02:16 AM', location: 'AWS S3 / bucket-hc-backup-prod',   triggeredBy: 'Scheduled' },
  { id: 'bk06', type: 'Incremental', status: 'Failed',      size: '—',       duration: '—',       startedAt: 'Jul 10, 2024 02:00 AM', completedAt: undefined,               location: 'AWS S3 / bucket-hc-backup-prod',   triggeredBy: 'Scheduled' },
];

// ── Impersonation Sessions ─────────────────────────────────────────────────
export const impersonationSessions: ImpersonationSession[] = [
  { id: 'imp01', adminId: 'u01', adminName: 'Dr. Bekele Ayalew', targetUserId: 'u06', targetUserName: 'Robel Bekele', targetRole: 'Registrar', startTime: 'Jul 20, 2024 02:00 PM', endTime: 'Jul 20, 2024 02:22 PM', duration: '22 min', ip: '196.188.210.45', device: 'MacBook Pro · Chrome 126', reason: 'Investigate enrollment approval issue reported by student HC-2024-8832.', actionsPerformed: 4 },
  { id: 'imp02', adminId: 'u01', adminName: 'Dr. Bekele Ayalew', targetUserId: 'u04', targetUserName: 'Tigist Haile', targetRole: 'HR Officer', startTime: 'Jul 15, 2024 11:00 AM', endTime: 'Jul 15, 2024 11:08 AM', duration: '8 min', ip: '196.188.210.45', device: 'MacBook Pro · Chrome 126', reason: 'Verify payroll configuration before June payroll run.', actionsPerformed: 2 },
];

// ── Admin Notifications ────────────────────────────────────────────────────
export const adminNotifications: AdminNotification[] = [
  { id: 'an01', type: 'security',  severity: 'critical', title: 'Account Locked: Biruk Teshome',         message: 'Student account HC-2023-7641 auto-locked after 3 consecutive failed login attempts.', timestamp: 'Jul 22, 2024 07:46 AM', read: false, tab: 'security' },
  { id: 'an02', type: 'security',  severity: 'warning',  title: 'New Device Login: Dr. Marcus Vance',    message: 'Login from unrecognized device (iPad Pro) detected in Bahir Dar, ET.', timestamp: 'Jul 21, 2024 06:00 PM', read: false, tab: 'security' },
  { id: 'an03', type: 'payment',   severity: 'warning',  title: 'Payment Failed: Samuel Teklu Jr.',      message: 'Telebirr tuition payment of ETB 6,000 failed for student HC-2023-7050.', timestamp: 'Jul 12, 2024 02:30 PM', read: false, tab: 'payments' },
  { id: 'an04', type: 'system',    severity: 'warning',  title: 'Storage Warning: 89% Used',             message: 'File storage is at 89% capacity. Consider expanding or archiving old documents.', timestamp: 'Jul 22, 2024 09:00 AM', read: false, tab: 'backup' },
  { id: 'an05', type: 'backup',    severity: 'critical', title: 'Backup Failed: Jul 10 Incremental',    message: 'Scheduled incremental backup on Jul 10, 2024 02:00 AM failed. Immediate attention required.', timestamp: 'Jul 10, 2024 02:05 AM', read: false, tab: 'backup' },
  { id: 'an06', type: 'admission', severity: 'info',     title: '10 New Admissions This Month',          message: '10 applications received for Fall 2024 enrollment. 2 enrolled, 2 approved, 1 rejected.', timestamp: 'Jul 22, 2024 08:00 AM', read: true,  tab: 'admissions' },
  { id: 'an07', type: 'hr',        severity: 'info',     title: 'Payroll Awaiting Approval',             message: 'July 2024 payroll (ETB 4.62M) has completed Finance review and requires HR final approval.', timestamp: 'Jul 26, 2024 02:00 PM', read: true,  tab: 'hr' },
  { id: 'an08', type: 'academic',  severity: 'info',     title: 'New Program Under Review: BSc Animation', message: 'BSc Animation & Motion Graphics program submission is pending curriculum review board approval.', timestamp: 'Jul 18, 2024 10:00 AM', read: true,  tab: 'programs' },
];

// ── Audit Log ──────────────────────────────────────────────────────────────
export const adminAuditLog: AdminAuditEntry[] = [
  { id: 'aa01', timestamp: 'Jul 22, 2024 08:30', user: 'Dr. Bekele Ayalew', userId: 'u01', role: 'Super Admin',    module: 'Auth',     action: 'Login',               entity: 'Session',    ip: '196.188.210.45', device: 'MacBook Pro / Chrome', status: 'Success', isImpersonated: false, description: 'Super Admin login from known device.' },
  { id: 'aa02', timestamp: 'Jul 22, 2024 07:46', user: 'System',            userId: 'sys', role: 'Super Admin',    module: 'Security', action: 'Account Locked',      entity: 'User u10',   ip: 'System',         device: 'System',              status: 'Warning', isImpersonated: false, description: 'Student Biruk Teshome auto-locked after 3 failed logins.' },
  { id: 'aa03', timestamp: 'Jul 20, 2024 02:22', user: 'Dr. Bekele Ayalew', userId: 'u01', role: 'Super Admin',    module: 'Registrar',action: 'Enrollment Approved', entity: 'Student s01',ip: '196.188.210.45', device: 'MacBook Pro / Chrome', status: 'Success', isImpersonated: true,  impersonatedBy: 'Robel Bekele', description: 'Approved enrollment for Selam Alemayehu via impersonation of Registrar.' },
  { id: 'aa04', timestamp: 'Jul 20, 2024 02:00', user: 'Dr. Bekele Ayalew', userId: 'u01', role: 'Super Admin',    module: 'Security', action: 'Impersonation Started',entity: 'User u06',  ip: '196.188.210.45', device: 'MacBook Pro / Chrome', status: 'Warning', isImpersonated: false, description: 'Started impersonation session as Registrar Robel Bekele.' },
  { id: 'aa05', timestamp: 'Jul 19, 2024 11:00', user: 'Tigist Haile',      userId: 'u04', role: 'HR Officer',     module: 'HR',       action: 'Password Changed',    entity: 'User u04',   ip: '196.188.200.30', device: 'Dell Laptop / Chrome', status: 'Success', isImpersonated: false, description: 'HR Officer changed own password.' },
  { id: 'aa06', timestamp: 'Jul 18, 2024 10:00', user: 'Robel Bekele',      userId: 'u06', role: 'Registrar',      module: 'Security', action: '2FA Enabled',          entity: 'User u06',   ip: '196.188.100.44', device: 'HP Laptop / Firefox',  status: 'Success', isImpersonated: false, description: 'Registrar enabled 2FA on account.' },
  { id: 'aa07', timestamp: 'Jul 15, 2024 10:30', user: 'Dr. Bekele Ayalew', userId: 'u01', role: 'Super Admin',    module: 'Backup',   action: 'Manual Backup',       entity: 'System',     ip: '196.188.210.45', device: 'MacBook Pro / Chrome', status: 'Success', isImpersonated: false, description: 'Triggered manual full system backup before migration.' },
  { id: 'aa08', timestamp: 'Jul 10, 2024 02:05', user: 'System',            userId: 'sys', role: 'Super Admin',    module: 'Backup',   action: 'Backup Failed',       entity: 'System',     ip: 'System',         device: 'System',              status: 'Failed',  isImpersonated: false, description: 'Scheduled incremental backup failed — storage connectivity issue.' },
  { id: 'aa09', timestamp: 'Jul 08, 2024 09:00', user: 'Dr. Bekele Ayalew', userId: 'u01', role: 'Super Admin',    module: 'Users',    action: 'User Suspended',      entity: 'User u10',   ip: '196.188.210.45', device: 'MacBook Pro / Chrome', status: 'Success', isImpersonated: false, description: 'Suspended student Biruk Teshome account pending academic review.' },
  { id: 'aa10', timestamp: 'Jul 01, 2024 08:00', user: 'Dr. Bekele Ayalew', userId: 'u01', role: 'Super Admin',    module: 'Programs', action: 'Program Created',     entity: 'Program p09',ip: '196.188.210.45', device: 'MacBook Pro / Chrome', status: 'Success', isImpersonated: false, description: 'Created new program: BSc Animation & Motion Graphics (Under Review).' },
];

// ── Gateway Configuration ──────────────────────────────────────────────────
export const gateways: GatewayConfig[] = [
  { id: 'gw01', name: 'Chapa',           enabled: true,  connected: true,  lastTested: 'Jul 22, 2024 08:00', transactionCount: 152, totalVolume: 1_840_000, webhookStatus: 'Active' },
  { id: 'gw02', name: 'Telebirr',        enabled: true,  connected: true,  lastTested: 'Jul 22, 2024 08:00', transactionCount: 88,  totalVolume: 920_000,   webhookStatus: 'Active' },
  { id: 'gw03', name: 'Commercial Bank', enabled: true,  connected: true,  lastTested: 'Jul 21, 2024 12:00', transactionCount: 44,  totalVolume: 680_000,   webhookStatus: 'Active' },
  { id: 'gw04', name: 'Bank Transfer',   enabled: true,  connected: true,  lastTested: 'Jul 20, 2024 09:00', transactionCount: 28,  totalVolume: 420_000,   webhookStatus: 'Inactive' },
  { id: 'gw05', name: 'Cash',            enabled: true,  connected: false, lastTested: '—',                   transactionCount: 35,  totalVolume: 280_000,   webhookStatus: 'Inactive' },
];

// ── Maintenance Config ─────────────────────────────────────────────────────
export const maintenanceConfig: MaintenanceConfig = {
  enabled: false,
  message: 'Harmony College portal is currently undergoing scheduled maintenance. We will be back shortly.',
  scheduledStart: undefined,
  scheduledEnd: undefined,
  bypassRoles: ['Super Admin', 'Admin'],
};

// ── Role Permissions ───────────────────────────────────────────────────────
export const rolePermissions: RolePermission[] = [
  { role: 'Super Admin',    module: 'All',        canRead: true,  canCreate: true,  canUpdate: true,  canDelete: true,  canExport: true,  canApprove: true,  canSensitive: true },
  { role: 'Admin',          module: 'Users',      canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false, canExport: true,  canApprove: true,  canSensitive: false },
  { role: 'Department Head',module: 'Courses',    canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false, canExport: true,  canApprove: true,  canSensitive: false },
  { role: 'Instructor',     module: 'Grades',     canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false, canExport: true,  canApprove: false, canSensitive: false },
  { role: 'HR Officer',     module: 'Employees',  canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false, canExport: true,  canApprove: true,  canSensitive: true },
  { role: 'Finance Officer',module: 'Payroll',    canRead: true,  canCreate: false, canUpdate: true,  canDelete: false, canExport: true,  canApprove: true,  canSensitive: true },
  { role: 'Registrar',      module: 'Admissions', canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false, canExport: true,  canApprove: true,  canSensitive: false },
  { role: 'Student',        module: 'Own Records',canRead: true,  canCreate: false, canUpdate: false, canDelete: false, canExport: false, canApprove: false, canSensitive: false },
];

// ── Derived Admin KPIs ─────────────────────────────────────────────────────
export { adminStudents } from './adminData';
import { adminStudents } from './adminData';
import { departments, employees } from './hrData';
import { programs, systemUsers } from './adminData';

export const adminKPIs = {
  totalStudents:       adminStudents.length,
  totalFaculty:        employees.filter(e => e.position.toLowerCase().includes('professor') || e.position.toLowerCase().includes('lecturer')).length,
  totalEmployees:      employees.filter(e => e.status === 'Active').length,
  totalDepartments:    departments.length,
  totalPrograms:       programs.filter(p => p.status === 'Active').length,
  totalRevenue:        payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0),
  outstandingPayments: adminStudents.reduce((s, st) => s + st.tuitionBalance, 0),
  pendingAdmissions:   admissions.filter(a => a.status === 'Under Review' || a.status === 'Applied').length,
  avgAttendance:       Math.round(adminStudents.reduce((s, st) => s + st.attendanceRate, 0) / adminStudents.length),
  avgGpa:              +(adminStudents.reduce((s, st) => s + st.cgpa, 0) / adminStudents.length).toFixed(2),
  activeUsers:         systemUsers.filter(u => u.status === 'Active').length,
  systemAlerts:        adminNotifications.filter(n => !n.read).length,
};
