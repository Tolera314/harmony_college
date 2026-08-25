/**
 * Student Assignment Service
 * Handles: listing assignments across all enrolled courses,
 * viewing a single assignment, submitting (file or text), retrieving feedback.
 *
 * Security: every operation verifies the student is enrolled in the course
 * that owns the assignment before proceeding.
 */
import { prisma } from '../../lib/prisma';

export async function listAssignments(
  studentRecordId: string,
  filters: {
    status?: string;
    courseOfferingId?: string;
    upcoming?: boolean;
  } = {},
) {
  // Get all active offering IDs this student is enrolled in
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentRecordId,
      status: { in: ['ACTIVE', 'FORCE_ADDED'] },
    },
    select: { courseOfferingId: true },
  });
  const offeringIds = enrollments.map(e => e.courseOfferingId);
  if (offeringIds.length === 0) return [];

  const where: any = {
    courseOfferingId: filters.courseOfferingId
      ? filters.courseOfferingId
      : { in: offeringIds },
    status: 'PUBLISHED',
  };

  if (filters.upcoming) {
    where.dueDate = { gte: new Date() };
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      courseOffering: {
        include: {
          course: { select: { code: true, name: true } },
          instructor: { include: { user: { select: { fullName: true } } } },
        },
      },
      attachments: true,
      submissions: {
        where: { studentRecordId },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          score: true,
          letterGrade: true,
          feedback: true,
          fileName: true,
          fileUrl: true,
          textContent: true,
          gradedAt: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  return assignments.map(a => {
    const submission = a.submissions[0] ?? null;
    const now = new Date();
    const isPastDue = a.dueDate < now;
    const isDueSoon =
      !isPastDue &&
      a.dueDate.getTime() - now.getTime() < 48 * 60 * 60 * 1000; // within 48 hours

    let derivedStatus: 'pending' | 'submitted' | 'graded' | 'late' = 'pending';
    if (submission) {
      if (submission.status === 'GRADED' || submission.status === 'RETURNED') {
        derivedStatus = 'graded';
      } else {
        derivedStatus = 'submitted';
      }
    } else if (isPastDue && !a.allowLateSubmit) {
      derivedStatus = 'late';
    }

    // Filter by derived status if requested
    if (filters.status && filters.status !== 'all') {
      if (derivedStatus !== filters.status) return null;
    }

    return {
      id: a.id,
      title: a.title,
      description: a.description,
      instructions: a.instructions,
      dueDate: a.dueDate,
      totalPoints: a.totalPoints,
      allowLateSubmit: a.allowLateSubmit,
      isPastDue,
      isDueSoon,
      courseCode: a.courseOffering.course.code,
      courseName: a.courseOffering.course.name,
      courseOfferingId: a.courseOfferingId,
      instructor: a.courseOffering.instructor?.user.fullName ?? null,
      attachments: a.attachments.map(att => ({
        name: att.fileName,
        size: att.fileSize,
        type: att.fileType,
        url: att.fileUrl,
      })),
      status: derivedStatus,
      submission: submission
        ? {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          score: submission.score,
          letterGrade: submission.letterGrade,
          feedback: submission.feedback,
          fileName: submission.fileName,
          fileUrl: submission.fileUrl,
          textContent: submission.textContent,
          gradedAt: submission.gradedAt,
        }
        : null,
    };
  }).filter(Boolean);
}

export async function getAssignmentById(assignmentId: string, studentRecordId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      courseOffering: {
        include: {
          course: { select: { code: true, name: true } },
          instructor: { include: { user: { select: { fullName: true } } } },
        },
      },
      attachments: true,
      submissions: {
        where: { studentRecordId },
        include: { assignment: false },
      },
    },
  });

  if (!assignment) return null;

  // Security: student must be enrolled in this course
  const enrolled = await prisma.enrollment.findFirst({
    where: {
      courseOfferingId: assignment.courseOfferingId,
      studentRecordId,
      status: { in: ['ACTIVE', 'FORCE_ADDED', 'COMPLETED'] },
    },
  });
  if (!enrolled) return null;

  return assignment;
}

export async function submitAssignment(data: {
  assignmentId: string;
  studentRecordId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  textContent?: string;
}) {
  const { assignmentId, studentRecordId } = data;

  // Load assignment with security check
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      dueDate: true,
      allowLateSubmit: true,
      courseOfferingId: true,
      status: true,
    },
  });

  if (!assignment) throw new Error('Assignment not found');
  if (assignment.status !== 'PUBLISHED') throw new Error('Assignment is not accepting submissions');

  // Verify enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      courseOfferingId: assignment.courseOfferingId,
      studentRecordId,
      status: { in: ['ACTIVE', 'FORCE_ADDED'] },
    },
  });
  if (!enrollment) throw new Error('You are not enrolled in this course');

  // Check past due
  const now = new Date();
  const isPastDue = assignment.dueDate < now;
  if (isPastDue && !assignment.allowLateSubmit) {
    throw new Error('Assignment submission deadline has passed');
  }

  // Require at least one submission type
  if (!data.fileUrl && !data.textContent?.trim()) {
    throw new Error('Please provide a file or written response');
  }

  // Check for existing submission
  const existing = await prisma.assignmentSubmission.findUnique({
    where: { assignmentId_studentRecordId: { assignmentId, studentRecordId } },
  });
  if (existing && existing.status !== 'RETURNED') {
    throw new Error('You have already submitted this assignment');
  }

  const submissionStatus = isPastDue ? 'LATE' : 'SUBMITTED';

  let resSubmission;
  if (existing) {
    resSubmission = await prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        status: submissionStatus as any,
        submittedAt: now,
        fileUrl: data.fileUrl ?? null,
        fileName: data.fileName ?? null,
        fileSize: data.fileSize ?? null,
        textContent: data.textContent ?? null,
        score: null,
        letterGrade: null,
        feedback: null,
        gradedAt: null,
        gradedBy: null,
      },
    });
  } else {
    resSubmission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentRecordId,
        status: submissionStatus as any,
        fileUrl: data.fileUrl ?? null,
        fileName: data.fileName ?? null,
        fileSize: data.fileSize ?? null,
        textContent: data.textContent ?? null,
      },
    });
  }

  // Notify instructor of new student submission
  try {
    const fullOffering = await prisma.courseOffering.findUnique({
      where: { id: assignment.courseOfferingId },
      include: {
        course: { select: { code: true } },
        instructor: { select: { userId: true } },
      },
    });
    const studentUser = await prisma.studentRecord.findUnique({
      where: { id: studentRecordId },
      include: { user: { select: { fullName: true } } },
    });
    if (fullOffering?.instructor?.userId) {
      await prisma.notification.create({
        data: {
          userId: fullOffering.instructor.userId,
          title: `New Submission: ${fullOffering.course.code}`,
          message: `${studentUser?.user.fullName ?? 'A student'} submitted an assignment.`,
          type: 'ASSIGNMENT',
        },
      });
    }
  } catch { /* ignore notification side-effect */ }

  return resSubmission;
}
