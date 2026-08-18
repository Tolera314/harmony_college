/**
 * Student Degree Audit Service
 * Computes degree progress against program requirements:
 * - Total credits completed vs required
 * - Per-category breakdown (CORE, ELECTIVE, GENERAL)
 * - Individual course completion status
 * - GPA requirement check
 * - Graduation eligibility
 */
import { prisma } from '../../lib/prisma';

export async function getDegreeAudit(studentRecordId: string) {
  const studentRecord = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      program: {
        include: {
          requirements: true,
          courses: {
            include: {
              course: {
                select: { id: true, code: true, name: true, creditHours: true },
              },
            },
          },
        },
      },
      department: { select: { name: true } },
      user: { select: { fullName: true } },
      enrollments: {
        include: {
          courseOffering: {
            include: {
              course: { select: { id: true, code: true, name: true, creditHours: true } },
              semester: { include: { academicYear: { select: { name: true } } } },
            },
          },
          grade: { select: { letterGrade: true, gradePoints: true, creditHours: true } },
        },
        where: {
          status: { in: ['ACTIVE', 'FORCE_ADDED', 'COMPLETED'] },
        },
      },
      courseGrades: {
        where: { letterGrade: { not: null } },
        select: { letterGrade: true, gradePoints: true, creditHours: true },
      },
    },
  });

  if (!studentRecord) return null;

  const program = studentRecord.program;

  // Build a set of completed course IDs (graded passing)
  const completedCourseIds = new Set<string>();
  const inProgressCourseIds = new Set<string>();

  for (const enroll of studentRecord.enrollments) {
    const courseId = enroll.courseOffering.course.id;
    if (
      enroll.grade?.gradePoints !== null &&
      enroll.grade?.gradePoints !== undefined &&
      enroll.grade.gradePoints >= 1.0 // D or above
    ) {
      completedCourseIds.add(courseId);
    } else if (enroll.status === 'ACTIVE' || enroll.status === 'FORCE_ADDED') {
      inProgressCourseIds.add(courseId);
    }
  }

  // Compute GPA using the DB grade scale (not hardcoded values)
  const gradeScales = await prisma.gradeScale.findMany({
    where: { isActive: true },
    select: { letterGrade: true, gradePoints: true },
  });
  const scaleMap = new Map(gradeScales.map(s => [s.letterGrade, s.gradePoints]));

  const gradedGrades = studentRecord.courseGrades.filter(
    g => g.letterGrade !== null && scaleMap.has(g.letterGrade!),
  );
  const cumulativeGPA =
    gradedGrades.length > 0
      ? Math.round(
          (gradedGrades.reduce((s, g) => s + (scaleMap.get(g.letterGrade!) ?? 0) * g.creditHours, 0) /
            gradedGrades.reduce((s, g) => s + g.creditHours, 0)) * 100,
        ) / 100
      : 0;

  // Completed credits (passing grades)
  const completedCredits = Array.from(completedCourseIds).reduce((sum, cId) => {
    const enroll = studentRecord.enrollments.find(
      e => e.courseOffering.course.id === cId,
    );
    return sum + (enroll?.courseOffering.course.creditHours ?? 0);
  }, 0);

  const totalRequired = program.totalCredits;

  // Build requirement categories
  const categories = program.requirements.map(req => {
    // Courses in this category: simple heuristic matching by category name
    const categoryProgramCourses = program.courses.filter(pc => {
      if (req.category === 'CORE') return pc.isRequired;
      if (req.category === 'ELECTIVE') return !pc.isRequired;
      return true; // GENERAL — includes all
    });

    const courses = categoryProgramCourses.map(pc => {
      const c = pc.course;
      let status: 'completed' | 'in_progress' | 'remaining';
      let grade: string | undefined;

      if (completedCourseIds.has(c.id)) {
        status = 'completed';
        const enroll = studentRecord.enrollments.find(
          e => e.courseOffering.course.id === c.id && e.grade,
        );
        grade = enroll?.grade?.letterGrade ?? undefined;
      } else if (inProgressCourseIds.has(c.id)) {
        status = 'in_progress';
      } else {
        status = 'remaining';
      }

      return {
        code: c.code,
        title: c.name,
        credits: c.creditHours,
        status,
        grade,
      };
    });

    const completedInCategory = courses
      .filter(c => c.status === 'completed')
      .reduce((s, c) => s + c.credits, 0);

    return {
      title: req.description ?? req.category,
      category: req.category,
      requiredCredits: req.requiredCredits,
      completedCredits: Math.min(completedInCategory, req.requiredCredits),
      minimumGPA: req.minimumGPA,
      courses,
    };
  });

  // Graduation milestones
  const milestones = [
    {
      label: 'GPA Requirement',
      description: `Current GPA ${cumulativeGPA.toFixed(2)} / Minimum ${program.requirements[0]?.minimumGPA.toFixed(1) ?? '2.0'}`,
      met: cumulativeGPA >= (program.requirements[0]?.minimumGPA ?? 2.0),
    },
    {
      label: 'Credit Completion',
      description: `${completedCredits} of ${totalRequired} credits completed`,
      met: completedCredits >= totalRequired,
    },
    {
      label: 'Core Requirements',
      description: categories
        .filter(c => c.category === 'CORE')
        .map(c => `${c.completedCredits}/${c.requiredCredits} credits`)
        .join(', ') || 'Not configured',
      met: categories
        .filter(c => c.category === 'CORE')
        .every(c => c.completedCredits >= c.requiredCredits),
    },
  ];

  const isEligible =
    completedCredits >= totalRequired &&
    cumulativeGPA >= (program.requirements[0]?.minimumGPA ?? 2.0);

  // Update stored GPA and credits on student record if they've drifted
  if (
    Math.abs(studentRecord.gpa - cumulativeGPA) > 0.01 ||
    studentRecord.totalCredits !== completedCredits
  ) {
    await prisma.studentRecord.update({
      where: { id: studentRecordId },
      data: { gpa: cumulativeGPA, totalCredits: completedCredits },
    }).catch(() => {}); // non-blocking
  }

  return {
    student: {
      fullName: studentRecord.user.fullName,
      studentId: studentRecord.studentId,
      program: program.name,
      department: studentRecord.department.name,
      yearLevel: studentRecord.yearLevel,
    },
    degree: {
      name: program.name,
      totalCredits: program.totalCredits,
      durationYears: program.durationYears,
    },
    progress: {
      completedCredits,
      totalRequired,
      completionPercentage: Math.min(100, Math.round((completedCredits / totalRequired) * 100)),
      cumulativeGPA,
      isEligible,
    },
    milestones,
    categories,
  };
}
