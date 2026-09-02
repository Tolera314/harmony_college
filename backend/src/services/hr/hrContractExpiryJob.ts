/**
 * Contract Expiry Notification Job
 * ──────────────────────────────────────────────────────────────────────
 * Runs once on startup, then every 24 hours.
 * Finds employees with contracts expiring within 60 days that have not
 * already been flagged as EXPIRING_SOON, updates their contractStatus,
 * creates an in-app notification (unified Notification table, module=HR),
 * and sends an email to all HR officers.
 */

import { prisma }              from '../../lib/prisma';
import { getEmailProvider }   from '../../lib/providers';
import { createNotification } from './hrNotificationService';

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // once per day
const WARN_DAYS_AHEAD   = 60;

export async function runContractExpiryCheck(): Promise<void> {
  try {
    const now       = new Date();
    const threshold = new Date(now.getTime() + WARN_DAYS_AHEAD * 24 * 60 * 60 * 1000);

    // Find employees whose contract ends within the warning window and are still ACTIVE/PROBATION
    const expiring = await prisma.hREmployee.findMany({
      where: {
        contractEndDate:  { gte: now, lte: threshold },
        contractStatus:   { notIn: ['EXPIRING_SOON', 'EXPIRED'] },
        status:           { in: ['ACTIVE', 'ON_LEAVE'] },
        isActive:         true,
      },
      select: {
        id: true, fullName: true, email: true, contractEndDate: true,
        position: true, department: { select: { name: true } },
      },
    });

    if (expiring.length === 0) return;

    // Bulk-update contractStatus to EXPIRING_SOON
    await prisma.hREmployee.updateMany({
      where: { id: { in: expiring.map(e => e.id) } },
      data:  { contractStatus: 'EXPIRING_SOON' },
    });

    // Fetch all HR officers to notify
    const hrOfficers = await prisma.user.findMany({
      where:  { role: 'HR_OFFICER', status: 'ACTIVE' },
      select: { id: true, email: true, fullName: true },
    });

    const emailProvider = getEmailProvider();

    for (const emp of expiring) {
      const expiresOn = emp.contractEndDate!.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

      // In-app notifications for each HR officer (uses unified Notification table)
      for (const officer of hrOfficers) {
        await createNotification({
          recipientUserId: officer.id,
          employeeId:      emp.id,
          type:            'CONTRACT',
          title:           `Contract Expiring: ${emp.fullName}`,
          message:         `${emp.fullName}'s contract expires on ${expiresOn}. Renewal action required within ${WARN_DAYS_AHEAD} days.`,
          tab:             'employees',
        });

        // Email to HR officer
        try {
          if (officer.email) {
            await emailProvider.sendHrNotificationEmail(officer.email, {
              recipientName: officer.fullName,
              subject:       `Contract Expiry Alert: ${emp.fullName}`,
              heading:       `Contract Expiry Alert`,
              body: `The following employee's contract is expiring soon:\n\nName:       ${emp.fullName}\nPosition:   ${emp.position}\nDepartment: ${emp.department?.name ?? '—'}\nExpires:    ${expiresOn}\n\nPlease initiate the contract renewal process or notify the employee as per college policy.`,
            });
          }
        } catch (emailErr) {
          console.error('[contractExpiryJob] Email failed for officer', officer.id, emailErr);
        }
      }

      // Also notify the employee directly by email
      try {
        if (emp.email) {
          await emailProvider.sendHrNotificationEmail(emp.email, {
            recipientName: emp.fullName,
            subject:       `Your Employment Contract is Expiring Soon`,
            heading:       `Employment Contract Expiry Notice`,
            body: `Your employment contract with Harmony College is scheduled to expire on ${expiresOn}.\n\nPlease contact the HR office to discuss renewal or other arrangements.\n\nThis is an automated reminder.`,
          });
        }
      } catch (emailErr) {
        console.error('[contractExpiryJob] Employee email failed for', emp.id, emailErr);
      }
    }

    console.log(`[contractExpiryJob] Processed ${expiring.length} expiring contract(s).`);
  } catch (err) {
    console.error('[contractExpiryJob] Error during contract expiry check:', err);
  }
}

/** Start the daily contract expiry job. Called once at server startup. */
export function startContractExpiryJob(): void {
  // Run once immediately (DB should be ready by now), then every 24 h.
  runContractExpiryCheck();
  setInterval(runContractExpiryCheck, CHECK_INTERVAL_MS);
  console.log('[contractExpiryJob] Started — checking every 24 hours.');
}
