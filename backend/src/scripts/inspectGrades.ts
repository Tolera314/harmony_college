import { prisma } from '../lib/prisma';

async function main() {
  const grades = await prisma.courseGrade.findMany({
    take: 10,
    include: {
      enrollment: {
        include: {
          courseOffering: {
            include: {
              semester: true,
              course: true,
            }
          },
          studentRecord: {
            select: { studentId: true, programType: true }
          }
        }
      }
    }
  });

  console.log(`Found ${grades.length} sample grades:`);
  for (const g of grades) {
    console.log(`Student: ${g.enrollment.studentRecord.studentId} [${g.enrollment.studentRecord.programType}], Course: ${g.enrollment.courseOffering.course.code}, Period: ${g.enrollment.courseOffering.semester.name} [${g.enrollment.courseOffering.semester.programType}], Grade: ${g.letterGrade}, GP: ${g.gradePoints}, QP: ${g.qualityPoints}, ECTS: ${g.ects}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
