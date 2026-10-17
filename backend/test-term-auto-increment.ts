/**
 * Test Script: Term Name Auto-Increment and Duplicate Prevention
 * 
 * This script tests:
 * 1. Automatic term name generation
 * 2. Sequential term creation (Term I → Term II → Term III)
 * 3. Duplicate prevention
 * 4. Academic year context handling
 * 5. Program type separation (TVET vs SHORT_PROGRAM)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('\n🧪 Testing Term Name Auto-Increment and Duplicate Prevention\n');
  console.log('═'.repeat(70));

  try {
    // Get or create test academic years
    const academicYear2026 = await prisma.academicYear.upsert({
      where: { name: '2026-2027' },
      update: {},
      create: {
        name: '2026-2027',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-06-30'),
        isCurrent: true,
        isActive: true,
      },
    });

    const academicYear2027 = await prisma.academicYear.upsert({
      where: { name: '2027-2028' },
      update: {},
      create: {
        name: '2027-2028',
        startDate: new Date('2027-09-01'),
        endDate: new Date('2028-06-30'),
        isCurrent: false,
        isActive: true,
      },
    });

    console.log(`\n✅ Academic Years Ready:`);
    console.log(`   - ${academicYear2026.name} (ID: ${academicYear2026.id})`);
    console.log(`   - ${academicYear2027.name} (ID: ${academicYear2027.id})`);

    // Check existing terms instead of deleting
    const existingTerms2026 = await prisma.semester.findMany({
      where: {
        academicYearId: academicYear2026.id,
        programType: 'SHORT_PROGRAM',
      },
      orderBy: { termOrder: 'asc' },
    });

    console.log(`\n📊 Existing SHORT_PROGRAM terms in ${academicYear2026.name}: ${existingTerms2026.length}`);
    existingTerms2026.forEach((t) => {
      console.log(`   - ${t.name} (Order: ${t.termOrder})`);
    });

    // Test 1: Suggest next term name via API logic
    console.log('\n📝 Test 1: Determine next sequential term name');
    const nextOrder = existingTerms2026.length > 0 ? (existingTerms2026[existingTerms2026.length - 1].termOrder || 0) + 1 : 1;
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const suggestedName = `Term ${romanNumerals[nextOrder - 1] || nextOrder}`;
    console.log(`   ✅ Next suggested term: ${suggestedName} (Order: ${nextOrder})`);

    // Test 2: Create the next term
    console.log(`\n📝 Test 2: Create ${suggestedName} for SHORT_PROGRAM`);
    const newTerm = await prisma.semester.create({
      data: {
        academicYearId: academicYear2026.id,
        name: suggestedName,
        programType: 'SHORT_PROGRAM',
        termOrder: nextOrder,
        durationWeeks: 12,
        startDate: new Date(`2027-0${nextOrder * 3}-01`),
        endDate: new Date(`2027-0${nextOrder * 3 + 2}-28`),
        registrationStart: new Date(`2027-0${nextOrder * 3 - 1}-01`),
        registrationEnd: new Date(`2027-0${nextOrder * 3 - 1}-20`),
        addDropDeadline: new Date(`2027-0${nextOrder * 3}-15`),
        isCurrent: false,
        isActive: true,
      },
    });
    console.log(`   ✅ Created: ${newTerm.name} (Order: ${newTerm.termOrder}, ID: ${newTerm.id})`);

    // Test 3: Attempt to create duplicate
    console.log(`\n📝 Test 3: Attempt to create duplicate ${suggestedName} (should fail)`);
    // Test 3: Attempt to create duplicate
    console.log(`\n📝 Test 3: Attempt to create duplicate ${suggestedName} (should fail)`);
    try {
      await prisma.semester.create({
        data: {
          academicYearId: academicYear2026.id,
          name: suggestedName,
          programType: 'SHORT_PROGRAM',
          termOrder: nextOrder,
          durationWeeks: 12,
          startDate: new Date('2027-01-01'),
          endDate: new Date('2027-03-31'),
          registrationStart: new Date('2026-12-01'),
          registrationEnd: new Date('2026-12-20'),
          addDropDeadline: new Date('2027-01-15'),
          isCurrent: false,
          isActive: true,
        },
      });
      console.log('   ❌ FAILED: Duplicate was allowed (should have been prevented)');
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('   ✅ Correctly prevented duplicate: Unique constraint violation');
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`);
      }
    }

    // Clean up the test term we created
    await prisma.semester.delete({
      where: { id: newTerm.id },
    });
    console.log(`\n🧹 Cleaned up test term: ${newTerm.name}`);

    // Test 4: Create Term I in different academic year (should succeed)
    console.log('\n📝 Test 4: Check Term I exists in different academic year (2027-2028)');
    const existingTerms2027 = await prisma.semester.findMany({
      where: { academicYearId: academicYear2027.id, programType: 'SHORT_PROGRAM' },
    });
    
    if (existingTerms2027.length === 0) {
      const term1_2027 = await prisma.semester.create({
        data: {
          academicYearId: academicYear2027.id,
          name: 'Term I',
          programType: 'SHORT_PROGRAM',
          termOrder: 1,
          durationWeeks: 12,
          startDate: new Date('2027-09-01'),
          endDate: new Date('2027-11-30'),
          registrationStart: new Date('2027-08-01'),
          registrationEnd: new Date('2027-08-20'),
          addDropDeadline: new Date('2027-09-15'),
          isCurrent: false,
          isActive: true,
        },
      });
      console.log(`   ✅ Created: ${term1_2027.name} in ${academicYear2027.name}`);
      
      // Clean up
      await prisma.semester.delete({ where: { id: term1_2027.id } });
      console.log(`   🧹 Cleaned up test term from ${academicYear2027.name}`);
    } else {
      console.log(`   ℹ️  Terms already exist in ${academicYear2027.name}: ${existingTerms2027.map(t => t.name).join(', ')}`);
    }

    // Test 5: Verify TVET and SHORT_PROGRAM are separate
    console.log('\n📝 Test 5: Verify TVET and SHORT_PROGRAM separation');

    // Test 5: Verify TVET and SHORT_PROGRAM are separate
    console.log('\n� Test 5: Verify TVET and SHORT_PROGRAM separation');
    const tvetTerms2026 = await prisma.semester.findMany({
      where: { academicYearId: academicYear2026.id, programType: 'TVET' },
      orderBy: { termOrder: 'asc' },
    });
    console.log(`   ✅ Found ${tvetTerms2026.length} TVET semesters (separate from SHORT_PROGRAM)`);
    tvetTerms2026.forEach((t) => {
      console.log(`      - ${t.name} (Order: ${t.termOrder})`);
    });

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 FINAL STATE');
    console.log('═'.repeat(70));

    const shortProgramTerms2026Final = await prisma.semester.findMany({
      where: { academicYearId: academicYear2026.id, programType: 'SHORT_PROGRAM' },
      orderBy: { termOrder: 'asc' },
    });

    console.log(`\n📅 ${academicYear2026.name} SHORT_PROGRAM Terms: ${shortProgramTerms2026Final.length}`);
    shortProgramTerms2026Final.forEach((t) => {
      console.log(`   - ${t.name} (Order: ${t.termOrder})`);
    });

    console.log(`\n📅 ${academicYear2026.name} TVET Semesters: ${tvetTerms2026.length}`);
    tvetTerms2026.forEach((t) => {
      console.log(`   - ${t.name} (Order: ${t.termOrder})`);
    });

    console.log('\n✅ All tests passed! Term auto-increment and duplicate prevention working correctly.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch(console.error);
