import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';
import { getEmailProvider } from '../../lib/providers';

export async function listLeaveRequests(q: {
  status?: string; employeeId?: string;
  page?: number; limit?: number;
}) {
  const { status, employeeId, page = 1, limit = 50 } = q;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status && status !== 'All') where.status = status;
  if (employeeId) where.employeeId = employeeId;

  const [total, requests] = await Promise.all([
    prisma.hRLeaveRequest.count({ where }),
    prisma.hRLeaveRequest.findMany({
      where, skip, take: limit,
      orderBy: { submittedAt: 'desc' },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, avatarUrl: true, position: true,
            department: { select: { name: true } } },
        },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), requests };
}

export async function getLeaveRequestById(id: string) {
  const req = await prisma.hRLeaveRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, fullName: true, employeeCode: true, avatarUrl: true, position: true } },
    },
  });
  if (!req) throw new Error('Leave request not found');
  return req;
}

export async function reviewLeaveRequest(
  id: string,
  action: 'APPROVED' | 'REJECTED',
  comment: string | undefined,
  actorName: string,
  actorUserId?: string,
) {
  const req = await prisma.hRLeaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true } } },
  });
  if (!req) throw new Error('Leave request not found');
  if (req.status !== 'PENDING') throw new Error('Leave request is not pending');

  // Validate: end date >= start date
  if (req.endDate < req.startDate) throw new Error('End date cannot be before start date');

  const updated = await prisma.hRLeaveRequest.update({
    where: { id },
    data: {
      status:         action,
      hrApproval:     action,
      reviewComment:  comment ?? null,
      reviewedAt:     new Date(),
      reviewedByUserId: actorUserId ?? null,
    },
  });

  // Debit leave balance if approved
  if (action === 'APPROVED') {
    const year = new Date(req.startDate).getFullYear();
    const balance = await prisma.hRLeaveBalance.findUnique({
      where: { employeeId_leaveType_year: { employeeId: req.employeeId, leaveType: req.leaveType, year } },
    });
    if (balance) {
      await prisma.hRLeaveBalance.update({
        where: { id: balance.id },
        data: {
          taken:     balance.taken + req.daysCount,
          remaining: Math.max(0, balance.remaining - req.daysCount),
        },
      });
    }
  }

  await writeHRAudit({
    actorUserId, actorName,
    action: action === 'APPROVED' ? 'Leave Approved' : 'Leave Rejected',
    employeeName: req.employee.fullName,
    module: 'Leave',
    description: `${action === 'APPROVED' ? 'Approved' : 'Rejected'} ${req.leaveType} leave for ${req.employee.fullName} (${req.daysCount} days).${comment ? ` Reason: ${comment}` : ''}`,
    status: action === 'APPROVED' ? 'SUCCESS' : 'FAILED',
  });

  // Email notification to the employee
  try {
    const empRecord = await prisma.hREmployee.findUnique({
      where:  { id: req.employeeId },
      select: { email: true, fullName: true },
    });
    if (empRecord?.email) {
      const emailProvider = getEmailProvider();
      const leaveLabel = req.leaveType.charAt(0) + req.leaveType.slice(1).toLowerCase();
      const approved   = action === 'APPROVED';
      await emailProvider.sendHrNotificationEmail(empRecord.email, {
        recipientName: empRecord.fullName,
        subject:       `Leave Request ${approved ? 'Approved' : 'Rejected'} — Harmony College HR`,
        heading:       `Your ${leaveLabel} Leave Has Been ${approved ? 'Approved ✓' : 'Rejected ✗'}`,
        body: approved
          ? `Your ${leaveLabel} leave request for ${req.daysCount} day(s) (${new Date(req.startDate).toLocaleDateString()} – ${new Date(req.endDate).toLocaleDateString()}) has been approved.\n\nPlease make necessary arrangements. If you have questions, contact the HR office.`
          : `Your ${leaveLabel} leave request for ${req.daysCount} day(s) (${new Date(req.startDate).toLocaleDateString()} – ${new Date(req.endDate).toLocaleDateString()}) has been rejected.\n\nReason: ${comment ?? 'No reason provided.'}\n\nPlease contact the HR office if you have questions.`,
      });
    }
  } catch (emailErr) {
    // Never let email failure block the HR action
    console.error('[hrLeaveService] Failed to send leave notification email:', emailErr);
  }

  return updated;
}

export async function listLeaveBalances(employeeId?: string) {
  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  return prisma.hRLeaveBalance.findMany({
    where,
    include: { employee: { select: { id: true, fullName: true, avatarUrl: true, position: true } } },
    orderBy: [{ employee: { fullName: 'asc' } }, { leaveType: 'asc' }],
  });
}
