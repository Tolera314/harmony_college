import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const emp   = await p.hREmployee.count();
  const dept  = await p.hRDepartment.count();
  const leave = await p.hRLeaveRequest.count();
  const pay   = await p.hRPayrollRecord.count();
  const perf  = await p.hRPerformanceReview.count();
  const doc   = await p.hRDocument.count();
  const audit = await p.hRAuditLog.count();
  const notif = await p.hRNotification.count();
  console.log(JSON.stringify({ emp, dept, leave, payroll: pay, perf, doc, audit, notif }));
}
main().catch(console.error).finally(() => p.$disconnect());
