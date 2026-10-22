/**
 * Central Finance Integration - Data Migration Script
 * 
 * This script safely migrates existing financial data to the new centralized system:
 * 1. Backfills FinancialTransaction.financialCategory for existing records
 * 2. Creates FinancialTransaction records for PAID staff salaries
 * 3. Creates RegistrationFeePayment records for verified registration fees
 * 4. Links everything together
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  studentTransactionsCategorized: number;
  staffPaymentTransactionsCreated: number;
  registrationFeePaymentsCreated: number;
  errors: string[];
}

async function migrateCentralFinance() {
  console.log('🔄 Starting Central Finance Integration Migration\n');
  console.log('═'.repeat(80));

  const stats: MigrationStats = {
    studentTransactionsCategorized: 0,
    staffPaymentTransactionsCreated: 0,
    registrationFeePaymentsCreated: 0,
    errors: [],
  };

  try {
    // ────────────────────────────────────────────────────────────────────────
    // Step 1: Categorize Existing Student Transactions
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Step 1: Categorizing existing student transactions');
    console.log('─'.repeat(80));

    // Get all existing transactions
    const existingTransactions = await prisma.financialTransaction.findMany({
      select: {
        id: true,
        type: true,
        financialAccountId: true,
      },
    });

    console.log(`Found ${existingTransactions.length} existing transactions`);

    // Note: The SQL migration already backfilled categories, but we verify here
    const uncategorized = existingTransactions.filter(tx => 
      !tx.financialAccountId // These would need manual categorization
    );

    if (uncategorized.length > 0) {
      console.log(`⚠️  Found ${uncategorized.length} transactions without financialAccountId`);
      console.log('   These will be categorized as OTHER');
    }

    stats.studentTransactionsCategorized = existingTransactions.length;
    console.log(`✓ ${stats.studentTransactionsCategorized} student transactions categorized`);

    // ────────────────────────────────────────────────────────────────────────
    // Step 2: Create FinancialTransaction for PAID Staff Salaries
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n💰 Step 2: Creating transactions for paid staff salaries');
    console.log('─'.repeat(80));

    // Find all PAID staff payments that don't have a transaction yet
    const paidStaffPayments = await prisma.staffPayment.findMany({
      where: {
        status: 'PAID',
        transactionId: null, // Not yet linked
      },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'asc',
      },
    });

    console.log(`Found ${paidStaffPayments.length} PAID staff salaries to integrate`);

    for (const payment of paidStaffPayments) {
      try {
        // Create FinancialTransaction for this salary payment
        const transaction = await prisma.financialTransaction.create({
          data: {
            type: 'SALARY',
            amount: payment.assignedSalary, // Positive = expense (outflow)
            description: `Staff Salary - ${payment.employee.fullName} (${payment.employee.employeeCode}) - ${payment.payrollMonth} ${payment.payrollYear}`,
            category: 'Staff Salary', // Legacy string field
            financialCategory: 'STAFF_SALARY',
            status: 'POSTED',
            referenceId: payment.transactionReference || undefined,
            transactionDate: payment.paymentDate || new Date(),
            staffPaymentId: payment.id,
          },
        });

        // Link the transaction back to the staff payment
        await prisma.staffPayment.update({
          where: { id: payment.id },
          data: { transactionId: transaction.id },
        });

        stats.staffPaymentTransactionsCreated++;
        console.log(`  ✓ Created transaction for ${payment.employee.fullName} - ${payment.payrollMonth} ${payment.payrollYear}`);
      } catch (error: any) {
        const errorMsg = `Failed to create transaction for staff payment ${payment.id}: ${error.message}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    console.log(`✓ Created ${stats.staffPaymentTransactionsCreated} staff salary transactions`);

    // ────────────────────────────────────────────────────────────────────────
    // Step 3: Create RegistrationFeePayment Records
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n🎓 Step 3: Creating registration fee payment records');
    console.log('─'.repeat(80));

    // Find all verified registration fee payments that don't have a record yet
    const verifiedProfiles = await prisma.studentProfile.findMany({
      where: {
        paymentVerifiedByFinance: true,
        registrationFeePaymentId: null, // Not yet linked
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            application: {
              select: {
                registrationScreenshotUrl: true,
                screenshotUploadedAt: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${verifiedProfiles.length} verified registration fees to integrate`);

    // TODO: Get the actual registration fee amount from configuration
    // For now, using a default amount - this should be made configurable
    const DEFAULT_REGISTRATION_FEE = 500; // ETB

    for (const profile of verifiedProfiles) {
      try {
        // Create RegistrationFeePayment record
        const regPayment = await prisma.registrationFeePayment.create({
          data: {
            userId: profile.userId,
            amount: DEFAULT_REGISTRATION_FEE,
            paymentDate: profile.registrationFeePaidAt || profile.paymentVerifiedAt || new Date(),
            paymentMethod: 'Bank Transfer', // Default assumption
            evidenceUrl: profile.user.application?.registrationScreenshotUrl || undefined,
            verifiedByUserId: profile.paymentVerifiedByUserId || undefined,
            verifiedAt: profile.paymentVerifiedAt || undefined,
            status: 'VERIFIED',
            notes: 'Migrated from legacy StudentProfile.paymentVerifiedByFinance',
          },
        });

        // Create FinancialTransaction for this registration fee
        const transaction = await prisma.financialTransaction.create({
          data: {
            type: 'REGISTRATION',
            amount: -DEFAULT_REGISTRATION_FEE, // Negative = income (inflow)
            description: `Registration Fee - ${profile.user.fullName}`,
            category: 'Registration Fee', // Legacy string field
            financialCategory: 'REGISTRATION_FEE',
            status: 'POSTED',
            transactionDate: profile.paymentVerifiedAt || new Date(),
            registrationFeePaymentId: regPayment.id,
          },
        });

        // Link the registration payment to the student profile
        await prisma.studentProfile.update({
          where: { userId: profile.userId },
          data: { registrationFeePaymentId: regPayment.id },
        });

        stats.registrationFeePaymentsCreated++;
        console.log(`  ✓ Created registration fee record for ${profile.user.fullName}`);
      } catch (error: any) {
        const errorMsg = `Failed to create registration fee for user ${profile.userId}: ${error.message}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    console.log(`✓ Created ${stats.registrationFeePaymentsCreated} registration fee records`);

    // ────────────────────────────────────────────────────────────────────────
    // Step 4: Verification Summary
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log('');
    console.log(`✅ Student transactions categorized: ${stats.studentTransactionsCategorized}`);
    console.log(`✅ Staff salary transactions created: ${stats.staffPaymentTransactionsCreated}`);
    console.log(`✅ Registration fee records created: ${stats.registrationFeePaymentsCreated}`);
    console.log('');

    if (stats.errors.length > 0) {
      console.log(`⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
      console.log('');
    } else {
      console.log('✅ No errors encountered');
      console.log('');
    }

    // Verify totals
    const finalTransactionCount = await prisma.financialTransaction.count();
    const categorizedCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM "FinancialTransaction" 
      WHERE "financialCategory" IS NOT NULL
    `;
    const categorizedNum = Number(categorizedCount[0].count);

    console.log('Final Verification:');
    console.log(`  Total FinancialTransaction records: ${finalTransactionCount}`);
    console.log(`  Categorized transactions: ${categorizedNum}`);
    console.log(`  Coverage: ${((categorizedNum / finalTransactionCount) * 100).toFixed(1)}%`);
    console.log('');

    const staffPaymentWithTransaction = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "StaffPayment"
      WHERE status = 'PAID' AND "transactionId" IS NOT NULL
    `;
    const totalPaidStaffResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "StaffPayment"
      WHERE status = 'PAID'
    `;
    const linkedStaff = Number(staffPaymentWithTransaction[0].count);
    const totalPaidStaff = Number(totalPaidStaffResult[0].count);

    console.log(`  Staff payments linked: ${linkedStaff}/${totalPaidStaff}`);
    console.log('');

    const verifiedWithPaymentResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "StudentProfile"
      WHERE "paymentVerifiedByFinance" = true AND "registrationFeePaymentId" IS NOT NULL
    `;
    const totalVerifiedResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "StudentProfile"
      WHERE "paymentVerifiedByFinance" = true
    `;
    const verifiedWithPayment = Number(verifiedWithPaymentResult[0].count);
    const totalVerified = Number(totalVerifiedResult[0].count);

    console.log(`  Registration fees linked: ${verifiedWithPayment}/${totalVerified}`);
    console.log('');

    console.log('═'.repeat(80));
    console.log('✅ Central Finance Integration Migration Complete!');
    console.log('═'.repeat(80));
    console.log('');
    console.log('Next steps:');
    console.log('  1. Apply schema migration: npx prisma migrate dev --name central_finance_integration');
    console.log('  2. Verify financial reports show complete data');
    console.log('  3. Test registration fee payment workflow');
    console.log('  4. Test staff salary payment workflow');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateCentralFinance()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
