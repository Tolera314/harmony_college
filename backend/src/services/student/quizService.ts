/**
 * Student Quiz Service
 * Handles: listing quizzes per course, starting an attempt,
 * saving answers (auto-save during attempt), submitting, and retrieving results.
 *
 * Security: every operation verifies enrollment before proceeding.
 * Business rules:
 *   - Cannot start a quiz outside its availability window
 *   - Cannot exceed maxAttempts
 *   - Cannot submit an already-submitted attempt
 *   - Timer enforcement: if timeLeft expires, server accepts late submission but flags it
 */
import { prisma } from '../../lib/prisma';
import { syncStudentAssessmentGrades } from './gradeSyncService';

async function verifyEnrollment(courseOfferingId: string, studentRecordId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      courseOfferingId,
      studentRecordId,
      status: { in: ['ACTIVE', 'FORCE_ADDED'] },
    },
  });
  return enrollment !== null;
}

export async function listQuizzesForCourse(
  courseOfferingId: string,
  studentRecordId: string,
) {
  const enrolled = await verifyEnrollment(courseOfferingId, studentRecordId);
  if (!enrolled) throw new Error('Not enrolled in this course');

  const quizzes = await prisma.quiz.findMany({
    where: {
      courseOfferingId,
      status: { in: ['ACTIVE', 'PUBLISHED', 'CLOSED'] },
    },
    include: {
      questions: {
        select: { id: true, type: true, questionText: true, points: true, orderIndex: true, options: { select: { id: true, text: true } } },
        orderBy: { orderIndex: 'asc' },
      },
      attempts: {
        where: { studentRecordId },
        orderBy: { startedAt: 'desc' },
        take: 1,
        include: { answers: true },
      },
    },
    orderBy: { availableFrom: 'asc' },
  });

  return quizzes.map(qz => {
    const isExam = Boolean(qz.description?.startsWith('[EXAM]') || qz.description?.startsWith('EXAM:'));
    const cleanDesc = isExam ? qz.description?.replace(/^(\[EXAM\]\s*|EXAM:\s*)/, '') : qz.description;
    
    // **NEW: Include instructor timing information**
    let remainingSeconds: number | null = null;
    let expiresAt: Date | null = null;
    
    if (qz.instructorStartedAt) {
      const now = new Date();
      expiresAt = new Date(qz.instructorStartedAt.getTime() + qz.durationMinutes * 60 * 1000);
      const elapsedSeconds = Math.floor((now.getTime() - qz.instructorStartedAt.getTime()) / 1000);
      remainingSeconds = Math.max(0, (qz.durationMinutes * 60) - elapsedSeconds);
    }
    
    return {
      id: qz.id,
      title: qz.title,
      assessmentType: (isExam ? 'EXAM' : 'QUIZ') as 'QUIZ' | 'EXAM',
      cleanDescription: cleanDesc,
      description: cleanDesc,
      instructions: qz.instructions,
      durationMinutes: qz.durationMinutes,
      availableFrom: qz.availableFrom,
      availableUntil: qz.availableUntil,
      passingScore: qz.passingScore,
      maxAttempts: qz.maxAttempts,
      totalPoints: qz.totalPoints,
      showResultsImmediately: qz.showResultsImmediately,
      questionCount: qz.questions.length,
      questions: qz.questions,
      instructorStartedAt: qz.instructorStartedAt,
      remainingSeconds,
      expiresAt,
      attempt: qz.attempts[0]
        ? {
          id: qz.attempts[0].id,
          status: qz.attempts[0].status,
          startedAt: qz.attempts[0].startedAt,
          submittedAt: qz.attempts[0].submittedAt,
          score: qz.attempts[0].score,
          percentageScore: qz.attempts[0].percentageScore,
          isPassing: qz.attempts[0].isPassing,
          feedback: qz.attempts[0].feedback,
          answers: qz.attempts[0].answers.reduce<Record<string, string>>((acc, ans) => {
            acc[ans.questionId] = ans.answerText ?? ans.selectedOptionId ?? '';
            return acc;
          }, {}),
        }
        : null,
    };
  });
}

export async function startQuizAttempt(
  quizId: string,
  studentRecordId: string,
): Promise<{ attemptId: string; questions: any[]; durationMinutes: number; remainingSeconds?: number }> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!quiz) throw new Error('Quiz not found');
  if (quiz.status === 'DRAFT') throw new Error('Quiz is not available yet');

  // **NEW: Instructor-controlled timing check**
  if (!quiz.instructorStartedAt) {
    throw new Error('The instructor has not started this assessment yet. Please wait for the instructor to start it.');
  }

  const now = new Date();
  
  // Calculate expiration based on instructor start time + duration
  const expiresAt = new Date(quiz.instructorStartedAt.getTime() + quiz.durationMinutes * 60 * 1000);
  
  if (now > expiresAt) {
    throw new Error('This assessment has expired and is no longer available.');
  }

  // Enrollment check
  const enrolled = await verifyEnrollment(quiz.courseOfferingId, studentRecordId);
  if (!enrolled) throw new Error('Not enrolled in this course');

  // Attempt count check
  const completedAttempts = await prisma.quizAttempt.count({
    where: {
      quizId,
      studentRecordId,
      status: { in: ['SUBMITTED', 'GRADED'] },
    },
  });
  if (completedAttempts >= quiz.maxAttempts) {
    throw new Error(`Maximum attempts (${quiz.maxAttempts}) already used`);
  }

  // Check for existing in-progress attempt — resume it
  const inProgress = await prisma.quizAttempt.findFirst({
    where: { quizId, studentRecordId, status: 'IN_PROGRESS' },
    include: { answers: true },
  });

  // **Calculate remaining time from instructor's start time**
  const totalDurationSeconds = quiz.durationMinutes * 60;
  const elapsedSinceInstructorStart = Math.floor((now.getTime() - quiz.instructorStartedAt.getTime()) / 1000);
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSinceInstructorStart);

  if (remainingSeconds <= 0) {
    // Time expired — auto-submit any in-progress attempt
    if (inProgress) {
      await autoSubmitAttempt(inProgress.id, quiz, studentRecordId);
    }
    throw new Error('This assessment has expired and been auto-submitted');
  }

  if (inProgress) {
    return {
      attemptId: inProgress.id,
      durationMinutes: quiz.durationMinutes,
      remainingSeconds,
      questions: quiz.questions.map(q => ({
        id: q.id,
        type: q.type,
        questionText: q.questionText,
        points: q.points,
        options: q.options.map(o => ({ id: o.id, text: o.text })),
      })),
    };
  }

  // Create new attempt
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentRecordId,
      status: 'IN_PROGRESS',
    },
  });

  return {
    attemptId: attempt.id,
    durationMinutes: quiz.durationMinutes,
    remainingSeconds,
    questions: quiz.questions.map(q => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      points: q.points,
      options: q.options.map(o => ({ id: o.id, text: o.text })),
    })),
  };
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  answer: string,
  studentRecordId: string,
) {
  // Verify ownership and get quiz info for deadline check
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    select: { 
      id: true, 
      status: true, 
      studentRecordId: true, 
      quizId: true,
      quiz: {
        select: {
          instructorStartedAt: true,
          durationMinutes: true,
        },
      },
    },
  });

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.studentRecordId !== studentRecordId) throw new Error('Unauthorized');
  if (attempt.status !== 'IN_PROGRESS') throw new Error('Attempt is no longer active');

  // **NEW: Backend deadline enforcement**
  if (attempt.quiz.instructorStartedAt) {
    const now = new Date();
    const expiresAt = new Date(
      attempt.quiz.instructorStartedAt.getTime() + attempt.quiz.durationMinutes * 60 * 1000
    );
    
    if (now > expiresAt) {
      throw new Error('Time has expired. Your answers can no longer be saved.');
    }
  }

  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, type: true, quizId: true, options: { select: { id: true } } },
  });

  if (!question || question.quizId !== attempt.quizId) {
    throw new Error('Question not found in this quiz');
  }

  // For MCQ/TrueFalse, answer is the optionId
  const isMCQ = question.type === 'MCQ' || question.type === 'TRUE_FALSE';
  const selectedOptionId = isMCQ ? answer : null;
  const answerText = !isMCQ ? answer : null;

  return prisma.quizAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: {
      attemptId,
      questionId,
      answerText,
      selectedOptionId,
    },
    update: {
      answerText,
      selectedOptionId,
    },
  });
}

export async function submitQuizAttempt(
  attemptId: string,
  studentRecordId: string,
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      quiz: {
        include: {
          questions: {
            include: { options: { where: { isCorrect: true } } },
          },
        },
      },
    },
  });

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.studentRecordId !== studentRecordId) throw new Error('Unauthorized');
  if (attempt.status !== 'IN_PROGRESS') throw new Error('Attempt already submitted');

  // **NEW: Enforce instructor deadline on backend**
  if (attempt.quiz.instructorStartedAt) {
    const now = new Date();
    const expiresAt = new Date(
      attempt.quiz.instructorStartedAt.getTime() + attempt.quiz.durationMinutes * 60 * 1000
    );
    
    if (now > expiresAt) {
      // Time expired — still allow submission but log it as late
      console.warn(`Late submission for attempt ${attemptId}: expired at ${expiresAt}, submitted at ${now}`);
    }
  }

  return finalizeAttempt(attempt);
}

async function autoSubmitAttempt(
  attemptId: string,
  quiz: { questions: any[]; totalPoints: number; passingScore: number },
  studentRecordId: string,
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: true, quiz: true },
  });
  if (!attempt) return;
  return finalizeAttempt({ ...attempt, quiz: { ...quiz, ...(attempt.quiz || {}) } } as any);
}

async function finalizeAttempt(attempt: any) {
  const now = new Date();
  const quiz = attempt.quiz;

  // Auto-grade objective questions (MCQ, TRUE_FALSE, FILL_BLANK)
  let totalEarned = 0;
  const answerUpdates: Promise<any>[] = [];

  for (const q of quiz.questions) {
    const studentAnswer = attempt.answers.find((a: any) => a.questionId === q.id);
    if (!studentAnswer) continue;

    let isCorrect: boolean | null = null;
    let pointsEarned = 0;

    if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
      const correctOption = q.options.find((o: any) => o.isCorrect);
      isCorrect = correctOption?.id === studentAnswer.selectedOptionId;
      pointsEarned = isCorrect ? q.points : 0;
    } else if (q.type === 'FILL_BLANK') {
      const correctOption = q.options.find((o: any) => o.isCorrect);
      if (correctOption) {
        isCorrect = studentAnswer.answerText?.toLowerCase().trim() ===
          correctOption.text.toLowerCase().trim();
        pointsEarned = isCorrect ? q.points : 0;
      }
    }
    // SHORT_ANSWER, ESSAY — left for manual grading (isCorrect = null)

    totalEarned += pointsEarned;

    answerUpdates.push(
      prisma.quizAnswer.update({
        where: { id: studentAnswer.id },
        data: { isCorrect, pointsEarned },
      }),
    );
  }

  await Promise.all(answerUpdates);

  const percentageScore = quiz.totalPoints > 0
    ? (totalEarned / quiz.totalPoints) * 100
    : 0;
  const isPassing = percentageScore >= quiz.passingScore;
  const timeSpent = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);

  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      status: 'SUBMITTED',
      submittedAt: now,
      timeSpentSeconds: timeSpent,
      score: totalEarned,
      percentageScore,
      isPassing,
    },
  });

  // Automatically sync quiz grade into CourseGrade
  if (quiz?.courseOfferingId && attempt.studentRecordId) {
    try {
      await syncStudentAssessmentGrades(attempt.studentRecordId, quiz.courseOfferingId);
    } catch (syncErr) {
      console.error('Failed to auto-sync quiz grade to CourseGrade:', syncErr);
    }
  }

  return updatedAttempt;
}

export async function getAttemptResult(attemptId: string, studentRecordId: string) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: {
        include: {
          question: {
            include: { options: true },
          },
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
          totalPoints: true,
          passingScore: true,
          showResultsImmediately: true,
        },
      },
    },
  });

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.studentRecordId !== studentRecordId) throw new Error('Unauthorized');

  return attempt;
}
