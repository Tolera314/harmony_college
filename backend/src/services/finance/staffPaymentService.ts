/**
 * Finance Officer — Staff Payment Service
 * Manages monthly salary payments for staff members
 * Uses HR-assigned basicSalary as the source of truth
 */
import { prisma } from '../../lib/prisma';

interface GeneratePayrollParams {
  payrollMonth: string;  // YYYY-MM format or full month name
  payrollYear: number;
  actorUserId?: string;
  actorName?: string;
}

/**
 * Generate or retrieve monthly payroll for eligible staff
 * - Only includes ACTIVE employees
 * - Uses current basicSalary from HREmployee
 * - Prevents duplicates with unique constraint
 * - Returns existing records if already generated for this month/year
 */
export async function generatePayroll(params: GeneratePayrollParams) {
  const { payrollMonth, payrollYear, actorUserId, actorName } = params;

  // Find all eligible active staff
  const eligibleStaff = await prisma.hREmployee.findMany({
    where: {
      status: 'ACTIVE',
      isActive: true,
    },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      basicSalary: true,
      position: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  });

  // Create or skip payment records (unique constraint prevents duplicates)
  const results = await Promise.allSettled(
    eligibleStaff.map((emp) =>
      prisma.staffPayment.upsert({
        where: {
          employeeId_payrollMonth_payrollYear: {
            employeeId: emp.id,
            payrollMonth,
            payrollYear,
          },
        },
        update: {}, // Don't overwrite if exists
        create: {
          employeeId: emp.id,
          payrollMonth,
          payrollYear,
          assignedSalary: emp.basicSalary,
          status: 'PENDING',
        },
      })
    )
  );

  const created = results.filter((r) => r.status === 'fulfilled').length;

  return {
    totalEligible: eligibleStaff.length,
    created,
    totalExpected: eligibleStaff.reduce((sum, e) => sum + e.basicSalary, 0),
  };
}

/**
 * Get staff payments for a specific month/year with filters
 */
export async function getStaffPayments(params: {
  payrollMonth?: string;
  payrollYear?: number;
  departmentId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const {
    payrollMonth,
    payrollYear,
    departmentId,
    status,
    search,
    page = 1,
    limit = 50,
  } = params;

  const where: any = {};

  if (payrollMonth) where.payrollMonth = payrollMonth;
  if (payrollYear) where.payrollYear = payrollYear;
  if (status && status !== 'ALL') where.status = status;

  if (departmentId) {
    where.employee = { departmentId };
  }

  if (search) {
    where.OR = [
      { employee: { fullName: { contains: search, mode: 'insensitive' } } },
      { employee: { employeeCode: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.staffPayment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ payrollYear: 'desc' }, { payrollMonth: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            position: true,
            avatarUrl: true,
            email: true,
            phone: true,
            departmentId: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.staffPayment.count({ where }),
  ]);

  // Calculate summary statistics
  const allPaymentsForMonth = await prisma.staffPayment.findMany({
    where: {
      payrollMonth: payrollMonth || undefined,
      payrollYear: payrollYear || undefined,
    },
    select: {
      assignedSalary: true,
      status: true,
    },
  });

  const summary = {
    totalExpected: allPaymentsForMonth.reduce((sum, p) => sum + p.assignedSalary, 0),
    totalPaid: allPaymentsForMonth
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.assignedSalary, 0),
    pendingCount: allPaymentsForMonth.filter((p) => p.status === 'PENDING').length,
    paidCount: allPaymentsForMonth.filter((p) => p.status === 'PAID').length,
    failedCount: allPaymentsForMonth.filter((p) => p.status === 'FAILED').length,
  };

  return {
    payments,
    total,
    summary,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single payment detail
 */
export async function getStaffPaymentDetail(paymentId: string) {
  const payment = await prisma.staffPayment.findUnique({
    where: { id: paymentId },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          position: true,
          avatarUrl: true,
          email: true,
          phone: true,
          basicSalary: true,
          departmentId: true,
          hireDate: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  if (!payment) throw new Error('Staff payment not found');

  return payment;
}

/**
 * Record salary payment
 * Updates status to PAID and records payment details
 * This represents the actual confirmed payment
 * ALSO creates a FinancialTransaction record for central reporting
 */
export async function recordPayment(params: {
  paymentId: string;
  paymentDate: Date;
  paymentMethod: string;
  transactionReference?: string;
  notes?: string;
  paidByUserId?: string;
  paidByName: string;
}) {
  const {
    paymentId,
    paymentDate,
    paymentMethod,
    transactionReference,
    notes,
    paidByUserId,
    paidByName,
  } = params;

  const existing = await prisma.staffPayment.findUnique({
    where: { id: paymentId },
    include: {
      employee: {
        select: {
          fullName: true,
          employeeCode: true,
        },
      },
    },
  });

  if (!existing) throw new Error('Staff payment not found');
  if (existing.status === 'PAID') throw new Error('Payment already recorded as paid');

  // Create both StaffPayment update AND FinancialTransaction atomically
  const [updated, transaction] = await prisma.$transaction([
    // Update staff payment status
    prisma.staffPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paymentDate,
        paymentMethod,
        transactionReference,
        notes,
        paidByUserId,
        paidByName,
      },
    }),
    
    // Create central FinancialTransaction record
    prisma.financialTransaction.create({
      data: {
        type: 'SALARY',
        amount: existing.assignedSalary, // Positive = expense (money out)
        description: `Staff Salary - ${existing.employee.fullName} (${existing.employee.employeeCode}) - ${existing.payrollMonth} ${existing.payrollYear}`,
        category: 'Staff Salary', // Legacy string field
        financialCategory: 'STAFF_SALARY',
        status: 'POSTED',
        referenceId: transactionReference || null,
        transactionDate: paymentDate,
        staffPaymentId: existing.id,
      },
    }),
  ]);

  // Link the transaction back to the staff payment
  await prisma.staffPayment.update({
    where: { id: paymentId },
    data: { transactionId: transaction.id },
  });

  return updated;
}

/**
 * Mark payment as failed or cancelled
 */
export async function markPaymentFailed(params: {
  paymentId: string;
  notes: string;
  updatedByUserId?: string;
  updatedByName: string;
}) {
  const { paymentId, notes, updatedByUserId, updatedByName } = params;

  const existing = await prisma.staffPayment.findUnique({
    where: { id: paymentId },
  });

  if (!existing) throw new Error('Staff payment not found');
  if (existing.status === 'PAID') throw new Error('Cannot mark paid payment as failed');

  const updated = await prisma.staffPayment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      notes,
      paidByUserId: updatedByUserId,
      paidByName: updatedByName,
    },
  });

  return updated;
}

/**
 * Reset payment to pending (for retry)
 */
export async function resetPaymentToPending(params: {
  paymentId: string;
  notes?: string;
}) {
  const { paymentId, notes } = params;

  const existing = await prisma.staffPayment.findUnique({
    where: { id: paymentId },
  });

  if (!existing) throw new Error('Staff payment not found');
  if (existing.status === 'PAID') throw new Error('Cannot reset paid payment');

  const updated = await prisma.staffPayment.update({
    where: { id: paymentId },
    data: {
      status: 'PENDING',
      paymentDate: null,
      paymentMethod: null,
      transactionReference: null,
      notes: notes || null,
    },
  });

  return updated;
}

/**
 * Get financial summary for staff payments (for reporting)
 * Only counts PAID payments as actual expenses
 */
export async function getStaffPaymentsSummary(params: {
  startDate?: Date;
  endDate?: Date;
  year?: number;
}) {
  const { startDate, endDate, year } = params;

  const where: any = {};

  if (year) {
    where.payrollYear = year;
  }

  if (startDate && endDate) {
    where.paymentDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  // Only PAID payments count as actual expenses
  const paidPayments = await prisma.staffPayment.findMany({
    where: {
      ...where,
      status: 'PAID',
    },
    select: {
      assignedSalary: true,
      paymentDate: true,
      payrollMonth: true,
    },
  });

  const totalPaidExpenses = paidPayments.reduce((sum, p) => sum + p.assignedSalary, 0);
  const paymentCount = paidPayments.length;

  // Get pending payments for visibility
  const pendingPayments = await prisma.staffPayment.count({
    where: {
      ...where,
      status: 'PENDING',
    },
  });

  return {
    totalPaidExpenses,
    paymentCount,
    pendingCount: pendingPayments,
    payments: paidPayments,
  };
}

/**
 * Get distinct departments that have staff
 */
export async function getStaffDepartments() {
  const departments = await prisma.hRDepartment.findMany({
    where: {
      employees: {
        some: {
          status: 'ACTIVE',
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return departments;
}
