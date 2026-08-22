/**
 * /api/finance-officer — Finance Officer REST API routes
 * All routes require: authenticate + requireRole([FINANCE_OFFICER, ADMIN, SUPER_ADMIN])
 */

import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/auth';

import * as foOverviewService from '../services/finance/foOverviewService';
import * as foStudentAccountService from '../services/finance/foStudentAccountService';
import * as foPaymentService from '../services/finance/foPaymentService';
import * as foReceiptService from '../services/finance/foReceiptService';
import * as foReconciliationService from '../services/finance/foReconciliationService';
import * as foReportService from '../services/finance/foReportService';
import * as foAuditService from '../services/finance/foAuditService';
import * as foNotificationService from '../services/finance/foNotificationService';
import * as foSettingsService from '../services/finance/foSettingsService';

const router = Router();
const FO_ROLES = [Role.FINANCE_OFFICER, Role.ADMIN, Role.SUPER_ADMIN];

router.use(authenticate, requireRole(FO_ROLES));

function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}

function fail(res: Response, err: unknown, status = 500) {
  const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
  res.status(status).json({ error: msg });
}

// ── OVERVIEW / DASHBOARD ANITICS ──────────────────────────────────────────────
router.get('/overview', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await foOverviewService.getOverviewData();
    ok(res, data);
  } catch (err) {
    console.error('[FO/overview]', err);
    fail(res, err);
  }
});

// ── STUDENT ACCOUNTS ──────────────────────────────────────────────────────────
router.get('/student-accounts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foStudentAccountService.listStudentAccounts({
      search: query.search,
      departmentId: query.departmentId,
      paymentStatus: query.paymentStatus,
      riskLevel: query.riskLevel,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
    ok(res, data);
  } catch (err) {
    console.error('[FO/student-accounts]', err);
    fail(res, err);
  }
});

router.get('/student-accounts/:studentRecordId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentRecordId = String(req.params.studentRecordId);
    const data = await foStudentAccountService.getStudentAccountDetail(studentRecordId);
    ok(res, data);
  } catch (err) {
    console.error('[FO/student-accounts/:id]', err);
    fail(res, err, 404);
  }
});

router.post('/student-accounts/:studentRecordId/charge', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentRecordId = String(req.params.studentRecordId);
    const { amount, description, category } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Valid charge amount is required' });
      return;
    }
    const result = await foStudentAccountService.postCharge(
      studentRecordId,
      { amount: Number(amount), description: description || 'Fee Charge', category: category || 'Fee' },
      req.user!.userId
    );
    await foAuditService.logFinanceAction({
      actorUserId: req.user!.userId,
      actorName: 'Finance Officer',
      action: `Posted Charge: ${description || category} (ETB ${amount})`,
      module: 'Student Accounts',
      amount: Number(amount),
    });
    ok(res, result);
  } catch (err) {
    console.error('[FO/student-accounts/charge]', err);
    fail(res, err, 400);
  }
});

router.post('/student-accounts/:studentRecordId/credit', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentRecordId = String(req.params.studentRecordId);
    const { amount, description, category } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Valid credit amount is required' });
      return;
    }
    const result = await foStudentAccountService.postCredit(
      studentRecordId,
      { amount: Number(amount), description: description || 'Discount/Scholarship', category: category || 'Scholarship' },
      req.user!.userId
    );
    await foAuditService.logFinanceAction({
      actorUserId: req.user!.userId,
      actorName: 'Finance Officer',
      action: `Posted Credit/Discount: ${description || category} (ETB ${amount})`,
      module: 'Student Accounts',
      amount: Number(amount),
    });
    ok(res, result);
  } catch (err) {
    console.error('[FO/student-accounts/credit]', err);
    fail(res, err, 400);
  }
});

router.post('/student-accounts/:studentRecordId/clearance', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentRecordId = String(req.params.studentRecordId);
    const { clearedForTerm } = req.body;
    const result = await foStudentAccountService.updateAccountClearance(
      studentRecordId,
      { clearedForTerm: clearedForTerm || null },
      req.user!.userId
    );
    ok(res, result);
  } catch (err) {
    console.error('[FO/student-accounts/clearance]', err);
    fail(res, err, 400);
  }
});

// ── REGISTRATION PAYMENTS VERIFICATION (PRESERVED & ENHANCED) ──────────────────
router.get('/payments/pending', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foPaymentService.getPendingRegistrationPayments(query);
    ok(res, data);
  } catch (err) {
    console.error('[FO/payments/pending]', err);
    fail(res, err);
  }
});

router.get('/payments/verified', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foPaymentService.getVerifiedRegistrationPayments(query);
    ok(res, data);
  } catch (err) {
    console.error('[FO/payments/verified]', err);
    fail(res, err);
  }
});

router.post('/payments/:userId/verify', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const result = await foPaymentService.verifyRegistrationPayment(userId, req.user!.userId);
    await foAuditService.logFinanceAction({
      actorUserId: req.user!.userId,
      actorName: 'Finance Officer',
      action: 'Verified Registration Fee Payment',
      module: 'Admissions & Verifications',
      previousValue: 'Unverified',
      newValue: 'Verified',
    });
    ok(res, result);
  } catch (err) {
    console.error('[FO/payments/verify]', err);
    fail(res, err, 400);
  }
});

router.post('/payments/:userId/unverify', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const result = await foPaymentService.unverifyRegistrationPayment(userId);
    await foAuditService.logFinanceAction({
      actorUserId: req.user!.userId,
      actorName: 'Finance Officer',
      action: 'Unverified Registration Fee Payment',
      module: 'Admissions & Verifications',
      previousValue: 'Verified',
      newValue: 'Unverified',
    });
    ok(res, result);
  } catch (err) {
    console.error('[FO/payments/unverify]', err);
    fail(res, err, 400);
  }
});

// ── DIRECT PAYMENT RECORDING & TRANSACTIONS ───────────────────────────────────
router.post('/payments/record', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentRecordId, amount, paymentMethod, referenceNumber, description, category } = req.body;
    if (!studentRecordId || !amount || amount <= 0 || !paymentMethod) {
      res.status(400).json({ error: 'studentRecordId, valid positive amount, and paymentMethod are required' });
      return;
    }
    const result = await foPaymentService.recordStudentPayment(
      {
        studentRecordId,
        amount: Number(amount),
        paymentMethod,
        referenceNumber,
        description,
        category,
      },
      req.user!.userId
    );
    await foAuditService.logFinanceAction({
      actorUserId: req.user!.userId,
      actorName: 'Finance Officer',
      action: `Recorded Payment via ${paymentMethod} (ETB ${amount})`,
      module: 'Payments & Collections',
      amount: Number(amount),
    });
    ok(res, result, 201);
  } catch (err) {
    console.error('[FO/payments/record]', err);
    fail(res, err, 400);
  }
});

router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foPaymentService.listTransactions({
      search: query.search,
      type: query.type,
      status: query.status,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
    ok(res, data);
  } catch (err) {
    console.error('[FO/transactions]', err);
    fail(res, err);
  }
});

router.post('/transactions/:id/reverse', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body;
    const result = await foPaymentService.reverseTransaction(id, reason || 'Transaction reversed by FO', req.user!.userId);
    await foAuditService.logFinanceAction({
      actorUserId: req.user!.userId,
      actorName: 'Finance Officer',
      action: `Reversed Transaction ${id}: ${reason || 'N/A'}`,
      module: 'Transactions',
      status: 'Warning',
    });
    ok(res, result);
  } catch (err) {
    console.error('[FO/transactions/reverse]', err);
    fail(res, err, 400);
  }
});

// ── RECEIPTS ──────────────────────────────────────────────────────────────────
router.get('/receipts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foReceiptService.listReceipts({
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
    ok(res, data);
  } catch (err) {
    console.error('[FO/receipts]', err);
    fail(res, err);
  }
});

router.get('/receipts/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const data = await foReceiptService.getReceiptDetail(id);
    ok(res, data);
  } catch (err) {
    console.error('[FO/receipts/:id]', err);
    fail(res, err, 404);
  }
});

// ── OUTSTANDING & REMINDERS ───────────────────────────────────────────────────
router.get('/outstanding', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foStudentAccountService.listStudentAccounts({
      paymentStatus: 'Unpaid',
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
    ok(res, data);
  } catch (err) {
    console.error('[FO/outstanding]', err);
    fail(res, err);
  }
});

router.post('/reminders/send', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentRecordId, message } = req.body;
    if (!studentRecordId) {
      res.status(400).json({ error: 'studentRecordId is required' });
      return;
    }
    const result = await foNotificationService.sendPaymentReminder(studentRecordId, message, req.user!.userId);
    ok(res, result);
  } catch (err) {
    console.error('[FO/reminders/send]', err);
    fail(res, err, 400);
  }
});

// ── RECONCILIATION ─────────────────────────────────────────────────────────────
router.get('/reconciliation', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foReconciliationService.listReconciliationEntries({
      status: query.status,
      search: query.search,
    });
    ok(res, data);
  } catch (err) {
    console.error('[FO/reconciliation]', err);
    fail(res, err);
  }
});

router.post('/reconciliation/:id/match', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { matchedReceiptId } = req.body;
    const result = await foReconciliationService.matchReconciliation(id, matchedReceiptId || 'REC-AUTO-MATCH', req.user!.userId);
    ok(res, result);
  } catch (err) {
    console.error('[FO/reconciliation/match]', err);
    fail(res, err, 400);
  }
});

router.post('/reconciliation/:id/flag', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { notes } = req.body;
    const result = await foReconciliationService.flagReconciliation(id, notes || 'Flagged for review', req.user!.userId);
    ok(res, result);
  } catch (err) {
    console.error('[FO/reconciliation/flag]', err);
    fail(res, err, 400);
  }
});

// ── REPORTS ───────────────────────────────────────────────────────────────────
router.get('/reports/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foReportService.getFinancialSummaryReport(query.period);
    ok(res, data);
  } catch (err) {
    console.error('[FO/reports/summary]', err);
    fail(res, err);
  }
});

router.get('/reports/aged-receivables', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await foReportService.getAgedReceivablesReport();
    ok(res, data);
  } catch (err) {
    console.error('[FO/reports/aged-receivables]', err);
    fail(res, err);
  }
});

// ── NOTIFICATIONS & AUDIT LOGS ────────────────────────────────────────────────
router.get('/notifications', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await foNotificationService.getNotifications(req.user!.userId);
    ok(res, data);
  } catch (err) {
    console.error('[FO/notifications]', err);
    fail(res, err);
  }
});

router.post('/notifications/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.body;
    const result = await foNotificationService.markAsRead(notificationId, req.user!.userId);
    ok(res, result);
  } catch (err) {
    console.error('[FO/notifications/read]', err);
    fail(res, err, 400);
  }
});

router.post('/notifications/read-all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await foNotificationService.markAllAsRead(req.user!.userId);
    ok(res, result);
  } catch (err) {
    console.error('[FO/notifications/read-all]', err);
    fail(res, err);
  }
});

router.get('/audit-logs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const data = await foAuditService.getAuditLogs({
      search: query.search,
      status: query.status,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });
    ok(res, data);
  } catch (err) {
    console.error('[FO/audit-logs]', err);
    fail(res, err);
  }
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────
router.get('/settings', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await foSettingsService.getSettings();
    ok(res, data);
  } catch (err) {
    console.error('[FO/settings/get]', err);
    fail(res, err);
  }
});

router.put('/settings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await foSettingsService.updateSettings(req.body);
    ok(res, result);
  } catch (err) {
    console.error('[FO/settings/put]', err);
    fail(res, err, 400);
  }
});

export default router;
