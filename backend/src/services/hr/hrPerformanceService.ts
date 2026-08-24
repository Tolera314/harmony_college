import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';

export async function listPerformanceReviews(filter?: string) {
  const where: any = {};
  if (filter && filter !== 'All') where.status = filter;
  return prisma.hRPerformanceReview.findMany({
    where,
    orderBy: { dueDate: 'asc' },
    include: {
      employee: { select: { id: true, fullName: true, avatarUrl: true, position: true, employeeCode: true } },
    },
  });
}

export async function getPerformanceReviewById(id: string) {
  const review = await prisma.hRPerformanceReview.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, fullName: true, avatarUrl: true, position: true } },
    },
  });
  if (!review) throw new Error('Performance review not found');
  return review;
}

export async function submitPerformanceScores(
  id: string,
  scores: {
    goalsScore: number; competenciesScore: number; attendanceScore: number;
    communicationScore: number; leadershipScore: number; technicalScore: number;
    managerComment?: string; hrComment?: string;
  },
  actorName: string,
  actorUserId?: string,
) {
  const review = await prisma.hRPerformanceReview.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true } } },
  });
  if (!review) throw new Error('Performance review not found');
  if (review.status === 'COMPLETED') throw new Error('Review already completed');

  // Validate scores are 1–5
  const scoreFields = [scores.goalsScore, scores.competenciesScore, scores.attendanceScore,
    scores.communicationScore, scores.leadershipScore, scores.technicalScore];
  for (const s of scoreFields) {
    if (s < 1 || s > 5) throw new Error('Scores must be between 1 and 5');
  }

  const overall = parseFloat(
    (scoreFields.reduce((a, b) => a + b, 0) / scoreFields.length).toFixed(2)
  );

  const updated = await prisma.hRPerformanceReview.update({
    where: { id },
    data: {
      ...scores,
      overallScore:  overall,
      status:        'COMPLETED',
      completedAt:   new Date(),
    },
  });

  await writeHRAudit({
    actorUserId, actorName,
    action: 'Performance Review Completed',
    employeeName: review.employee.fullName,
    module: 'Performance',
    description: `${review.cycle} review for ${review.employee.fullName} completed. Score: ${overall}/5.`,
    status: 'SUCCESS',
  });

  return updated;
}

export async function createPerformanceReview(data: {
  employeeId: string; cycle: string; period: string; dueDate: string;
}, actorName: string, actorUserId?: string) {
  const emp = await prisma.hREmployee.findUnique({ where: { id: data.employeeId }, select: { fullName: true } });
  if (!emp) throw new Error('Employee not found');

  const review = await prisma.hRPerformanceReview.create({
    data: {
      employeeId: data.employeeId,
      cycle:      data.cycle as any,
      period:     data.period,
      dueDate:    new Date(data.dueDate),
      status:     'PENDING',
    },
  });

  await writeHRAudit({
    actorUserId, actorName, action: 'Performance Review Created', employeeName: emp.fullName,
    module: 'Performance',
    description: `${data.cycle} review created for ${emp.fullName}, period: ${data.period}, due: ${data.dueDate}.`,
    status: 'SUCCESS',
  });

  return review;
}
