/**
 * Student Payments Service — Harmony College
 * Consolidated view of monthly fee payments, combining monthly fee setup with payment tracking.
 * Provides summary analytics and detailed student payment information for Finance Officers.
 */
import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

// ── Get Student Payments Summary & List ───────────────────────────────────────

export async function getStudentPaymentsSummary(params: {
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
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));
  const skip = (page - 1) * limit;

  // Build filter for program type
  const programTypeFilter = params.programType || 'TVET';
  
  // Build billing month filter (YYYY-MM format or just YYYY)
  let billingMonthFilter: string | undefined;
  if (params.billingMonth && params.billingYear) {
    billingMonthFilter = `${params.billingYear}-${params.billingMonth.padStart(2, '0')}`;
  } else if (params.billingYear) {
    // If only year provided, we'll filter in the query
    billingMonthFilter = undefined;
  }

  // Build where clause for students
  const studentWhere: any = {
    programType: programTypeFilter,
    status: { not: 'WITHDRAWN' },
  };

  if (params.programId) {
    studentWhere.programId = params.programId;
  }

  if (params.departmentId) {
    studentWhere.departmentId = params.departmentId;
  }

  if (params.search) {
    const q = params.search.trim();
    studentWhere.OR = [
      { user: { fullName: { contains: q, mode: 'insensitive' as Prisma.QueryMode } } },
      { studentId: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
    ];
  }

  // Get all students matching filters
  const students = await prisma.studentRecord.findMany({
    where: studentWhere,
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      program: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true, programType: true } },
      financialAccount: { select: { id: true, balance: true } },
      monthlyInstallments: {
        where: billingMonthFilter 
          ? { billingMonth: billingMonthFilter }
          : params.billingYear 
            ? { billingMonth: { startsWith: params.billingYear } }
            : {},
        include: {
          tuitionConfig: { select: { monthlyAmount: true, dueDate: true, status: true } },
          submissions: {
            where: { status: 'PENDING_REVIEW' },
            select: { id: true, amount: true, status: true },
          },
          receipt: {
            select: { id: true, receiptNumber: true, amountPaid: true, approvedAt: true },
          },
        },
      },
      paymentReceipts: billingMonthFilter
        ? { where: { billingMonth: billingMonthFilter } }
        : params.billingYear
          ? { where: { billingMonth: { startsWith: params.billingYear } } }
          : {},
    },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  // Calculate summary metrics
  let totalExpected = 0;
  let totalCollected = 0;
  let awaitingVerification = 0;

  const processedStudents = students.map((student) => {
    let studentExpected = 0;
    let studentPaid = 0;
    let hasPending = false;
    let paymentStatus = 'Unpaid';
    let dueDate: Date | null = null;

    // Sum up installments for this student
    for (const installment of student.monthlyInstallments) {
      studentExpected += installment.expectedAmount;
      
      if (installment.receipt) {
        studentPaid += installment.receipt.amountPaid;
      }

      if (installment.submissions.length > 0) {
        hasPending = true;
        awaitingVerification++;
      }

      if (installment.dueDate && (!dueDate || installment.dueDate < dueDate)) {
        dueDate = installment.dueDate;
      }
    }

    totalExpected += studentExpected;
    totalCollected += studentPaid;

    const outstanding = studentExpected - studentPaid;
    
    // Determine payment status
    if (studentPaid >= studentExpected && studentExpected > 0) {
      paymentStatus = 'Paid';
    } else if (studentPaid > 0 && studentPaid < studentExpected) {
      paymentStatus = 'Partial';
    } else if (hasPending) {
      paymentStatus = 'Pending Verification';
    } else if (dueDate && new Date() > dueDate && outstanding > 0) {
      paymentStatus = 'Overdue';
    } else {
      paymentStatus = 'Unpaid';
    }

    return {
      id: student.id,
      studentRecordId: student.id,
      studentId: student.studentId,
      name: student.user.fullName,
      email: student.user.email,
      phone: student.user.phone,
      programId: student.program.id,
      programName: student.program.name,
      programCode: student.program.code,
      departmentId: student.department.id,
      departmentName: student.department.name,
      departmentCode: student.department.code,
      programType: student.department.programType,
      monthlyFee: studentExpected,
      approvedPaid: studentPaid,
      outstanding,
      dueDate,
      paymentStatus,
      hasPendingSubmissions: hasPending,
      installments: student.monthlyInstallments.map((inst) => ({
        id: inst.id,
        billingMonth: inst.billingMonth,
        billingLabel: inst.billingLabel,
        expectedAmount: inst.expectedAmount,
        dueDate: inst.dueDate,
        status: inst.status,
        hasPendingSubmission: inst.submissions.length > 0,
        isPaid: inst.status === 'PAID',
        receiptNumber: inst.receipt?.receiptNumber,
      })),
    };
  });

  // Apply payment status filter if specified
  let filteredStudents = processedStudents;
  if (params.paymentStatus && params.paymentStatus !== 'ALL') {
    filteredStudents = processedStudents.filter((s) => {
      if (params.paymentStatus === 'Paid') return s.paymentStatus === 'Paid';
      if (params.paymentStatus === 'Partial') return s.paymentStatus === 'Partial';
      if (params.paymentStatus === 'Unpaid') return s.paymentStatus === 'Unpaid';
      if (params.paymentStatus === 'Pending') return s.paymentStatus === 'Pending Verification';
      if (params.paymentStatus === 'Overdue') return s.paymentStatus === 'Overdue';
      return true;
    });
  }

  const total = filteredStudents.length;
  const remaining = totalExpected - totalCollected;

  return {
    summary: {
      totalExpected: Math.round(totalExpected * 100) / 100,
      collected: Math.round(totalCollected * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      awaitingVerification,
    },
    students: filteredStudents,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ── Get Detailed Student Payment Info ────────────────────────────────────────

export async function getStudentPaymentDetails(studentRecordId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      program: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true, programType: true } },
      financialAccount: { 
        select: { 
          id: true, 
          balance: true,
          transactions: {
            orderBy: { transactionDate: 'desc' },
            take: 50,
          },
        },
      },
      monthlyInstallments: {
        orderBy: { billingMonth: 'desc' },
        include: {
          tuitionConfig: {
            select: {
              id: true,
              monthlyAmount: true,
              dueDate: true,
              status: true,
              paymentInstructions: true,
            },
          },
          submissions: {
            orderBy: { createdAt: 'desc' },
            include: {
              receipt: {
                select: {
                  id: true,
                  receiptNumber: true,
                  amountPaid: true,
                  approvedAt: true,
                },
              },
            },
          },
          receipt: {
            select: {
              id: true,
              receiptNumber: true,
              amountPaid: true,
              paymentDate: true,
              paymentMethod: true,
              referenceNumber: true,
              approvedAt: true,
              approvedByUserId: true,
            },
          },
        },
      },
      paymentReceipts: {
        orderBy: { approvedAt: 'desc' },
      },
    },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Calculate totals
  let totalExpected = 0;
  let totalPaid = 0;
  let totalPending = 0;

  for (const installment of student.monthlyInstallments) {
    totalExpected += installment.expectedAmount;
    
    if (installment.receipt) {
      totalPaid += installment.receipt.amountPaid;
    }

    const pendingSubmissions = installment.submissions.filter(
      (s) => s.status === 'PENDING_REVIEW'
    );
    
    for (const sub of pendingSubmissions) {
      totalPending += sub.amount;
    }
  }

  const outstanding = totalExpected - totalPaid;

  return {
    student: {
      id: student.id,
      studentId: student.studentId,
      name: student.user.fullName,
      email: student.user.email,
      phone: student.user.phone,
      programName: student.program.name,
      programCode: student.program.code,
      departmentName: student.department.name,
      programType: student.department.programType,
    },
    financialSummary: {
      totalExpected: Math.round(totalExpected * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      accountBalance: student.financialAccount?.balance ?? 0,
    },
    installments: student.monthlyInstallments.map((inst) => ({
      id: inst.id,
      billingMonth: inst.billingMonth,
      billingLabel: inst.billingLabel,
      expectedAmount: inst.expectedAmount,
      dueDate: inst.dueDate,
      status: inst.status,
      paymentInstructions: inst.tuitionConfig?.paymentInstructions,
      submissions: inst.submissions.map((sub) => ({
        id: sub.id,
        amount: sub.amount,
        paymentDate: sub.paymentDate,
        paymentMethod: sub.paymentMethod,
        referenceNumber: sub.referenceNumber,
        evidenceUrl: sub.evidenceUrl,
        evidenceFileName: sub.evidenceFileName,
        note: sub.note,
        status: sub.status,
        rejectionReason: sub.rejectionReason,
        reviewedAt: sub.reviewedAt,
        createdAt: sub.createdAt,
        receipt: sub.receipt,
      })),
      receipt: inst.receipt,
    })),
    paymentHistory: student.paymentReceipts,
    transactions: student.financialAccount?.transactions ?? [],
  };
}

// ── Get Available Programs for Filtering ──────────────────────────────────────

export async function getProgramsForFilter(programType?: 'TVET' | 'SHORT_PROGRAM') {
  const where: any = { isActive: true };
  if (programType) {
    where.department = { programType };
  }

  const programs = await prisma.program.findMany({
    where,
    include: {
      department: { select: { id: true, name: true, code: true, programType: true } },
    },
    orderBy: { name: 'asc' },
  });

  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    departmentId: p.departmentId,
    departmentName: p.department.name,
    programType: p.department.programType,
  }));
}
