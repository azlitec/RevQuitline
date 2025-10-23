/**
 * Prescription refill readiness reminder job
 * Queries active prescriptions whose endDate is within the next LEAD_DAYS
 * and have remaining refills, then notifies patients via push.
 *
 * Usage:
 *   - Schedule daily (e.g., every morning) or twice daily via platform cron
 *   - npm run cron:send-refill-reminders (add script in package.json)
 *
 * Environment:
 *   PRESCRIPTION_REFILL_LEAD_DAYS (optional, default 7)
 */

import { prisma } from '../src/lib/db';
import { NotificationService } from '../src/lib/notifications/notificationService';

type RefillStats = {
  targeted: number;
  sent: number;
  failed: number;
};

function formatDate(dt: Date) {
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getLeadDays(): number {
  const raw = process.env.PRESCRIPTION_REFILL_LEAD_DAYS;
  const n = raw ? parseInt(raw, 10) : 7;
  return Number.isFinite(n) && n > 0 ? n : 7;
}

async function sendRefillReminder(prescription: {
  id: string;
  patientId: string;
  medicationName: string;
  endDate: Date | null;
  refills: number;
}) {
  const dueStr = prescription.endDate ? formatDate(new Date(prescription.endDate)) : 'soon';
  const title = 'Prescription refill available';
  const body = `Your prescription "${prescription.medicationName}" is due for refill by ${dueStr}.`;
  await NotificationService.createNotification(
    prescription.patientId,
    'prescription',
    title,
    body,
    'high',
    '/patient/prescriptions'
  );
}

async function main() {
  const leadDays = getLeadDays();
  const now = new Date();
  const cutoff = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);

  // Target ACTIVE prescriptions that have an endDate within next leadDays and at least 1 refill remaining
  const upcoming = await prisma.prescription.findMany({
    where: {
      status: 'ACTIVE',
      refills: { gt: 0 },
      endDate: { gte: now, lte: cutoff },
    },
    select: {
      id: true,
      patientId: true,
      medicationName: true,
      endDate: true,
      refills: true,
    },
    orderBy: { endDate: 'asc' },
  });

  const stats: RefillStats = {
    targeted: upcoming.length,
    sent: 0,
    failed: 0,
  };

  console.log(
    `[RefillReminders] Targeting ${upcoming.length} prescriptions with endDate between ${now.toISOString()} and ${cutoff.toISOString()}`
  );

  for (const rx of upcoming) {
    try {
      await sendRefillReminder(rx);
      stats.sent++;
    } catch (err) {
      stats.failed++;
      console.error(`[RefillReminders] Failed to notify patient for prescription ${rx.id}`, err);
    }

    // Throttle slightly to avoid burst send; adjust as necessary
    await new Promise((r) => setTimeout(r, 50));
  }

  const totalAttempts = stats.sent + stats.failed;
  const failureRate = totalAttempts ? (stats.failed / totalAttempts) * 100 : 0;

  console.log(
    `[RefillReminders] Completed. Targeted=${stats.targeted} sent=${stats.sent} failed=${stats.failed} failureRate=${failureRate.toFixed(
      2
    )}%`
  );
  if (failureRate > 10) {
    console.error('[RefillReminders] ALERT: Delivery failure rate exceeded 10% threshold');
  }
}

// Run as standalone
main()
  .then(() => {
    console.log('[RefillReminders] Job finished successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[RefillReminders] Job failed', err);
    process.exit(1);
  });