import { prisma } from '../lib/prisma';
import * as instructorService from '../services/instructor/instructorService';
import * as assignmentService from '../services/student/assignmentService';
import * as quizService from '../services/student/quizService';

async function runVerification() {
  console.log('================================================================');
  console.log('HARMONY COLLEGE — ACTIVITY MANAGEMENT FLOW VERIFICATION');
  console.log('================================================================\n');

  // 1. Dynamically find an active instructor with assigned course offerings
  const teacherUser = await prisma.user.findFirst({
    where: {
      instructorRecord: {
        offerings: {
          some: {},
        },
      },
    },
    include: {
      instructorRecord: {
        include: {
          offerings: {
            include: {
              course: true,
              semester: true,
            },
          },
        },
      },
    },
  });

  if (!teacherUser || !teacherUser.instructorRecord) {
    throw new Error('No instructor with assigned offerings found in database.');
  }

  console.log(`1. Teacher Found: ${teacherUser.fullName} (${teacherUser.email})`);
  console.log(`   Instructor Record ID: ${teacherUser.instructorRecord.id}`);
  console.log(`   Assigned Offerings (${teacherUser.instructorRecord.offerings.length}):`);
  for (const off of teacherUser.instructorRecord.offerings) {
    console.log(`   - Offering ID: ${off.id} | Course: ${off.course.code} - ${off.course.name} | Section: ${off.section}`);
  }

  const offerings = teacherUser.instructorRecord.offerings;
  if (offerings.length === 0) {
    throw new Error('Teacher has no assigned offerings.');
  }

  const primaryOffering = offerings[0];
  const primaryCourseId = primaryOffering.courseId;
  const primaryOfferingId = primaryOffering.id;

  // 2. Test Teacher Course Selection & Scoping
  console.log('\n2. Testing Teacher Course Scoping:');
  const teacherClasses = await instructorService.getMyClasses(teacherUser.id);
  console.log(`   Fetched ${teacherClasses.length} class offerings for teacher:`);
  for (const tc of teacherClasses) {
    console.log(`   - [${tc.course.code}] ${tc.course.name} (Section: ${tc.section})`);
  }
  const hasOnlyAssignedCourses = teacherClasses.every((tc: any) =>
    offerings.some((off: any) => off.courseId === tc.course.id)
  );
  console.log(`   -> Only assigned courses returned: ${hasOnlyAssignedCourses ? '✓ PASS' : '✗ FAIL'}`);
  if (!hasOnlyAssignedCourses) throw new Error('Teacher can see courses not assigned to them!');

  // 3. Test Course + Class / Section Validation on Assignment Creation
  console.log('\n3. Testing Course + Class Ownership Validation:');
  
  // 3a. Valid Course + Class creation
  console.log('   Creating test assignment for valid assigned Course + Class...');
  const testAssignment = await instructorService.createAssignment(
    teacherUser.id,
    primaryOfferingId,
    {
      courseId: primaryCourseId,
      title: 'Automated Test Assignment - Scoping Check',
      description: 'Verifying course and class section scoping',
      instructions: 'Please follow the instructions carefully',
      totalPoints: 20,
      dueDate: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
      allowLateSubmit: true,
      status: 'PUBLISHED' as any,
    }
  );
  console.log(`   -> Created test assignment ID: ${testAssignment.id} (Offering: ${testAssignment.courseOfferingId}) ✓ PASS`);

  // 3b. Mismatched Course + Class creation should be rejected
  console.log('   Testing rejection when courseOfferingId does not match courseId...');
  let mismatchedError = false;
  try {
    await instructorService.createAssignment(
      teacherUser.id,
      primaryOfferingId,
      {
        courseId: 'non-existent-course-id-999',
        title: 'Should Fail Mismatched Assignment',
        description: 'Mismatched',
        instructions: 'None',
        totalPoints: 10,
        dueDate: new Date().toISOString(),
      }
    );
  } catch (err: any) {
    mismatchedError = true;
    console.log(`   -> Caught expected rejection: "${err.message}" ✓ PASS`);
  }
  if (!mismatchedError) throw new Error('System allowed assignment creation with mismatched Course and Class!');

  // 3c. Unassigned Offering creation should be rejected
  console.log('   Testing rejection when courseOfferingId belongs to another instructor or doesn\'t exist...');
  let unassignedError = false;
  try {
    // Find an offering not belonging to this teacher, if any
    const otherOffering = await prisma.courseOffering.findFirst({
      where: { instructorId: { not: teacherUser.instructorRecord.id } },
    });
    const fakeOrOtherOfferingId = otherOffering?.id || 'fake-offering-uuid-000';
    await instructorService.createAssignment(
      teacherUser.id,
      fakeOrOtherOfferingId,
      {
        title: 'Should Fail Unauthorized Assignment',
        description: 'Unauthorized',
        instructions: 'None',
        totalPoints: 10,
        dueDate: new Date().toISOString(),
      }
    );
  } catch (err: any) {
    unassignedError = true;
    console.log(`   -> Caught expected rejection: "${err.message}" ✓ PASS`);
  }
  if (!unassignedError) throw new Error('System allowed assignment creation for an offering not assigned to teacher!');

  // 4. Test Student Assignment Visibility and Submission
  console.log('\n4. Testing Student Assignment Visibility & Enrolled Class Scoping:');
  const enrollmentRecord = await prisma.enrollment.findFirst({
    where: {
      courseOfferingId: primaryOfferingId,
      status: { in: ['ACTIVE', 'FORCE_ADDED'] },
    },
    include: {
      studentRecord: {
        include: {
          user: true,
          enrollments: {
            include: {
              courseOffering: {
                include: {
                  course: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollmentRecord || !enrollmentRecord.studentRecord) {
    throw new Error(`No enrolled student found for offering ${primaryOfferingId}`);
  }

  const studentRecord = enrollmentRecord.studentRecord;
  const studentUser = studentRecord.user;

  console.log(`   Student Found: ${studentUser.fullName} (${studentUser.email})`);
  console.log(`   Student Record ID: ${studentRecord.id}`);
  const studentOfferingIds = studentRecord.enrollments.map((e: any) => e.courseOfferingId);
  console.log(`   Student Enrolled Offering IDs: ${studentOfferingIds.join(', ')}`);

  // Verify student assignment listing is strictly scoped to enrollments
  const studentAssignments = await assignmentService.listAssignments(studentRecord.id);
  console.log(`   Student retrieved ${studentAssignments.length} assignments across enrolled courses.`);
  const allBelongToEnrolled = studentAssignments.every((a: any) =>
    studentOfferingIds.includes(a.courseOfferingId)
  );
  console.log(`   -> All visible assignments belong to student's enrolled classes: ${allBelongToEnrolled ? '✓ PASS' : '✗ FAIL'}`);
  if (!allBelongToEnrolled) throw new Error('Student can view assignments outside enrolled classes!');

  // 5. Test Student Submission with Local Storage URL & Text
  console.log('\n5. Testing Student Submission with Relative Local Storage URL:');
  const relativeUploadPath = `/api/upload/test_submission_${Date.now()}.pdf`;
  const submittedText = 'Automated verification submission answers and text analysis.';

  const submissionResult = await assignmentService.submitAssignment({
    studentRecordId: studentRecord.id,
    assignmentId: testAssignment.id,
    fileUrl: relativeUploadPath,
    textContent: submittedText,
  });

  console.log(`   Submission ID: ${submissionResult.id}`);
  console.log(`   Status: ${submissionResult.status}`);
  console.log(`   File URL stored: ${submissionResult.fileUrl}`);
  console.log(`   Text Content stored: ${submissionResult.textContent}`);
  const submissionValid =
    submissionResult.fileUrl === relativeUploadPath &&
    submissionResult.textContent === submittedText &&
    submissionResult.status === 'SUBMITTED';
  console.log(`   -> Submission persisted correctly: ${submissionValid ? '✓ PASS' : '✗ FAIL'}`);
  if (!submissionValid) throw new Error('Student submission failed to store fileUrl or textContent correctly!');

  // 6. Test Teacher Viewing Student Submissions
  console.log('\n6. Testing Teacher Viewing Submissions for Course + Class:');
  const offeringSubmissions = await instructorService.getOfferingSubmissions(
    teacherUser.id,
    primaryOfferingId,
    testAssignment.id
  );
  console.log(`   Teacher retrieved ${offeringSubmissions.length} submissions for assignment.`);
  const foundSubmission = offeringSubmissions.find((s: any) => s.id === submissionResult.id);
  console.log(`   Found newly submitted record: ${foundSubmission ? 'YES' : 'NO'}`);
  if (foundSubmission) {
    console.log(`   - Student Name: ${foundSubmission.studentName}`);
    console.log(`   - Student ID: ${foundSubmission.studentId}`);
    console.log(`   - File URL: ${foundSubmission.fileUrl}`);
    console.log(`   - Text Content: ${foundSubmission.textContent}`);
    console.log(`   - Status: ${foundSubmission.status}`);
  }
  console.log(`   -> Teacher submission viewing: ${foundSubmission ? '✓ PASS' : '✗ FAIL'}`);
  if (!foundSubmission) throw new Error('Teacher cannot view student submission!');

  // 7. Test Grading the Submission
  console.log('\n7. Testing Teacher Grading Submission:');
  const gradedResult = await instructorService.gradeSubmission(
    teacherUser.id,
    submissionResult.id,
    {
      score: 19,
      feedback: 'Excellent work in this assignment verification!',
    }
  );
  console.log(`   Grade Score: ${gradedResult.score}/${testAssignment.totalPoints}`);
  console.log(`   Feedback: ${gradedResult.feedback}`);
  console.log(`   Status: ${gradedResult.status}`);
  const gradingPassed = gradedResult.score === 19 && gradedResult.status === 'GRADED';
  console.log(`   -> Teacher grading: ${gradingPassed ? '✓ PASS' : '✗ FAIL'}`);
  if (!gradingPassed) throw new Error('Teacher grading failed!');

  // 8. Test Quiz and Exam Creation & Scoping
  console.log('\n8. Testing Quiz vs Exam Creation & Scoping:');
  
  // 8a. Create a Quiz
  const testQuiz = await instructorService.createQuiz(
    teacherUser.id,
    primaryOfferingId,
    {
      courseId: primaryCourseId,
      title: 'Automated Test Pop Quiz',
      description: 'Weekly formative quiz',
      assessmentType: 'QUIZ',
      durationMinutes: 15,
      passingScore: 70,
      totalPoints: 10,
      availableFrom: new Date().toISOString(),
      availableUntil: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
      status: 'ACTIVE' as any,
      questions: [
        {
          questionText: 'Is Course + Class scoping strictly enforced in Harmony College?',
          type: 'TRUE_FALSE',
          points: 5,
          options: [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }],
        },
        {
          questionText: 'Select the primary database used by the system:',
          type: 'MCQ',
          points: 5,
          options: [
            { text: 'PostgreSQL', isCorrect: true },
            { text: 'MongoDB', isCorrect: false },
            { text: 'Flat File', isCorrect: false },
          ],
        },
      ],
    }
  );
  console.log(`   Created Quiz ID: ${testQuiz.id} (Title: ${testQuiz.title})`);

  // 8b. Create an Exam
  const testExam = await instructorService.createQuiz(
    teacherUser.id,
    primaryOfferingId,
    {
      courseId: primaryCourseId,
      title: 'Automated Test Midterm Exam',
      description: 'Midterm Examination for Section A',
      assessmentType: 'EXAM',
      durationMinutes: 60,
      passingScore: 50,
      totalPoints: 50,
      availableFrom: new Date().toISOString(),
      availableUntil: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
      status: 'ACTIVE' as any,
      questions: [
        {
          questionText: 'Explain the relationship between Course, Section, and CourseOffering in the data model.',
          type: 'SHORT_ANSWER',
          points: 50,
        },
      ],
    }
  );
  console.log(`   Created Exam ID: ${testExam.id} (Title: ${testExam.title})`);

  // 8c. Test Student Listing of Quizzes & Exams for Enrolled Offering
  console.log('\n   Testing student retrieval of assessments:');
  const studentOfferingsAssessments = await quizService.listQuizzesForCourse(
    primaryOfferingId,
    studentRecord.id
  );
  console.log(`   Student retrieved ${studentOfferingsAssessments.length} assessments for offering.`);
  
  const foundQuiz = studentOfferingsAssessments.find((q: any) => q.id === testQuiz.id);
  const foundExam = studentOfferingsAssessments.find((q: any) => q.id === testExam.id);

  console.log(`   - Found Quiz: ${foundQuiz ? 'YES' : 'NO'} | Detected Type: ${(foundQuiz as any)?.assessmentType}`);
  console.log(`   - Found Exam: ${foundExam ? 'YES' : 'NO'} | Detected Type: ${(foundExam as any)?.assessmentType}`);

  const assessmentTypeCheck =
    foundQuiz &&
    (foundQuiz as any).assessmentType === 'QUIZ' &&
    foundExam &&
    (foundExam as any).assessmentType === 'EXAM';
  console.log(`   -> Assessment differentiation: ${assessmentTypeCheck ? '✓ PASS' : '✗ FAIL'}`);
  if (!assessmentTypeCheck) throw new Error('Quiz and Exam assessmentType differentiation failed!');

  // 8d. Test Cross-Enrollment Scoping
  console.log('\n   Testing unauthorized access to quizzes:');
  let crossEnrollmentBlocked = false;
  try {
    await quizService.listQuizzesForCourse('unauthorized-offering-uuid-xyz', studentRecord.id);
  } catch (err: any) {
    crossEnrollmentBlocked = true;
    console.log(`   -> Student correctly blocked from non-enrolled offering: "${err.message}" ✓ PASS`);
  }
  if (!crossEnrollmentBlocked) throw new Error('Student was able to access assessments for a non-enrolled class!');

  // 8e. Test Editing Exam and Adding Another Question After Creation
  console.log('\n   Testing editing exam & adding another question after creation:');
  const existingExamDetail = await instructorService.getQuizDetail(teacherUser.id, testExam.id);
  console.log(`   Initial exam question count: ${existingExamDetail.questions.length}`);

  await instructorService.updateQuiz(teacherUser.id, testExam.id, {
    title: 'Automated Test Midterm Exam (Edited)',
    durationMinutes: 75,
    questions: [
      ...existingExamDetail.questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        points: q.points,
      })),
      {
        questionText: 'What is the role of Prisma Client in Harmony College backend architecture?',
        type: 'ESSAY',
        points: 25,
      },
    ],
  });

  const reloadedExam = await instructorService.getQuizDetail(teacherUser.id, testExam.id);
  console.log(`   Updated exam title: ${reloadedExam.title}`);
  console.log(`   Updated duration: ${reloadedExam.durationMinutes}m`);
  console.log(`   Updated questions count: ${reloadedExam.questions.length}`);
  console.log(`   Updated totalPoints: ${reloadedExam.totalPoints}`);

  const editPassed =
    reloadedExam.title === 'Automated Test Midterm Exam (Edited)' &&
    reloadedExam.durationMinutes === 75 &&
    reloadedExam.questions.length === 2 &&
    reloadedExam.questions.some(q => q.questionText.includes('Prisma Client'));
  console.log(`   -> Editing exam & adding new question after creation: ${editPassed ? '✓ PASS' : '✗ FAIL'}`);
  if (!editPassed) throw new Error('Editing exam and adding new question failed!');

  // 9. Cleanup test records
  console.log('\n9. Cleaning up test records from database...');
  await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: testAssignment.id } });
  await prisma.assignment.delete({ where: { id: testAssignment.id } });
  await prisma.quizQuestionOption.deleteMany({
    where: { question: { quizId: { in: [testQuiz.id, testExam.id] } } },
  });
  await prisma.quizQuestion.deleteMany({
    where: { quizId: { in: [testQuiz.id, testExam.id] } },
  });
  await prisma.quiz.deleteMany({
    where: { id: { in: [testQuiz.id, testExam.id] } },
  });
  console.log('   -> Cleanup completed successfully ✓');

  console.log('\n================================================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runVerification()
  .catch((err) => {
    console.error('\n❌ VERIFICATION FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
