/**
 * Finance Officer — Staff Payments Routes
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as staffPaymentService from '../services/finance/staffPaymentService';

const router = Router();

// All routes require FINANCE_OFFICER role
router.use(authenticate, requireRole(['FINANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN']));

/**
 * POST /generate-payroll
 * Generate monthly payroll for all eligible staff
 */
router.post('/generate-payroll', async (req, res, next) => {
  try {
    const { payrollMonth, payrollYear } = req.body;

    if (!payrollMonth || !payrollYear) {
      return res.status(400).json({ error: 'payrollMonth and payrollYear are required' });
    }

    const result = await staffPaymentService.generatePayroll({
      payrollMonth,
      payrollYear: parseInt(payrollYear),
      actorUserId: (req as any).userId,
      actorName: (req as any).fullName || 'Unknown',
    });

    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /
 * List staff payments with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      payrollMonth,
      payrollYear,
      departmentId,
      status,
      search,
      page,
      limit,
    } = req.query;

    const result = await staffPaymentService.getStaffPayments({
      payrollMonth: payrollMonth as string | undefined,
      payrollYear: payrollYear ? parseInt(payrollYear as string) : undefined,
      departmentId: departmentId as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /:id
 * Get single payment detail
 */
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await staffPaymentService.getStaffPaymentDetail(req.params.id);
    res.json(payment);
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /:id/record-payment
 * Record actual salary payment
 */
router.post('/:id/record-payment', async (req, res, next) => {
  try {
    const {
      paymentDate,
      paymentMethod,
      transactionReference,
      notes,
    } = req.body;

    if (!paymentDate || !paymentMethod) {
      return res.status(400).json({ error: 'paymentDate and paymentMethod are required' });
    }

    const updated = await staffPaymentService.recordPayment({
      paymentId: req.params.id,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      transactionReference,
      notes,
      paidByUserId: (req as any).userId,
      paidByName: (req as any).fullName || 'Unknown',
    });

    res.json(updated);
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /:id/mark-failed
 * Mark payment as failed
 */
router.post('/:id/mark-failed', async (req, res, next) => {
  try {
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'notes are required' });
    }

    const updated = await staffPaymentService.markPaymentFailed({
      paymentId: req.params.id,
      notes,
      updatedByUserId: (req as any).userId,
      updatedByName: (req as any).fullName || 'Unknown',
    });

    res.json(updated);
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /:id/reset
 * Reset payment to pending for retry
 */
router.post('/:id/reset', async (req, res, next) => {
  try {
    const { notes } = req.body;

    const updated = await staffPaymentService.resetPaymentToPending({
      paymentId: req.params.id,
      notes,
    });

    res.json(updated);
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /summary
 * Get financial summary
 */
router.get('/api/summary', async (req, res, next) => {
  try {
    const { year, startDate, endDate } = req.query;

    const summary = await staffPaymentService.getStaffPaymentsSummary({
      year: year ? parseInt(year as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json(summary);
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /departments
 * Get departments with staff
 */
router.get('/api/departments', async (req, res, next) => {
  try {
    const departments = await staffPaymentService.getStaffDepartments();
    res.json({ departments });
  } catch (error: any) {
    next(error);
  }
});

export default router;
