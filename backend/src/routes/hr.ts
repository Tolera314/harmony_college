/**
 * /api/hr  — HR Officer routes
 *
 * All routes require: authenticate + requireRole([HR_OFFICER, ADMIN, SUPER_ADMIN])
 *
 * GET  /api/hr/dashboard
 * GET  /api/hr/departments
 *
 * GET  /api/hr/employees                         ?page&limit&search&departmentId&status&employmentType
 * GET  /api/hr/employees/:id
 * POST /api/hr/employees
 * PATCH /api/hr/employees/:id
 * PATCH /api/hr/employees/:id/deactivate
 *
 * GET  /api/hr/leave                             ?status&page&limit
 * GET  /api/hr/leave/balances                    ?employeeId
 * GET  /api/hr/leave/:id
 * PATCH /api/hr/leave/:id/review                 { action, comment }
 *
 * GET  /api/hr/payroll
 * GET  /api/hr/payroll/:id
 * PATCH /api/hr/payroll/:id/approve              { comment }
 * PATCH /api/hr/payroll/:id/lock
 *
 * GET  /api/hr/performance                       ?status
 * GET  /api/hr/performance/:id
 * POST /api/hr/performance
 * PATCH /api/hr/performance/:id/scores
 *
 * GET  /api/hr/documents                         ?search&category&employeeId
 * POST /api/hr/documents
 * DELETE /api/hr/documents/:id
 *
 * GET  /api/hr/onboarding
 * GET  /api/hr/onboarding/:employeeId
 * POST /api/hr/onboarding                        { employeeId }
 * PATCH /api/hr/onboarding/:employeeId/step      { stepKey, completed }
 * POST /api/hr/onboarding/:employeeId/complete
 *
 * GET  /api/hr/audit-logs                        ?search&module&page&limit
 *
 * GET  /api/hr/notifications
 * PATCH /api/hr/notifications/:id/read
 * POST  /api/hr/notifications/read-all
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import * as dashboard     from '../services/hr/hrDashboardService';
import * as employees     from '../services/hr/hrEmployeeService';
import * as leave         from '../services/hr/hrLeaveService';
import * as payroll       from '../services/hr/hrPayrollService';
import * as performance   from '../services/hr/hrPerformanceService';
import * as documents     from '../services/hr/hrDocumentService';
import * as onboarding    from '../services/hr/hrOnboardingService';
import * as offboarding   from '../services/hr/hrOffboardingService';
import * as audit         from '../services/hr/hrAuditService';
import * as notifications from '../services/hr/hrNotificationService';
import * as salaryHistory  from '../services/hr/hrSalaryHistoryService';
import * as contractRenewal from '../services/hr/hrContractRenewalService';

const router = Router();
const HR_ROLES = [Role.HR_OFFICER, Role.ADMIN, Role.SUPER_ADMIN];
router.use(authenticate, requireRole(HR_ROLES));

// ── Helpers ──────────────────────────────────────────────────────────────────
type Q = Record<string, string | undefined>;
const q  = (req: AuthRequest): Q => req.query as Q;
const pid = (req: AuthRequest, key = 'id'): string => req.params[key] as string;

function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({ success: true, data });
}
function fail(res: Response, err: unknown, def = 500) {
  const msg = err instanceof Error ? err.message : 'Unexpected error';
  const code = msg.includes('not found') ? 404
    : msg.includes('Unauthorized') ? 403
    : msg.includes('already exists') || msg.includes('already in use') ? 409
    : msg.includes('invalid') || msg.includes('required') || msg.includes('between') ? 422
    : def;
  res.status(code).json({ success: false, message: msg });
}

function actorName(req: AuthRequest): string {
  return (req.user as any)?.fullName ?? req.user?.email ?? 'HR Officer';
}

/** Resolve the full name of the authenticated user from the DB for audit logs */
async function resolveActorName(req: AuthRequest): Promise<string> {
  try {
    const { prisma } = await import('../lib/prisma');
    const u = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { fullName: true } });
    return u?.fullName ?? req.user?.email ?? 'HR Officer';
  } catch {
    return req.user?.email ?? 'HR Officer';
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', async (_req, res) => {
  try { ok(res, await dashboard.getHRDashboard()); }
  catch (e) { fail(res, e); }
});

// ── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', async (_req, res) => {
  try { ok(res, await employees.getDepartments()); }
  catch (e) { fail(res, e); }
});

// ── Courses (used in EmployeeFormPanel for INSTRUCTOR / DEPARTMENT_HEAD) ──────
router.get('/courses/options', async (_req, res) => {
  try {
    const { prisma } = await import('../lib/prisma');
    const courses = await prisma.course.findMany({
      where:   { status: 'ACTIVE' },
      select:  { id: true, code: true, name: true, creditHours: true, department: { select: { name: true } } },
      orderBy: { code: 'asc' },
    });
    ok(res, courses);
  } catch (e) { fail(res, e); }
});

// ── Employees ─────────────────────────────────────────────────────────────────
router.get('/employees', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await employees.listEmployees({
      page: parseInt(qp.page ?? '1', 10) || 1,
      limit: Math.min(100, parseInt(qp.limit ?? '20', 10) || 20),
      search:         qp.search,
      departmentId:   qp.departmentId,
      status:         qp.status,
      employmentType: qp.employmentType,
      systemRole:     qp.systemRole,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/employees/:id', async (req: AuthRequest, res) => {
  try {
    const emp = await employees.getEmployeeById(pid(req));
    if (!emp) { res.status(404).json({ success: false, message: 'Employee not found' }); return; }
    ok(res, emp);
  } catch (e) { fail(res, e); }
});

// Full employee detail including sensitive fields — HR only
router.get('/employees/:id/full', async (req: AuthRequest, res) => {
  try {
    const emp = await employees.getEmployeeByIdFull(pid(req));
    if (!emp) { res.status(404).json({ success: false, message: 'Employee not found' }); return; }
    ok(res, emp);
  } catch (e) { fail(res, e); }
});

router.post('/employees', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      employeeCode:   z.string().min(2).max(30),
      departmentId:   z.string().uuid(),
      fullName:       z.string().min(2).max(100),
      gender:         z.enum(['MALE', 'FEMALE']),
      email:          z.string().email(),
      phone:          z.string().optional(),
      dateOfBirth:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      address:        z.string().max(500).optional(),
      position:       z.string().min(2).max(100),
      employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
      systemRole:     z.string().max(30).optional(),
      courseId:       z.string().uuid().optional(),
      hireDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
      contractEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      managerId:      z.string().uuid().optional(),
      education:      z.string().optional(),
      experienceYears: z.number().int().min(0).max(60).optional(),
      basicSalary:    z.number().min(0),
      allowances:     z.number().min(0).optional(),
      deductions:     z.number().min(0).optional(),
      nationalId:     z.string().optional(),
      bankAccount:    z.string().optional(),
      taxNumber:      z.string().optional(),
      faydaIdUrl:         z.string().url().optional(),
      faydaIdFileSize:    z.string().optional(),
      certificateUrl:     z.string().url().optional(),
      certificateFileSize: z.string().optional(),
      emergencyName:      z.string().optional(),
      emergencyPhone:     z.string().optional(),
      emergencyRelation:  z.string().optional(),
      avatarUrl:      z.string().url().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor    = await resolveActorName(req);
    const actorRole = req.user!.role as string;  // from JWT — never trusted from body
    ok(res, await employees.createEmployee(parsed.data as any, actor, actorRole, req.user?.userId), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/employees/:id', async (req: AuthRequest, res) => {
  try {
    const actor     = await resolveActorName(req);
    const actorRole = req.user!.role as string;
    ok(res, await employees.updateEmployee(pid(req), req.body, actor, actorRole, req.user?.userId));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/employees/:id/deactivate', async (req: AuthRequest, res) => {
  try {
    const actor = await resolveActorName(req);
    ok(res, await employees.deactivateEmployee(pid(req), actor, req.user?.userId));
  } catch (e) { fail(res, e, 400); }
});

// ── Salary History ────────────────────────────────────────────────────────────
// GET  /api/hr/employees/:id/salary-history
// POST /api/hr/employees/:id/salary-history

router.get('/employees/:id/salary-history', async (req: AuthRequest, res) => {
  try { ok(res, await salaryHistory.getSalaryHistory(pid(req))); }
  catch (e) { fail(res, e); }
});

router.post('/employees/:id/salary-history', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
      basicSalary:   z.number().min(0),
      allowances:    z.number().min(0).default(0),
      deductions:    z.number().min(0).default(0),
      reason:        z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await salaryHistory.recordSalaryChange({
      employeeId:      pid(req),
      changedByName:   actor,
      changedByUserId: req.user?.userId,
      ...parsed.data,
    }), 201);
  } catch (e) { fail(res, e, 400); }
});

// ── Contract Renewals ─────────────────────────────────────────────────────────
// GET  /api/hr/employees/:id/contract-renewals
// POST /api/hr/employees/:id/contract-renewals

router.get('/employees/:id/contract-renewals', async (req: AuthRequest, res) => {
  try { ok(res, await contractRenewal.getContractRenewals(pid(req))); }
  catch (e) { fail(res, e); }
});

router.post('/employees/:id/contract-renewals', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      newEndDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
      reason:      z.string().max(500).optional(),
      documentId:  z.string().uuid().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await contractRenewal.renewContract({
      employeeId:       pid(req),
      approvedByName:   actor,
      approvedByUserId: req.user?.userId,
      hrRecipientUserId: req.user?.userId,
      ...parsed.data,
    }), 201);
  } catch (e) { fail(res, e, 400); }
});

// ── Leave ─────────────────────────────────────────────────────────────────────

router.get('/leave', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await leave.listLeaveRequests({
      status:     qp.status,
      employeeId: qp.employeeId,
      page:  parseInt(qp.page  ?? '1',  10) || 1,
      limit: parseInt(qp.limit ?? '50', 10) || 50,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/leave/balances', async (req: AuthRequest, res) => {
  try {
    ok(res, await leave.listLeaveBalances(q(req).employeeId));
  } catch (e) { fail(res, e); }
});

router.get('/leave/:id', async (req: AuthRequest, res) => {
  try { ok(res, await leave.getLeaveRequestById(pid(req))); }
  catch (e) { fail(res, e); }
});

router.patch('/leave/:id/review', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      action:  z.enum(['APPROVED', 'REJECTED']),
      comment: z.string().max(1000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await leave.reviewLeaveRequest(
      pid(req), parsed.data.action, parsed.data.comment,
      actor, req.user?.userId,
    ));
  } catch (e) { fail(res, e, 400); }
});

// ── Payroll ───────────────────────────────────────────────────────────────────
router.get('/payroll', async (_req, res) => {
  try { ok(res, await payroll.listPayrollRecords()); }
  catch (e) { fail(res, e); }
});

router.get('/payroll/:id', async (req: AuthRequest, res) => {
  try { ok(res, await payroll.getPayrollById(pid(req))); }
  catch (e) { fail(res, e); }
});

router.patch('/payroll/:id/approve', async (req: AuthRequest, res) => {
  try {
    const comment = z.string().max(1000).optional().parse(req.body?.comment);
    const actor = await resolveActorName(req);
    ok(res, await payroll.approvePayroll(pid(req), comment, actor, req.user?.userId));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/payroll/:id/lock', async (req: AuthRequest, res) => {
  try {
    const actor = await resolveActorName(req);
    ok(res, await payroll.lockPayroll(pid(req), actor, req.user?.userId));
  } catch (e) { fail(res, e, 400); }
});

// ── Performance ───────────────────────────────────────────────────────────────
router.get('/performance', async (req: AuthRequest, res) => {
  try { ok(res, await performance.listPerformanceReviews(q(req).status)); }
  catch (e) { fail(res, e); }
});

router.get('/performance/:id', async (req: AuthRequest, res) => {
  try { ok(res, await performance.getPerformanceReviewById(pid(req))); }
  catch (e) { fail(res, e); }
});

router.post('/performance', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      employeeId: z.string().uuid(),
      cycle:      z.enum(['QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']),
      period:     z.string().min(1).max(50),
      dueDate:    z.string(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await performance.createPerformanceReview(parsed.data, actor, req.user?.userId), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/performance/:id/scores', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      goalsScore:          z.number().min(1).max(5),
      competenciesScore:   z.number().min(1).max(5),
      attendanceScore:     z.number().min(1).max(5),
      communicationScore:  z.number().min(1).max(5),
      leadershipScore:     z.number().min(1).max(5),
      technicalScore:      z.number().min(1).max(5),
      managerComment:      z.string().max(2000).optional(),
      hrComment:           z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await performance.submitPerformanceScores(
      pid(req), parsed.data, actor, req.user?.userId,
    ));
  } catch (e) { fail(res, e, 400); }
});

// ── Documents ─────────────────────────────────────────────────────────────────
router.get('/documents', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await documents.listDocuments({
      search: qp.search, category: qp.category, employeeId: qp.employeeId,
    }));
  } catch (e) { fail(res, e); }
});

router.post('/documents', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      employeeId: z.string().uuid(),
      category:   z.enum(['CV','CONTRACT','NATIONAL_ID','CERTIFICATE','PERFORMANCE_REPORT','PAYSLIP','LEAVE_DOCUMENT']),
      title:      z.string().min(2).max(200),
      fileUrl:    z.string().url().optional(),
      fileSize:   z.string().optional(),
      version:    z.number().int().min(1).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await documents.createDocument(
      { ...parsed.data, uploadedByName: actor, uploadedByUserId: req.user?.userId },
      actor, req.user?.userId,
    ), 201);
  } catch (e) { fail(res, e, 400); }
});

router.delete('/documents/:id', async (req: AuthRequest, res) => {
  try {
    const actor = await resolveActorName(req);
    await documents.deleteDocument(pid(req), actor, req.user?.userId);
    res.status(204).send();
  } catch (e) { fail(res, e, 400); }
});

// ── Onboarding ────────────────────────────────────────────────────────────────
router.get('/onboarding', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await onboarding.listOnboardingRecords({
      page:  parseInt(qp.page  ?? '1',  10) || 1,
      limit: Math.min(50, parseInt(qp.limit ?? '12', 10) || 12),
      search:       qp.search,
      departmentId: qp.departmentId,
      status:       qp.status,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/onboarding/:employeeId', async (req: AuthRequest, res) => {
  try {
    const record = await onboarding.getOnboardingRecord(pid(req, 'employeeId'));
    if (!record) { res.status(404).json({ success: false, message: 'Onboarding record not found' }); return; }
    ok(res, record);
  } catch (e) { fail(res, e); }
});

router.post('/onboarding', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ employeeId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await onboarding.startOnboarding(parsed.data.employeeId, actor, req.user?.userId), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/onboarding/:employeeId/step', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ stepKey: z.string(), completed: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await onboarding.advanceOnboardingStep(
      pid(req, 'employeeId'), parsed.data.stepKey, parsed.data.completed,
      actor, req.user?.userId,
    ));
  } catch (e) { fail(res, e, 400); }
});

router.post('/onboarding/:employeeId/complete', async (req: AuthRequest, res) => {
  try {
    const actor = await resolveActorName(req);
    await onboarding.completeOnboarding(pid(req, 'employeeId'), actor, req.user?.userId);
    ok(res, { message: 'Onboarding completed' });
  } catch (e) { fail(res, e, 400); }
});

// ── Offboarding ───────────────────────────────────────────────────────────────
// GET  /api/hr/offboarding
// GET  /api/hr/offboarding/:employeeId
// POST /api/hr/offboarding
// PATCH /api/hr/offboarding/:id/assets/:assetId
// POST  /api/hr/offboarding/:id/finalize

router.get('/offboarding', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await offboarding.listOffboarding({
      page:  parseInt(qp.page  ?? '1',  10) || 1,
      limit: Math.min(50, parseInt(qp.limit ?? '12', 10) || 12),
      search:       qp.search,
      departmentId: qp.departmentId,
      status:       qp.status,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/offboarding/:employeeId', async (req: AuthRequest, res) => {
  try { ok(res, await offboarding.getOffboardingRecord(pid(req, 'employeeId'))); }
  catch (e) { fail(res, e); }
});

router.post('/offboarding', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      employeeId:      z.string().uuid(),
      lastWorkingDay:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
      exitReason:      z.enum(['RESIGNATION', 'TERMINATION', 'CONTRACT_EXPIRY', 'RETIREMENT']),
      customAssets:    z.array(z.string().max(100)).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await offboarding.startOffboarding({
      ...parsed.data,
      initiatedByName:   actor,
      initiatedByUserId: req.user?.userId,
      hrRecipientUserId: req.user?.userId,
    }), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/offboarding/:id/assets/:assetId', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      returned: z.boolean(),
      notes:    z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }
    const actor = await resolveActorName(req);
    ok(res, await offboarding.updateAssetItem({
      offboardingRecordId: pid(req),
      assetItemId:         req.params.assetId as string,
      returned:            parsed.data.returned,
      notes:               parsed.data.notes,
      actorName:           actor,
      actorUserId:         req.user?.userId,
    }));
  } catch (e) { fail(res, e, 400); }
});

router.post('/offboarding/:id/finalize', async (req: AuthRequest, res) => {
  try {
    const actor = await resolveActorName(req);
    await offboarding.finalizeOffboarding({
      offboardingRecordId: pid(req),
      actorName:           actor,
      actorUserId:         req.user?.userId,
    });
    ok(res, { message: 'Offboarding finalized' });
  } catch (e) { fail(res, e, 400); }
});

// ── Audit Logs ────────────────────────────────────────────────────────────────

router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await audit.listAuditLogs({
      page:  parseInt(qp.page  ?? '1',  10) || 1,
      limit: Math.min(100, parseInt(qp.limit ?? '20', 10) || 20),
      search: qp.search,
      module: qp.module,
    }));
  } catch (e) { fail(res, e); }
});

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    ok(res, await notifications.listNotifications(req.user!.userId));
  } catch (e) { fail(res, e); }
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    ok(res, await notifications.markNotificationRead(pid(req), req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

router.post('/notifications/read-all', async (req: AuthRequest, res) => {
  try {
    await notifications.markAllNotificationsRead(req.user!.userId);
    ok(res, { message: 'All notifications marked as read' });
  } catch (e) { fail(res, e); }
});

export default router;
