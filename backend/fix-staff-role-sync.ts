/**
 * Fix Staff Role Synchronization
 * 
 * This script synchronizes existing staff roles across User, HREmployee,
 * InstructorRecord, and DepartmentHeadRecord tables.
 * 
 * Uses User.role as the source of truth.
 */

import { PrismaClient } from '@prisma/client';
import { syncUserRoleToAll } from './src/services/sync/staffRoleSync';

const prisma = new PrismaClient();

interface SyncReport {
  totalUsers: number;
  synced: number;
  skipped: number;
  errors: number;
  details: Array<{
    userId: string;
    email: string;
    role: string;
    success: boolean;
    syncedTables?: string[];
    error?: string;
  }>;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Staff Role Synchronization Fix');
  console.log('='.repeat(60));
  console.log('');
  console.log('This script will sync all staff roles from User.role to:');
  console.log('- HREmployee.systemRole');
  console.log('- InstructorRecord (for INSTRUCTOR/DEPARTMENT_HEAD roles)');
  console.log('- DepartmentHeadRecord (for DEPARTMENT_HEAD role)');
  console.log('');

  // Find all users with staff roles who have HREmployee records
  const staffUsers = await prisma.user.findMany({
    where: {
      role: {
        in: ['INSTRUCTOR', 'DEPARTMENT_HEAD', 'REGISTRAR', 'FINANCE_OFFICER', 'HR_OFFICER', 'ADMIN'],
      },
      hrEmployee: {
        isNot: null,
      },
    },
    include: {
      hrEmployee: true,
    },
    orderBy: {
      email: 'asc',
    },
  });

  console.log(`Found ${staffUsers.length} staff users to sync\n`);

  const report: SyncReport = {
    totalUsers: staffUsers.length,
    synced: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (const user of staffUsers) {
    const hrEmployee = user.hrEmployee;
    
    if (!hrEmployee) {
      console.log(`⚠ Skip: ${user.email} - No HR record`);
      report.skipped++;
      report.details.push({
        userId: user.id,
        email: user.email,
        role: user.role,
        success: false,
        error: 'No HR record',
      });
      continue;
    }

    // Check if sync is needed
    const roleMatch = user.role === hrEmployee.systemRole;
    
    console.log(`Processing: ${user.email}`);
    console.log(`  Current: User.role=${user.role}, HREmployee.systemRole=${hrEmployee.systemRole}`);
    console.log(`  Department: ${hrEmployee.departmentId ? 'Yes' : 'No'}`);

    if (roleMatch && hrEmployee.departmentId) {
      // Verify academic records exist
      if (user.role === 'INSTRUCTOR' || user.role === 'DEPARTMENT_HEAD') {
        const instructorRecord = await prisma.instructorRecord.findFirst({
          where: { userId: user.id, isActive: true },
        });

        const deptHeadRecord = await prisma.departmentHeadRecord.findFirst({
          where: { userId: user.id, isActive: true },
        });

        const needsInstructorRecord = !instructorRecord;
        const needsDeptHeadRecord = (user.role === 'DEPARTMENT_HEAD') && !deptHeadRecord;

        if (needsInstructorRecord || needsDeptHeadRecord) {
          console.log(`  Action: Sync (missing academic records)`);
          const result = await syncUserRoleToAll(user.id, user.role, hrEmployee.departmentId);
          
          if (result.success) {
            console.log(`  ✓ Success: ${result.syncedTables.join(', ')}`);
            report.synced++;
            report.details.push({
              userId: user.id,
              email: user.email,
              role: user.role,
              success: true,
              syncedTables: result.syncedTables,
            });
          } else {
            console.log(`  ✗ Error: ${result.errors?.join(', ')}`);
            report.errors++;
            report.details.push({
              userId: user.id,
              email: user.email,
              role: user.role,
              success: false,
              error: result.errors?.join(', '),
            });
          }
        } else {
          console.log(`  → Already synced`);
          report.skipped++;
          report.details.push({
            userId: user.id,
            email: user.email,
            role: user.role,
            success: true,
            syncedTables: ['Already synced'],
          });
        }
      } else {
        console.log(`  → Already synced`);
        report.skipped++;
        report.details.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          success: true,
          syncedTables: ['Already synced'],
        });
      }
    } else {
      console.log(`  Action: Sync (role mismatch or missing department)`);
      const result = await syncUserRoleToAll(user.id, user.role, hrEmployee.departmentId || undefined);
      
      if (result.success) {
        console.log(`  ✓ Success: ${result.syncedTables.join(', ')}`);
        report.synced++;
        report.details.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          success: true,
          syncedTables: result.syncedTables,
        });
      } else {
        console.log(`  ✗ Error: ${result.errors?.join(', ')}`);
        report.errors++;
        report.details.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          success: false,
          error: result.errors?.join(', '),
        });
      }
    }
    
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('Synchronization Complete');
  console.log('='.repeat(60));
  console.log(`Total users processed: ${report.totalUsers}`);
  console.log(`Successfully synced: ${report.synced}`);
  console.log(`Already synced (skipped): ${report.skipped}`);
  console.log(`Errors: ${report.errors}`);
  console.log('');

  if (report.errors > 0) {
    console.log('Users with errors:');
    report.details
      .filter(d => !d.success && d.error)
      .forEach(d => {
        console.log(`  - ${d.email}: ${d.error}`);
      });
    console.log('');
  }

  console.log('✓ Synchronization complete');
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify changes in database');
  console.log('2. Test role changes in both HR and Registrar dashboards');
  console.log('3. Confirm permissions and dashboard access work correctly');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
