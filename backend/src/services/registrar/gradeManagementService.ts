import { prisma } from '../../lib/prisma';
import { ProgramType } from '@prisma/client';
import {
  calculateCGPA,
  calculateQualityPoints,
} from '../../lib/grading';
import { getGradeHistory } from '../student/gradesService';

export interface DepartmentGradeCard {
  id: string;
  name: string;
  code: string;
  programType: ProgramType;
  description: string | null;
  totalStudents: number;
  totalCourses: number;
  totalInstructors: number;
  submittedOfferings: number;
  pendingOfferings: number;
  totalOfferings: number;
}

export interface SimplifiedStudentCourseGrade {
  enrollmentId: string;
  courseOfferingId: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  instructorName: string;
  finalMark: number | null;
  letterGrade: string | null;
  gradePoints: number | null;
  qualityPoints: number | null;
  ects: number;
  status: string;
  submittedAt: Date | null;
  publishedAt: Date | null;
}

export interface DepartmentStudentGradeItem {
  id: string;
  studentId: string;
  fullName: string;
  email: string | null;
  programName: string;
  yearLevel: number;
  programType: ProgramType;
  cgpa: number;
  totalCredits: number;
  courses: SimplifiedStudentCourseGrade[];
}

export interface CourseSubmissionStatusItem {
  offeringId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  instructorId: string | null;
  instructorName: string;
  instructorEmail: string | null;
  semesterName: string;
  academicYear: string;
  totalStudents: number;
  submittedCount: number;
  draftCount: number;
  publishedCount: number;
  submissionStatus: 'PUBLISHED' | 'SUBMITTED' | 'IN_PROGRESS' | 'PENDING' | 'EMPTY';
}

/**
 * 1. Fetch grade overview cards for each department.
 * Filtered optionally by programType ('TVET' | 'SHORT_PROGRAM').
 */
export async function getDepartmentGradeCards(
  programType?: 'TVET' | 'SHORT_PROGRAM',
): Promise<DepartmentGradeCard[]> {
  const where: any = { isActive: true };
  if (programType) {
    where.programType = programType;
  }

  const departments = await prisma.department.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      programType: true,
      description: true,
    },
  });

  const cards: DepartmentGradeCard[] = await Promise.all(
    departments.map(async (dept) => {
      const progFilter = programType ? { programType } : {};

      const [totalStudents, totalCourses, totalInstructors, offerings] = await Promise.all([
        prisma.studentRecord.count({
          where: {
            departmentId: dept.id,
            status: 'ACTIVE',
            ...progFilter,
          },
        }),
        prisma.course.count({
          where: {
            departmentId: dept.id,
            ...progFilter,
          },
        }),
        prisma.instructorRecord.count({
          where: {
            departmentId: dept.id,
            isActive: true,
          },
        }),
        prisma.courseOffering.findMany({
          where: {
            course: { departmentId: dept.id },
            ...progFilter,
          },
          select: {
            id: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: {
                grade: {
                  select: { status: true },
                },
              },
            },
          },
        }),
      ]);

      let submittedOfferings = 0;
      let pendingOfferings = 0;

      for (const offering of offerings) {
        if (offering.enrollments.length === 0) continue;
        const hasSubmitted = offering.enrollments.some(
          (e) => e.grade && (e.grade.status === 'SUBMITTED' || e.grade.status === 'PUBLISHED'),
        );
        if (hasSubmitted) {
          submittedOfferings++;
        } else {
          pendingOfferings++;
        }
      }

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        programType: dept.programType,
        description: dept.description,
        totalStudents,
        totalCourses,
        totalInstructors,
        submittedOfferings,
        pendingOfferings,
        totalOfferings: offerings.length,
      };
    }),
  );

  return cards;
}

/**
 * 2. Fetch list of students and their grades for a given department.
 * NOTE: Strictly per requirements, NO individual assessment marks
 * (assignment, quiz, midExam, finalExam, attendance) are returned.
 * Only finalMark, letterGrade, gradePoints, qualityPoints, teacher, status.
 */
export async function getDepartmentGrades(
  departmentId: string,
  programType?: 'TVET' | 'SHORT_PROGRAM',
): Promise<{
  department: { id: string; name: string; code: string; programType: ProgramType };
  students: DepartmentStudentGradeItem[];
}> {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, code: true, programType: true },
  });

  if (!department) {
    throw new Error('Department not found');
  }

  const whereStudent: any = {
    departmentId,
  };
  if (programType) {
    whereStudent.programType = programType;
  }

  const rawStudents = await prisma.studentRecord.findMany({
    where: whereStudent,
    include: {
      user: { select: { fullName: true, email: true } },
      program: { select: { name: true } },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          courseOffering: {
            include: {
              course: { select: { id: true, code: true, name: true, ects: true } },
              instructor: {
                include: {
                  user: { select: { fullName: true } },
                },
              },
            },
          },
          grade: true,
        },
      },
    },
    orderBy: { user: { fullName: 'asc' } },
  });

  const students: DepartmentStudentGradeItem[] = rawStudents.map((s) => {
    const courseGrades: SimplifiedStudentCourseGrade[] = s.enrollments.map((enr) => {
      const g = enr.grade;
      const ects = g?.ects ?? enr.courseOffering.course.ects ?? 4;
      const gradePoints = g?.gradePoints ?? null;
      const qualityPoints = g?.qualityPoints ?? (
        gradePoints !== null ? calculateQualityPoints(gradePoints, ects) : null
      );

      return {
        enrollmentId: enr.id,
        courseOfferingId: enr.courseOfferingId,
        courseId: enr.courseOffering.course.id,
        courseName: enr.courseOffering.course.name,
        courseCode: enr.courseOffering.course.code,
        instructorName: enr.courseOffering.instructor?.user.fullName ?? 'Not Assigned',
        finalMark: g?.finalMark ?? null,
        letterGrade: g?.letterGrade ?? null,
        gradePoints,
        qualityPoints,
        ects,
        status: g?.status ?? 'NO_GRADE',
        submittedAt: g?.submittedAt ?? null,
        publishedAt: g?.publishedAt ?? null,
      };
    });

    // Compute live CGPA across all graded courses
    const gradedCourses = courseGrades
      .filter((c) => c.letterGrade && c.gradePoints !== null)
      .map((c) => ({
        gradePoints: c.gradePoints!,
        qualityPoints: c.qualityPoints!,
        ects: c.ects,
        letterGrade: c.letterGrade,
      }));

    const cgpaCalc = calculateCGPA(gradedCourses);

    return {
      id: s.id,
      studentId: s.studentId,
      fullName: s.user.fullName,
      email: s.user.email,
      programName: s.program?.name ?? 'General Program',
      yearLevel: s.yearLevel,
      programType: s.programType,
      cgpa: gradedCourses.length > 0 ? cgpaCalc.cgpa : s.gpa,
      totalCredits: s.totalCredits,
      courses: courseGrades,
    };
  });

  return { department, students };
}

/**
 * 3. Fetch comprehensive academic grade detail for a single student.
 * Bypasses grade portal setting since Registrar has full authority.
 */
export async function getStudentGradeDetail(studentRecordId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      department: { select: { id: true, name: true, code: true, programType: true } },
      program: { select: { id: true, name: true, code: true } },
    },
  });

  if (!student) {
    throw new Error('Student record not found');
  }

  // Use the verified student gradesService with bypassPortalCheck = true
  const history = await getGradeHistory(studentRecordId, true);

  return {
    student: {
      id: student.id,
      studentId: student.studentId,
      fullName: student.user.fullName,
      email: student.user.email,
      phone: student.user.phone,
      department: student.department,
      program: student.program,
      programType: student.programType,
      yearLevel: student.yearLevel,
      gpa: student.gpa,
      totalCredits: student.totalCredits,
    },
    history,
  };
}

/**
 * 4. Fetch course offering submission status for a department.
 * Lets Registrar see which teachers have submitted grades and which are pending.
 */
export async function getCourseSubmissionStatus(
  departmentId: string,
  programType?: 'TVET' | 'SHORT_PROGRAM',
): Promise<CourseSubmissionStatusItem[]> {
  const whereOffering: any = {
    course: { departmentId },
  };
  if (programType) {
    whereOffering.programType = programType;
  }

  const offerings = await prisma.courseOffering.findMany({
    where: whereOffering,
    include: {
      course: { select: { id: true, code: true, name: true } },
      instructor: {
        include: {
          user: { select: { fullName: true, email: true } },
        },
      },
      semester: {
        include: {
          academicYear: { select: { name: true } },
        },
      },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          grade: { select: { status: true } },
        },
      },
    },
    orderBy: [
      { semester: { startDate: 'desc' } },
      { course: { code: 'asc' } },
    ],
  });

  return offerings.map((o) => {
    const totalStudents = o.enrollments.length;
    let submittedCount = 0;
    let draftCount = 0;
    let publishedCount = 0;

    for (const enr of o.enrollments) {
      if (!enr.grade) continue;
      if (enr.grade.status === 'PUBLISHED') {
        publishedCount++;
        submittedCount++;
      } else if (enr.grade.status === 'SUBMITTED') {
        submittedCount++;
      } else if (enr.grade.status === 'DRAFT') {
        draftCount++;
      }
    }

    let submissionStatus: CourseSubmissionStatusItem['submissionStatus'] = 'PENDING';
    if (totalStudents === 0) {
      submissionStatus = 'EMPTY';
    } else if (publishedCount > 0 && publishedCount === totalStudents) {
      submissionStatus = 'PUBLISHED';
    } else if (submittedCount > 0) {
      submissionStatus = 'SUBMITTED';
    } else if (draftCount > 0) {
      submissionStatus = 'IN_PROGRESS';
    }

    return {
      offeringId: o.id,
      courseId: o.course.id,
      courseCode: o.course.code,
      courseName: o.course.name,
      instructorId: o.instructorId,
      instructorName: o.instructor?.user.fullName ?? 'Not Assigned',
      instructorEmail: o.instructor?.user.email ?? null,
      semesterName: o.semester.name,
      academicYear: o.semester.academicYear.name,
      totalStudents,
      submittedCount,
      draftCount,
      publishedCount,
      submissionStatus,
    };
  });
}

/**
 * 5. Publish all grades for an offering.
 * Changes grade status to PUBLISHED and recalculates student GPA.
 */
export async function publishOfferingGrades(offeringId: string, publishedByUserId: string) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      course: { select: { code: true, name: true } },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: { grade: true },
      },
    },
  });

  if (!offering) {
    throw new Error('Course offering not found');
  }

  const now = new Date();

  const updateResult = await prisma.courseGrade.updateMany({
    where: {
      enrollment: { courseOfferingId: offeringId },
      status: 'SUBMITTED',
    },
    data: {
      status: 'PUBLISHED',
      publishedAt: now,
    },
  });

  // Recalculate CGPA for affected students
  for (const enr of offering.enrollments) {
    try {
      const studentId = enr.studentRecordId;
      const history = await getGradeHistory(studentId, true);
      const newCgpa = history.academicSummary.cgpa;
      await prisma.studentRecord.update({
        where: { id: studentId },
        data: { gpa: newCgpa },
      });
    } catch {
      // Non-blocking CGPA refresh
    }
  }

  return {
    success: true,
    publishedCount: updateResult.count,
    message: `Successfully published grades for ${offering.course.code} — ${offering.course.name}`,
  };
}

/**
 * 6. Get Grade Editing setting (Teacher permission to enter/save grades).
 */
export async function getGradeEditingStatus() {
  const setting = await prisma.gradeEditingSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', isOpen: true },
    update: {},
  });
  return {
    isOpen: setting.isOpen,
    openedAt: setting.openedAt,
    openedBy: setting.openedBy,
    closedAt: setting.closedAt,
    closedBy: setting.closedBy,
  };
}

/**
 * 7. Set Grade Editing setting (Open or Close teacher grade entry).
 */
export async function setGradeEditingStatus(isOpen: boolean, userId?: string) {
  const now = new Date();
  const setting = await prisma.gradeEditingSetting.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      isOpen,
      openedAt: isOpen ? now : null,
      openedBy: isOpen ? userId : null,
      closedAt: !isOpen ? now : null,
      closedBy: !isOpen ? userId : null,
    },
    update: {
      isOpen,
      ...(isOpen
        ? { openedAt: now, openedBy: userId, closedAt: null, closedBy: null }
        : { closedAt: now, closedBy: userId }),
    },
  });
  return {
    isOpen: setting.isOpen,
    openedAt: setting.openedAt,
    openedBy: setting.openedBy,
    closedAt: setting.closedAt,
    closedBy: setting.closedBy,
  };
}

/**
 * 8. Get Student Grade Portal setting (Student visibility of grades).
 */
export async function getGradePortalStatus() {
  const setting = await prisma.gradePortalSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', isOpen: false },
    update: {},
  });
  return {
    isOpen: setting.isOpen,
    openedAt: setting.openedAt,
    openedBy: setting.openedBy,
    closedAt: setting.closedAt,
    closedBy: setting.closedBy,
  };
}

/**
 * 9. Set Student Grade Portal setting (Open or Close student portal).
 */
export async function setGradePortalStatus(isOpen: boolean, userId?: string) {
  const now = new Date();
  const setting = await prisma.gradePortalSetting.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      isOpen,
      openedAt: isOpen ? now : null,
      openedBy: isOpen ? userId : null,
      closedAt: !isOpen ? now : null,
      closedBy: !isOpen ? userId : null,
    },
    update: {
      isOpen,
      ...(isOpen
        ? { openedAt: now, openedBy: userId, closedAt: null, closedBy: null }
        : { closedAt: now, closedBy: userId }),
    },
  });
  return {
    isOpen: setting.isOpen,
    openedAt: setting.openedAt,
    openedBy: setting.openedBy,
    closedAt: setting.closedAt,
    closedBy: setting.closedBy,
  };
}
