// ─────────────────────────────────────────────────────────────────────────────
// Harmony College — Finance Officer Dashboard Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type FONavTab =
  | 'overview'
  | 'student_accounts'
  | 'payments'
  | 'registration_payments'
  | 'receipts'
  | 'outstanding'
  | 'reports'
  | 'reconciliation'
  | 'notifications'
  | 'audit_log'
  | 'settings'
  | 'messages';

// ── Finance Officer Profile ───────────────────────────────────────────────────
export interface FOProfile {
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
}

// ── Department ────────────────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  code: string;
  college: string;
  headName: string;
  studentCount: number;
  totalRevenue: number;
  outstandingBalance: number;
}

// ── Program ───────────────────────────────────────────────────────────────────
export interface Program {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  level: 'Undergraduate' | 'Postgraduate' | 'Diploma';
  durationYears: number;
  annualTuition: number;
}

// ── Finance Student ───────────────────────────────────────────────────────────
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Deferred';
export type FinanceRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface FinanceStudent {
  id: string;
  name: string;
  studentId: string;
  avatar: string;
  email: string;
  phone: string;
  programId: string;
  programName: string;
  departmentId: string;
  departmentName: string;
  year: 1 | 2 | 3 | 4;
  semester: string;
  tuition: number;
  adminFees: number;
  labFees: number;
  libraryFines: number;
  otherCharges: number;
  scholarshipDiscount: number;
  totalCharged: number;
  totalPaid: number;
  outstanding: number;
  paymentStatus: PaymentStatus;
  riskLevel: FinanceRiskLevel;
  daysOverdue: number;
  lastPaymentDate: string | null;
  installmentPlan: boolean;
  notes?: string;
}

// ── Transaction ───────────────────────────────────────────────────────────────
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Telebirr' | 'Chapa';
export type TransactionType = 'Tuition' | 'Fee' | 'Fine' | 'Scholarship' | 'Refund' | 'Installment';

export interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  studentProgramName: string;
  type: TransactionType;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  receiptId: string | null;
  cashierId: string;
  cashierName: string;
  date: string;
  time: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Reversed';
  gatewayTxnId?: string;
  notes?: string;
}

// ── Receipt ───────────────────────────────────────────────────────────────────
export interface Receipt {
  id: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  studentProgramName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  cashierId: string;
  cashierName: string;
  date: string;
  time: string;
  description: string;
  items: ReceiptLineItem[];
  qrCode: string;
  printed: boolean;
  shared: boolean;
}

export interface ReceiptLineItem {
  label: string;
  amount: number;
}

// ── Reconciliation Entry ──────────────────────────────────────────────────────
export type ReconciliationStatus = 'Matched' | 'Unmatched' | 'Failed' | 'Pending Review';
export type GatewaySource = 'Chapa' | 'Telebirr' | 'Bank Transfer' | 'Manual';

export interface ReconciliationEntry {
  id: string;
  gatewayTxnId: string;
  studentId: string | null;
  studentName: string | null;
  source: GatewaySource;
  amount: number;
  status: ReconciliationStatus;
  date: string;
  time: string;
  matchedReceiptId: string | null;
  failureReason?: string;
  reviewNotes?: string;
}

// ── FO Notification ───────────────────────────────────────────────────────────
export type FONotifType =
  | 'payment_received'
  | 'payment_overdue'
  | 'installment_due'
  | 'reconciliation_failed'
  | 'large_payment'
  | 'system'
  | 'reminder';

export interface FONotification {
  id: string;
  type: FONotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  tab: FONavTab;
  amount?: number;
  studentId?: string;
}

// ── Audit Log Entry ───────────────────────────────────────────────────────────
export interface FOAuditEntry {
  id: string;
  date: string;
  time: string;
  officerId: string;
  officerName: string;
  studentId: string | null;
  studentName: string | null;
  action: string;
  module: string;
  amount: number | null;
  previousValue: string | null;
  newValue: string | null;
  status: 'Success' | 'Warning' | 'Failed';
  ipAddress: string;
}

// ── KPI / Chart Data ──────────────────────────────────────────────────────────
export interface MonthlyRevenue {
  month: string;
  revenue: number;
  target: number;
  collections: number;
}

export interface DeptRevenue {
  department: string;
  revenue: number;
  outstanding: number;
}

export interface ProgramRevenue {
  program: string;
  revenue: number;
  students: number;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  amount: number;
  count: number;
  color: string;
}

export interface DailyCollection {
  day: string;
  amount: number;
}

export interface OutstandingTrend {
  month: string;
  amount: number;
}

// ── Installment Plan ──────────────────────────────────────────────────────────
export interface InstallmentPlan {
  id: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: InstallmentEntry[];
  createdAt: string;
  approvedBy: string;
}

export interface InstallmentEntry {
  id: string;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
}
