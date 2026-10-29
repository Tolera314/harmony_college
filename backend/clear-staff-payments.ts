/**
 * Clear all staff payment records from database
 * Run: npx tsx clear-staff-payments.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearStaffPayments() {
  try {
    console.log('🗑️  Clearing staff payment records...');
    
    // Delete all staff payment records
    const result = await prisma.staffPayment.deleteMany({});
    
    console.log(`✅ Deleted ${result.count} staff payment records`);
    console.log('✨ Database cleared! Staff Payments view is now empty.');
    
  } catch (error) {
    console.error('❌ Error clearing staff payments:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearStaffPayments();
