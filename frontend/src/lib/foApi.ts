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
export async function getOverviewData() {
  return apiFetch<any>('/overview');
}

// ── Student Accounts ──────────────────────────────────────────────────────────
export async function getStudentAccounts(params?: {
  search?: string;
  departmentId?: string;
  paymentStatus?: string;
  riskLevel?: string;
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
export async function getPendingRegistrationPayments(params?: { search?: string; page?: number; limit?: number }) {
  return apiFetch<any>(`/payments/pending${qs(params || {})}`);
}

export async function getVerifiedRegistrationPayments(params?: { search?: string; page?: number; limit?: number }) {
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

export async function getTransactions(params?: { search?: string; type?: string; status?: string; page?: number; limit?: number }) {
  return apiFetch<any>(`/transactions${qs(params || {})}`);
}

export async function reverseTransaction(transactionId: string, reason: string) {
  return apiFetch<any>(`/transactions/${transactionId}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ── Receipts ──────────────────────────────────────────────────────────────────
export async function getReceipts(params?: { search?: string; page?: number; limit?: number }) {
  return apiFetch<any>(`/receipts${qs(params || {})}`);
}

export async function getReceiptDetail(receiptId: string) {
  return apiFetch<any>(`/receipts/${receiptId}`);
}

// ── Outstanding & Reminders ───────────────────────────────────────────────────
export async function getOutstandingAccounts(params?: { search?: string; page?: number; limit?: number }) {
  return apiFetch<any>(`/outstanding${qs(params || {})}`);
}

export async function sendPaymentReminder(studentRecordId: string, message?: string) {
  return apiFetch<any>('/reminders/send', {
    method: 'POST',
    body: JSON.stringify({ studentRecordId, message }),
  });
}

// ── Gateway Reconciliation ─────────────────────────────────────────────────────
export async function getReconciliationEntries(params?: { status?: string; search?: string }) {
  return apiFetch<any>(`/reconciliation${qs(params || {})}`);
}

export async function matchReconciliation(id: string, matchedReceiptId?: string) {
  return apiFetch<any>(`/reconciliation/${id}/match`, {
    method: 'POST',
    body: JSON.stringify({ matchedReceiptId }),
  });
}

export async function flagReconciliation(id: string, notes?: string) {
  return apiFetch<any>(`/reconciliation/${id}/flag`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

// ── Financial Reports ─────────────────────────────────────────────────────────
export async function getFinancialSummaryReport(period?: string) {
  return apiFetch<any>(`/reports/summary${qs({ period })}`);
}

export async function getAgedReceivablesReport() {
  return apiFetch<any>('/reports/aged-receivables');
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

export async function getAuditLogs(params?: { search?: string; status?: string; page?: number; limit?: number }) {
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
