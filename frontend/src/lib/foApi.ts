/**
 * Finance Officer API Client — Harmony College
 * Connects frontend FO dashboard views to `/api/finance-officer/*` Express endpoints.
 */

const BASE = '/api/finance-officer';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((body as any).error ?? `Request failed: ${res.status}`);
  return body as T;
}

function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ── Overview / Dashboard Analytics ───────────────────────────────────────────
export async function getOverviewData(programType?: 'TVET' | 'SHORT_PROGRAM') {
  const params = programType ? `?programType=${programType}` : '';
  return apiFetch<any>(`/overview${params}`);
}

// ── Student Payments (Consolidated View) ──────────────────────────────────────
export async function getStudentPayments(params?: {
  programType?: 'TVET' | 'SHORT_PROGRAM';
  billingMonth?: string;
  billingYear?: string;
  programId?: string;
  departmentId?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return apiFetch<any>(`/student-payments${qs(params || {})}`);
}

export async function getStudentPaymentDetail(studentRecordId: string) {
  return apiFetch<any>(`/student-payments/${studentRecordId}`);
}

export async function getStudentPaymentsPrograms(programType?: 'TVET' | 'SHORT_PROGRAM') {
  const params = programType ? `?programType=${programType}` : '';
  return apiFetch<any>(`/student-payments-programs${params}`);
}

// ── Student Accounts ──────────────────────────────────────────────────────────
export async function getStudentAccounts(params?: {
  search?: string;
  departmentId?: string;
  paymentStatus?: string;
  riskLevel?: string;
  programType?: 'TVET' | 'SHORT_PROGRAM';
  page?: number;
  limit?: number;
}) {
  return apiFetch<any>(`/student-accounts${qs(params || {})}`);
}

export async function getStudentAccountDetail(studentRecordId: string) {
  return apiFetch<any>(`/student-accounts/${studentRecordId}`);
}

export async function postCharge(
  studentRecordId: string,
  chargeData: { amount: number; description: string; category: string }
) {
  return apiFetch<any>(`/student-accounts/${studentRecordId}/charge`, {
    method: 'POST',
    body: JSON.stringify(chargeData),
  });
}

export async function postCredit(
  studentRecordId: string,
  creditData: { amount: number; description: string; category: string }
) {
  return apiFetch<any>(`/student-accounts/${studentRecordId}/credit`, {
    method: 'POST',
    body: JSON.stringify(creditData),
  });
}

export async function updateAccountClearance(
  studentRecordId: string,
  clearanceData: { clearedForTerm: string | null }
) {
  return apiFetch<any>(`/student-accounts/${studentRecordId}/clearance`, {
    method: 'POST',
    body: JSON.stringify(clearanceData),
  });
}

// ── Registration Payments Verification ────────────────────────────────────────
export async function getPendingRegistrationPayments(params?: { search?: string; programType?: 'TVET' | 'SHORT_PROGRAM'; page?: number; limit?: number }) {
  return apiFetch<any>(`/payments/pending${qs(params || {})}`);
}

export async function getVerifiedRegistrationPayments(params?: { search?: string; programType?: 'TVET' | 'SHORT_PROGRAM'; page?: number; limit?: number }) {
  return apiFetch<any>(`/payments/verified${qs(params || {})}`);
}

export async function verifyRegistrationPayment(userId: string) {
  return apiFetch<any>(`/payments/${userId}/verify`, { method: 'POST' });
}

export async function unverifyRegistrationPayment(userId: string) {
  return apiFetch<any>(`/payments/${userId}/unverify`, { method: 'POST' });
}

// ── Direct Payment Recording & Transactions ───────────────────────────────────
export async function recordStudentPayment(paymentData: {
  studentRecordId: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Telebirr' | 'Chapa';
  referenceNumber?: string;
  description?: string;
  category?: string;
}) {
  return apiFetch<any>('/payments/record', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

export async function getTransactions(params?: { search?: string; type?: string; status?: string; programType?: 'TVET' | 'SHORT_PROGRAM'; page?: number; limit?: number }) {
  return apiFetch<any>(`/transactions${qs(params || {})}`);
}

export async function reverseTransaction(transactionId: string, reason: string) {
  return apiFetch<any>(`/transactions/${transactionId}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ── Receipts ──────────────────────────────────────────────────────────────────
export async function getReceipts(params?: { search?: string; programType?: 'TVET' | 'SHORT_PROGRAM'; page?: number; limit?: number }) {
  return apiFetch<any>(`/receipts${qs(params || {})}`);
}

export async function getReceiptDetail(receiptId: string) {
  return apiFetch<any>(`/receipts/${receiptId}`);
}

// ── Outstanding & Reminders ───────────────────────────────────────────────────
export async function getOutstandingAccounts(params?: { search?: string; programType?: 'TVET' | 'SHORT_PROGRAM'; page?: number; limit?: number }) {
  return apiFetch<any>(`/outstanding${qs(params || {})}`);
}

export async function sendPaymentReminder(studentRecordId: string, message?: string) {
  return apiFetch<any>('/reminders/send', {
    method: 'POST',
    body: JSON.stringify({ studentRecordId, message }),
  });
}


// ── Financial Reports ─────────────────────────────────────────────────────────
export async function getFinancialSummaryReport(period?: string, programType?: 'TVET' | 'SHORT_PROGRAM') {
  return apiFetch<any>(`/reports/summary${qs({ period, programType })}`);
}

export async function getAgedReceivablesReport(programType?: 'TVET' | 'SHORT_PROGRAM') {
  return apiFetch<any>(`/reports/aged-receivables${qs({ programType })}`);
}

// ── Notifications & Audit Logs ────────────────────────────────────────────────
export async function getNotifications() {
  return apiFetch<any>('/notifications');
}

export async function markNotificationRead(notificationId: string) {
  return apiFetch<any>('/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ notificationId }),
  });
}

export async function markAllNotificationsRead() {
  return apiFetch<any>('/notifications/read-all', { method: 'POST' });
}

export async function getAuditLogs(params?: { search?: string; module?: string; status?: string; page?: number; limit?: number }) {
  return apiFetch<any>(`/audit-logs${qs(params || {})}`);
}

// ── Settings ──────────────────────────────────────────────────────────────────
export async function getSettings() {
  return apiFetch<any>('/settings');
}

export async function updateSettings(data: Record<string, unknown>) {
  return apiFetch<any>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Programs & Registered Students for Monthly Fee Setup ─────────────────────
export async function getFeePrograms(academicContext?: 'TVET' | 'SHORT_PROGRAM') {
  return apiFetch<any[]>(`/programs${qs({ academicContext })}`);
}

export async function getRegisteredStudents(academicContext?: 'TVET' | 'SHORT_PROGRAM') {
  return apiFetch<any[]>(`/registered-students${qs({ academicContext })}`);
}

// ── Tuition & Monthly Fee Configurations ──────────────────────────────────────
export async function getTuitionConfigs(params?: {
  academicContext?: string;
  departmentId?: string;
  programId?: string;
  status?: string;
  billingMonth?: string;
  isActive?: boolean;
}) {
  return apiFetch<any[]>(`/tuition-configs${qs(params || {})}`);
}

export async function getTuitionConfig(id: string) {
  return apiFetch<any>(`/tuition-configs/${id}`);
}

export async function createTuitionConfig(data: {
  academicContext: 'TVET' | 'SHORT_PROGRAM';
  programId: string;
  departmentId?: string;
  billingMonth: string;
  monthlyAmount: number;
  dueDate: string;
  paymentInstructions?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  durationMonths?: number;
  academicYearLabel?: string;
  description?: string;
}) {
  return apiFetch<any>('/tuition-configs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function publishTuitionConfig(id: string) {
  return apiFetch<any>(`/tuition-configs/${id}/publish`, {
    method: 'POST',
  });
}

export async function reviseTuitionConfig(
  id: string,
  data: {
    monthlyAmount?: number;
    dueDate?: string;
    paymentInstructions?: string;
    description?: string;
  }
) {
  return apiFetch<any>(`/tuition-configs/${id}/revise`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTuitionConfig(
  id: string,
  data: Partial<{
    monthlyAmount: number;
    dueDate: string;
    paymentInstructions: string;
    status: 'DRAFT' | 'PUBLISHED';
    isActive: boolean;
    effectiveDate: string;
    description: string;
    durationMonths: number;
    academicYearLabel: string;
  }>
) {
  return apiFetch<any>(`/tuition-configs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTuitionConfig(id: string) {
  return apiFetch<any>(`/tuition-configs/${id}`, {
    method: 'DELETE',
  });
}

// ── Payment Submissions Review ────────────────────────────────────────────────
export async function getPaymentSubmissions(params?: {
  search?: string;
  programType?: 'TVET' | 'SHORT_PROGRAM';
  status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL';
  page?: number;
  limit?: number;
}) {
  return apiFetch<any>(`/payment-submissions${qs(params || {})}`);
}

export async function approvePaymentSubmission(id: string) {
  return apiFetch<any>(`/payment-submissions/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectPaymentSubmission(id: string, rejectionReason: string) {
  return apiFetch<any>(`/payment-submissions/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  });
}

export async function getPaymentSubmissionAnalytics() {
  return apiFetch<any>('/payment-submissions/analytics');
}

// ── Installment Operations ────────────────────────────────────────────────────
export async function generateStudentInstallments(studentRecordId: string) {
  return apiFetch<any>(`/installments/generate/${studentRecordId}`, {
    method: 'POST',
  });
}

export async function syncInstallmentStatuses() {
  return apiFetch<any>('/installments/sync-statuses', {
    method: 'POST',
  });
}

export async function sendPaymentReminders() {
  return apiFetch<any>('/installments/send-reminders', {
    method: 'POST',
  });
}

