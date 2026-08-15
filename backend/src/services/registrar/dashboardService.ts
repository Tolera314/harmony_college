import { prisma } from '../../lib/prisma';
import { ApplicationStatus, StudentStatus, CourseStatus, OfferingStatus, EnrollmentStatus, RegistrarAction } from '@prisma/client';

export async function getDashboardStats() {
  const [
    pendingAdmissions,
    activeStudents,
    activePrograms,
    activeCourses,
    activeOfferings,
    totalEnrollments,
    pendingTranscripts,
    pendingGraduation,
    recentActivity,
    upcomingEvents,
    offeringCapacity,
  ] = await Promise.all([
    prisma.application.count({ where: { status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] } } }),
    prisma.studentRecord.count({ where: { status: StudentStatus.ACTIVE } }),
    prisma.program.count({ where: { isActive: true } }),
    prisma.course.count({ where: { status: CourseStatus.ACTIVE } }),
    prisma.courseOffering.count({ where: { status: { in: [OfferingStatus.SCHEDULED, OfferingStatus.ACTIVE] } } }),
    prisma.enrollment.count({ where: { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED] } } }),
    prisma.transcriptRequest.count({ where: { status: { in: ['PENDING', 'PROCESSING'] as any } } }),
    prisma.graduationAudit.count({ where: { status: 'PENDING' as any } }),

    prisma.registrarAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, role: true } } },
    }),

    prisma.academicCalendarEvent.findMany({
      where: { startDate: { gte: new Date() }, isPublished: true },
      orderBy: { startDate: 'asc' },
      take: 5,
      select: { id: true, title: true, eventType: true, startDate: true, endDate: true },
    }),

    prisma.courseOffering.findMany({
      where: { status: { in: [OfferingStatus.SCHEDULED, OfferingStatus.ACTIVE] } },
      select: {
        capacity: true,
        _count: { select: { enrollments: { where: { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED] } } } } },
      },
    }),
  ]);

  const totalCapacity = offeringCapacity.reduce((sum, o) => sum + o.capacity, 0);
  const totalSeatsUsed = offeringCapacity.reduce((sum, o) => sum + o._count.enrollments, 0);
  const availableSeats = totalCapacity - totalSeatsUsed;

  // Schedule conflicts: offerings sharing same room+time slot
  const conflicts = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM (
      SELECT t1."roomId", t1."dayOfWeek", t1."startTime"
      FROM "TimetableSlot" t1
      JOIN "TimetableSlot" t2
        ON t1."roomId" = t2."roomId"
        AND t1."dayOfWeek" = t2."dayOfWeek"
        AND t1."startTime" = t2."startTime"
        AND t1.id <> t2.id
        AND t1."roomId" IS NOT NULL
      GROUP BY t1."roomId", t1."dayOfWeek", t1."startTime"
    ) conflicts
  `;
  const scheduleConflicts = Number(conflicts[0]?.count ?? 0);

  return {
    pendingAdmissions,
    activeStudents,
    activePrograms,
    activeCourses,
    activeOfferings,
    totalEnrollments,
    availableSeats,
    scheduleConflicts,
    pendingTranscripts,
    pendingGraduation,
    recentActivity: recentActivity.map(a => ({
      id: a.id,
      action: a.action,
      description: a.description,
      entityType: a.entityType,
      actor: a.user.fullName,
      createdAt: a.createdAt,
    })),
    upcomingEvents,
  };
}
