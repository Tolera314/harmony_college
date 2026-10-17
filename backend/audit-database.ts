import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditDatabase() {
  console.log('=== HARMONY COLLEGE DATABASE AUDIT ===\n');

  try {
    // 1. Academic Years and Semesters
    console.log('--- ACADEMIC YEARS ---');
    const academicYears = await prisma.academicYear.findMany({
      include: {
        semesters: true
      }
    });
    
    for (const year of academicYears) {
      console.log(`\nYear: ${year.name} (${year.isCurrent ? 'CURRENT' : 'inactive'})`);
      console.log(`  Semesters: ${year.semesters.length}`);
      for (const sem of year.semesters) {
        console.log(`    - ${sem.name} (${sem.programType}) - Order: ${sem.termOrder}, Closed: ${sem.isClosed}, Current: ${sem.isCurrent}`);
      }
    }

    // 2. All Semesters grouped by name and programType
    console.log('\n\n--- ALL SEMESTERS BY NAME & PROGRAM TYPE ---');
    const semesters = await prisma.semester.findMany({
      orderBy: [{ programType: 'asc' }, { name: 'asc' }]
    });
    
    const semesterGroups: Record<string, any[]> = {};
    for (const sem of semesters) {
      const key = `${sem.programType}-${sem.name}`;
      if (!semesterGroups[key]) semesterGroups[key] = [];
      semesterGroups[key].push(sem);
    }
    
    for (const [key, sems] of Object.entries(semesterGroups)) {
      console.log(`\n${key}: ${sems.length} record(s)`);
      for (const s of sems) {
        console.log(`  ID: ${s.id}, Year: ${s.academicYearId.slice(0,8)}, Current: ${s.isCurrent}, Closed: ${s.isClosed}`);
      }
    }

    // 3. Course Offerings per Semester
    console.log('\n\n--- COURSE OFFERINGS PER SEMESTER ---');
    for (const sem of semesters) {
      const offeringCount = await prisma.courseOffering.count({
        where: { semesterId: sem.id }
      });
      console.log(`${sem.name} (${sem.programType}): ${offeringCount} offerings`);
    }

    // 4. Enrollments per Semester
    console.log('\n\n--- ENROLLMENTS PER SEMESTER ---');
    for (const sem of semesters) {
      const enrollmentCount = await prisma.enrollment.count({
        where: {
          courseOffering: {
            semesterId: sem.id
          }
        }
      });
      console.log(`${sem.name} (${sem.programType}): ${enrollmentCount} enrollments`);
    }

    // 5. CourseGrades per Semester
    console.log('\n\n--- COURSE GRADES PER SEMESTER ---');
    for (const sem of semesters) {
      const gradeCount = await prisma.courseGrade.count({
        where: {
          enrollment: {
            courseOffering: {
              semesterId: sem.id
            }
          }
        }
      });
      console.log(`${sem.name} (${sem.programType}): ${gradeCount} grades`);
    }

    // 6. Students enrolled ONLY in Semester/Term II or III
    console.log('\n\n--- STUDENTS ENROLLED ONLY IN SEMESTER/TERM II OR III ---');
    const studentsInIIorIII = await prisma.studentRecord.findMany({
      where: {
        enrollments: {
          some: {
            courseOffering: {
              semester: {
                OR: [
                  { name: { contains: 'II' } },
                  { name: { contains: 'III' } },
                  { name: { contains: 'Semester 2' } },
                  { name: { contains: 'Semester 3' } },
                  { name: { contains: 'Term 2' } },
                  { name: { contains: 'Term 3' } }
                ]
              }
            }
          }
        }
      },
      include: {
        enrollments: {
          include: {
            courseOffering: {
              include: {
                semester: true,
                course: true
              }
            }
          }
        }
      }
    });
    
    console.log(`Total students with II/III enrollments: ${studentsInIIorIII.length}`);
    for (const student of studentsInIIorIII.slice(0, 10)) {
      console.log(`  ${student.studentId}: ${student.enrollments.length} enrollments`);
      for (const enr of student.enrollments) {
        console.log(`    - ${enr.courseOffering.course.name} in ${enr.courseOffering.semester.name}`);
      }
    }

    // 7. Check for orphaned records
    console.log('\n\n--- ORPHANED RECORDS CHECK ---');
    
    const enrollmentsWithoutSemester = await prisma.enrollment.count({
      where: {
        courseOffering: {
          semester: null
        }
      }
    });
    console.log(`Enrollments without semester: ${enrollmentsWithoutSemester}`);

    const gradesWithoutEnrollment = await prisma.courseGrade.count({
      where: {
        enrollment: null
      }
    });
    console.log(`Grades without enrollment: ${gradesWithoutEnrollment}`);

    // 8. Student Records Summary
    console.log('\n\n--- STUDENT RECORDS SUMMARY ---');
    const totalStudents = await prisma.studentRecord.count();
    const tvetStudents = await prisma.studentRecord.count({ where: { programType: 'TVET' } });
    const shortProgramStudents = await prisma.studentRecord.count({ where: { programType: 'SHORT_PROGRAM' } });
    
    console.log(`Total Students: ${totalStudents}`);
    console.log(`  TVET: ${tvetStudents}`);
    console.log(`  SHORT_PROGRAM: ${shortProgramStudents}`);

    // 9. Courses Summary
    console.log('\n\n--- COURSES SUMMARY ---');
    const totalCourses = await prisma.course.count();
    const tvetCourses = await prisma.course.count({ where: { programType: 'TVET' } });
    const shortProgramCourses = await prisma.course.count({ where: { programType: 'SHORT_PROGRAM' } });
    
    console.log(`Total Courses: ${totalCourses}`);
    console.log(`  TVET: ${tvetCourses}`);
    console.log(`  SHORT_PROGRAM: ${shortProgramCourses}`);

    // 10. Check for duplicate or conflicting grades
    console.log('\n\n--- DUPLICATE GRADE CHECK ---');
    const duplicateGrades = await prisma.$queryRaw<any[]>`
      SELECT 
        "studentRecordId",
        COUNT(*) as grade_count
      FROM "CourseGrade"
      GROUP BY "studentRecordId"
      HAVING COUNT(*) > 10
      LIMIT 10
    `;
    
    console.log(`Students with >10 grades: ${duplicateGrades.length}`);
    for (const dup of duplicateGrades) {
      console.log(`  Student ${dup.studentRecordId.slice(0, 8)}: ${dup.grade_count} grades`);
    }

  } catch (error) {
    console.error('Error during audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditDatabase();
