/**
 * Test Audit Logs System
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('Audit Logs System Test');
  console.log('='.repeat(60));
  console.log('');

  // Check AuditLog table
  console.log('1. Checking AuditLog table...');
  const auditLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  });
  console.log(`   Found ${auditLogs.length} audit logs`);
  for (const log of auditLogs) {
    console.log(`   - ${log.action} by ${log.user?.fullName || 'Unknown'} at ${log.createdAt.toLocaleString()}`);
  }
  console.log('');

  // Check RegistrarAuditLog table
  console.log('2. Checking RegistrarAuditLog table...');
  const registrarLogs = await prisma.registrarAuditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  });
  console.log(`   Found ${registrarLogs.length} registrar audit logs`);
  for (const log of registrarLogs) {
    console.log(`   - ${log.action} by ${log.user.fullName} at ${log.createdAt.toLocaleString()}`);
    console.log(`     Entity: ${log.entityType} | ${log.description}`);
  }
  console.log('');

  // Check HRAuditLog table
  console.log('3. Checking HRAuditLog table...');
  const hrLogs = await prisma.hRAuditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log(`   Found ${hrLogs.length} HR audit logs`);
  for (const log of hrLogs) {
    console.log(`   - ${log.action} in ${log.module} at ${log.createdAt.toLocaleString()}`);
    console.log(`     ${log.description} (Status: ${log.status})`);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log(`  AuditLog count: ${await prisma.auditLog.count()}`);
  console.log(`  RegistrarAuditLog count: ${await prisma.registrarAuditLog.count()}`);
  console.log(`  HRAuditLog count: ${await prisma.hRAuditLog.count()}`);
  console.log(`  DepartmentHeadAuditLog count: ${await prisma.departmentHeadAuditLog.count()}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
