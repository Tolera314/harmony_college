/**
 * Standalone student dashboard data seed.
 * Seeds assignments, quizzes, attendance, financial accounts, notifications
 * for existing student records. Run after the main seed.
 *
 * Usage: npx tsx prisma/seedStudentData.ts
 */

import { PrismaClient, AttendanceStatus } from '@prisma/client';

if (process.env.NODE_ENV === 'production') { process.exit(1); }

// Use a fresh client with a short connection timeout to avoid Neon drops
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: ['error'],
});

async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e: any) {
      if (i === retries - 1) throw e;
      if (e?.code === 'P1017' || e?.message?.includes('Server has closed')) {
        console.log(`   ⟳ Connection dropped, retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        await prisma.$disconnect();
        await prisma.$connect();
      } else throw e;
    }
  }
  throw new Error('All retries failed');
}

async function main() {
  console.log('\n📚  Seeding student dashboard data (standalone)...\n');
  await prisma.$connect();

  const studentRecords = await retry(() => prisma.studentRecord.findMany({
    include: {
      enrollments: {
        where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] } },
        include: {
          courseOffering: {
            include: { course: true, semester: true, instructor: true },
          },
        },
      },
      user: { select: { fullName: true } },
    },
  }));

  console.log(`   Found ${studentRecords.length} student records`);

  for (const sr of studentRecords) {
    console.log(`   Processing ${sr.user.fullName} (${sr.studentId})...`);

    // ── Financial Account ──────────────────────────────────────────────────
    await retry(async () => {
      const existing = await prisma.financialAccount.findUnique({ where: { studentRecordId: sr.id } });
      if (!existing) {
        const account = await prisma.financialAccount.create({
          data: { studentRecordId: sr.id, balance: 0, clearedForTerm: 'Fall 2026' },
        });
        await prisma.financialTransaction.createMany({
          data: [
            { financialAccountId: account.id, type: 'TUITION',     amount:  18500,  description: 'Fall 2026 Undergraduate Tuition',   category: 'Tuition',     receiptId: `TUI-${sr.id.slice(0,8)}`, status: 'POSTED', transactionDate: new Date('2026-08-15') },
            { financialAccountId: account.id, type: 'FEE',         amount:  1200,   description: 'Student Health & Insurance Fee',      category: 'Fee',         receiptId: `FEE-${sr.id.slice(0,8)}-1`, status: 'POSTED', transactionDate: new Date('2026-08-15') },
            { financialAccountId: account.id, type: 'FEE',         amount:  650,    description: 'Technology & Infrastructure Fee',     category: 'Fee',         receiptId: `FEE-${sr.id.slice(0,8)}-2`, status: 'POSTED', transactionDate: new Date('2026-08-15') },
            { financialAccountId: account.id, type: 'SCHOLARSHIP', amount: -15000,  description: "Dean's Merit Scholarship",            category: 'Scholarship', receiptId: `SCH-${sr.id.slice(0,8)}`, status: 'POSTED', transactionDate: new Date('2026-08-01') },
            { financialAccountId: account.id, type: 'GRANT',       amount: -5350,   description: 'Departmental Research Grant',         category: 'Grant',       receiptId: `GRT-${sr.id.slice(0,8)}`, status: 'POSTED', transactionDate: new Date('2026-08-01') },
            { financialAccountId: account.id, type: 'PAYMENT',     amount: -4000,   description: 'Fall 2026 Registration Payment via Telebirr', category: 'Payment', receiptId: `REC-${sr.id.slice(0,8)}`, referenceId: `TEL-PAY-${sr.id.slice(0,6)}`, status: 'POSTED', transactionDate: new Date('2026-08-20') },
          ],
          skipDuplicates: true,
        });
        console.log(`     ✓ Financial account`);
      }
    });

    // ── Notification Preferences ───────────────────────────────────────────
    await retry(() => prisma.studentNotificationPreference.upsert({
      where: { studentRecordId: sr.id },
      update: {},
      create: { studentRecordId: sr.id },
    }));

    // ── Per-enrollment: assignments, quizzes, attendance ──────────────────
    for (const enroll of sr.enrollments) {
      const offering = enroll.courseOffering;
      const instructorUserId = offering.instructor?.userId;
      if (!instructorUserId) { console.log(`     ⚠ No instructor for ${offering.course.code}, skipping`); continue; }

      // ── Assignments ────────────────────────────────────────────────────
      const existingCount = await retry(() => prisma.assignment.count({ where: { courseOfferingId: offering.id } }));
      if (existingCount === 0) {
        // Past graded assignment
        const a3 = await retry(() => prisma.assignment.create({
          data: {
            courseOfferingId: offering.id, createdBy: instructorUserId,
            title: `${offering.course.code} — Assignment 1 (Foundations)`,
            description: `Foundations assignment for ${offering.course.name}. Apply core concepts from the first three weeks.`,
            instructions: '1. Review weeks 1-3 materials.\n2. Complete all tasks.\n3. Submit as PDF or ZIP.\n4. Include a brief methodology note.',
            dueDate: new Date(Date.now() - 14 * 86400000),
            totalPoints: 100, status: 'PUBLISHED', allowLateSubmit: false,
          },
        }));
        await retry(() => prisma.assignmentSubmission.upsert({
          where: { assignmentId_studentRecordId: { assignmentId: a3.id, studentRecordId: sr.id } },
          update: {},
          create: {
            assignmentId: a3.id, studentRecordId: sr.id, status: 'GRADED',
            submittedAt: new Date(Date.now() - 15 * 86400000),
            textContent: 'Assignment completed as per instructions. Applied core concepts from lecture materials.',
            score: 92, letterGrade: 'A',
            feedback: 'Excellent work! Your analysis is thorough and well-structured.',
            gradedAt: new Date(Date.now() - 12 * 86400000), gradedBy: instructorUserId,
          },
        }));

        // Due in 2 days — urgent
        await retry(() => prisma.assignment.create({
          data: {
            courseOfferingId: offering.id, createdBy: instructorUserId,
            title: `${offering.course.code} — Lab Exercise 2`,
            description: `Practical lab applying ${offering.course.name} techniques.`,
            instructions: '1. Complete all lab tasks.\n2. Document results with screenshots.\n3. Submit as a single PDF.',
            dueDate: new Date(Date.now() + 2 * 86400000),
            totalPoints: 50, status: 'PUBLISHED',
          },
        }));

        // Due in 7 days — midterm project
        await retry(() => prisma.assignment.create({
          data: {
            courseOfferingId: offering.id, createdBy: instructorUserId,
            title: `${offering.course.code} — Midterm Project`,
            description: `Comprehensive midterm project for ${offering.course.name}.`,
            instructions: '1. Review course materials from weeks 1-7.\n2. Complete the project per the rubric.\n3. Submit as ZIP with all source files.\n4. Include a README.',
            dueDate: new Date(Date.now() + 7 * 86400000),
            totalPoints: 100, status: 'PUBLISHED',
            attachments: { create: [{ fileName: `${offering.course.code}_Rubric.pdf`, fileUrl: '/uploads/sample_rubric.pdf', fileSize: '180 KB', fileType: 'PDF' }] },
          },
        }));
        console.log(`     ✓ Assignments for ${offering.course.code}`);
      }

      // ── Quizzes ────────────────────────────────────────────────────────
      const existingQuizCount = await retry(() => prisma.quiz.count({ where: { courseOfferingId: offering.id } }));
      if (existingQuizCount === 0) {
        // Past graded quiz
        const q1 = await retry(() => prisma.quiz.create({
          data: {
            courseOfferingId: offering.id, createdBy: instructorUserId,
            title: `${offering.course.code} — Fundamentals Quiz`,
            description: `Tests understanding of ${offering.course.name} fundamentals.`,
            instructions: 'You have 30 minutes. No external resources.',
            durationMinutes: 30,
            availableFrom: new Date(Date.now() - 5 * 86400000),
            availableUntil: new Date(Date.now() + 10 * 86400000),
            passingScore: 60, maxAttempts: 1, totalPoints: 10,
            showResultsImmediately: true, status: 'ACTIVE',
            questions: {
              create: [
                { type: 'MCQ', questionText: `What is the primary purpose of ${offering.course.name}?`, points: 2, orderIndex: 0, options: { create: [{ text: 'Theoretical knowledge only', isCorrect: false, orderIndex: 0 }, { text: 'Apply core concepts practically', isCorrect: true, orderIndex: 1 }, { text: 'Memorize facts', isCorrect: false, orderIndex: 2 }, { text: 'None of the above', isCorrect: false, orderIndex: 3 }] } },
                { type: 'TRUE_FALSE', questionText: 'Documentation is essential in this field.', points: 2, orderIndex: 1, options: { create: [{ text: 'True', isCorrect: true, orderIndex: 0 }, { text: 'False', isCorrect: false, orderIndex: 1 }] } },
                { type: 'MCQ', questionText: 'Which approach is most effective for complex problem-solving?', points: 2, orderIndex: 2, options: { create: [{ text: 'Trial and error', isCorrect: false, orderIndex: 0 }, { text: 'Systematic analysis', isCorrect: true, orderIndex: 1 }, { text: 'Copy existing solutions', isCorrect: false, orderIndex: 2 }, { text: 'Skip planning', isCorrect: false, orderIndex: 3 }] } },
                { type: 'SHORT_ANSWER', questionText: `Briefly explain one key concept from ${offering.course.name}.`, points: 4, orderIndex: 3 },
              ],
            },
          },
          include: { questions: { include: { options: { where: { isCorrect: true } } } } },
        }));

        // Graded attempt
        const attempt = await retry(() => prisma.quizAttempt.create({
          data: {
            quizId: q1.id, studentRecordId: sr.id, status: 'GRADED',
            startedAt: new Date(Date.now() - 4 * 86400000),
            submittedAt: new Date(Date.now() - 4 * 86400000 + 25 * 60000),
            timeSpentSeconds: 25 * 60, score: 8, percentageScore: 80,
            isPassing: true, feedback: 'Good understanding of fundamentals.',
            gradedAt: new Date(Date.now() - 3 * 86400000), gradedBy: instructorUserId,
          },
        }));
        for (const ques of q1.questions) {
          const correctOpt = ques.options[0];
          await retry(() => prisma.quizAnswer.upsert({
            where: { attemptId_questionId: { attemptId: attempt.id, questionId: ques.id } },
            update: {},
            create: {
              attemptId: attempt.id, questionId: ques.id,
              selectedOptionId: ques.type !== 'SHORT_ANSWER' ? (correctOpt?.id ?? null) : null,
              answerText: ques.type === 'SHORT_ANSWER' ? `Key concept: systematic application of learned principles in ${offering.course.name}.` : null,
              isCorrect: ques.type !== 'SHORT_ANSWER' ? true : null,
              pointsEarned: ques.type !== 'SHORT_ANSWER' ? ques.points : 2,
            },
          }).catch(() => {}));
        }

        // Upcoming quiz — not yet attempted
        await retry(() => prisma.quiz.create({
          data: {
            courseOfferingId: offering.id, createdBy: instructorUserId,
            title: `${offering.course.code} — Midterm Assessment`,
            description: 'Comprehensive midterm covering the first half of semester.',
            instructions: '60 minutes. Partial credit for short answers.',
            durationMinutes: 60,
            availableFrom: new Date(Date.now() + 3 * 86400000),
            availableUntil: new Date(Date.now() + 10 * 86400000),
            passingScore: 70, maxAttempts: 1, totalPoints: 50,
            showResultsImmediately: false, status: 'PUBLISHED',
            questions: {
              create: [
                { type: 'MCQ', questionText: 'Which best describes the core principle of this subject?', points: 5, orderIndex: 0, options: { create: [{ text: 'Optimization and efficiency', isCorrect: true, orderIndex: 0 }, { text: 'Randomized approaches', isCorrect: false, orderIndex: 1 }, { text: 'Brute force only', isCorrect: false, orderIndex: 2 }, { text: 'Manual processing', isCorrect: false, orderIndex: 3 }] } },
                { type: 'ESSAY', questionText: `Discuss how ${offering.course.name} concepts apply to a real-world scenario.`, points: 20, orderIndex: 1 },
                { type: 'TRUE_FALSE', questionText: 'Continuous learning is essential in this field.', points: 5, orderIndex: 2, options: { create: [{ text: 'True', isCorrect: true, orderIndex: 0 }, { text: 'False', isCorrect: false, orderIndex: 1 }] } },
                { type: 'SHORT_ANSWER', questionText: 'List three best practices professionals in this field should follow.', points: 20, orderIndex: 3 },
              ],
            },
          },
        }));
        console.log(`     ✓ Quizzes for ${offering.course.code}`);
      }

      // ── Attendance (via ClassSession → AttendanceSession → AttendanceRecord) ──
      const existingCS = await retry(() => prisma.classSession.count({ where: { courseOfferingId: offering.id } }));
      if (existingCS === 0) {
        const weekDays = [0, 2];
        for (let i = 0; i < 8; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (8 - i) * 7 + weekDays[i % 2]);
          date.setHours(9, 0, 0, 0);

          const cs = await retry(() => prisma.classSession.upsert({
            where: { courseOfferingId_date_startTime: { courseOfferingId: offering.id, date, startTime: '09:00' } },
            update: {},
            create: { courseOfferingId: offering.id, date, startTime: '09:00', endTime: '10:30', topic: `Week ${i + 1} — ${offering.course.name}` },
          }));

          const as_ = await retry(() => prisma.attendanceSession.upsert({
            where: { classSessionId: cs.id },
            update: {},
            create: {
              classSessionId: cs.id, openedBy: instructorUserId, lifecycle: 'FINALIZED',
              openedAt: date,
              closedAt: new Date(date.getTime() + 90 * 60000),
              finalizedAt: new Date(date.getTime() + 120 * 60000),
            },
          }));

          await retry(() => prisma.attendanceRecord.upsert({
            where: { attendanceSessionId_studentRecordId: { attendanceSessionId: as_.id, studentRecordId: sr.id } },
            update: {},
            create: {
              attendanceSessionId: as_.id, studentRecordId: sr.id,
              status: i === 3 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
              method: 'MANUAL', markedAt: date, markedBy: instructorUserId,
            },
          }).catch(() => {}));
        }
        console.log(`     ✓ Attendance for ${offering.course.code}`);
      }
    }
    console.log(`   ✓ ${sr.user.fullName} done`);
  }

  // ── Notifications ──────────────────────────────────────────────────────
  const allStudents = await retry(() => prisma.studentRecord.findMany({ select: { userId: true } }));
  for (const st of allStudents) {
    const count = await retry(() => prisma.notification.count({ where: { userId: st.userId } }));
    if (count > 0) continue;
    await retry(() => prisma.notification.createMany({
      data: [
        { userId: st.userId, title: 'Assignment Graded', message: 'Your Assignment 1 has been graded. Score: 92/100.', type: 'SUCCESS', entityType: 'Assignment' },
        { userId: st.userId, title: 'Quiz Available', message: 'A new quiz is now available. Opens in 3 days.', type: 'INFO', entityType: 'Quiz' },
        { userId: st.userId, title: 'Registration Reminder', message: 'Course registration for Semester II opens January 5, 2027.', type: 'WARNING', entityType: 'Calendar' },
        { userId: st.userId, title: 'Financial Aid Applied', message: "Dean's Merit Scholarship applied to your account.", type: 'SUCCESS', entityType: 'Financial' },
      ],
      skipDuplicates: true,
    }));
  }
  console.log('   ✓ Notifications');

  console.log('\n✅  Student dashboard data seeded successfully\n');
}

main()
  .catch(e => { console.error('❌ Student seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
