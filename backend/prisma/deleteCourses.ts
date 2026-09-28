/**
 * Script to delete all courses and course offerings from the database
 * Run: npx tsx prisma/deleteCourses.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🗑️  Deleting all courses and related data...\n');

  // Delete in order due to foreign key constraints
  console.log('   Deleting timetable slots...');
  await prisma.timetableSlot.deleteMany({});
  
  console.log('   Deleting enrollments...');
  await prisma.enrollment.deleteMany({});
  
  console.log('   Deleting course grades...');
  await prisma.courseGrade.deleteMany({});
  
  console.log('   Deleting assignments...');
  await prisma.assignment.deleteMany({});
  
  console.log('   Deleting quizzes...');
  await prisma.quiz.deleteMany({});
  
  console.log('   Deleting class sessions...');
  await prisma.classSession.deleteMany({});
  
  console.log('   Deleting course offerings...');
  const offerings = await prisma.courseOffering.deleteMany({});
  console.log(`   ✓ Deleted ${offerings.count} course offerings`);
  
  console.log('   Deleting course prerequisites...');
  await prisma.coursePrerequisite.deleteMany({});
  
  console.log('   Deleting program courses...');
  await prisma.programCourse.deleteMany({});
  
  console.log('   Deleting courses...');
  const courses = await prisma.course.deleteMany({});
  console.log(`   ✓ Deleted ${courses.count} courses`);
  
  console.log('\n✅  All courses and related data have been deleted!\n');
  console.log('   HOD can now create courses via the UI.\n');
}

main()
  .catch((e) => {
    console.error('❌  Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
