/**
 * Appointment reminder job
 * Queries appointments starting in the next hour and sends push notifications to both patient and provider.
 * Usage:
 *   - Add a cron task to run this script every 5-10 minutes (Vercel Cron or external scheduler)
 *   - npm run cron:send-reminders (configure script in package.json)
 */

import { prisma } from '../src/lib/db';
import { NotificationService } from '../src/lib/notifications/notificationService';

type ReminderStats = {
  targeted: number;
  sentPatient: number;
  sentProvider: number;
  failed: number;
};

function formatDateTime(dt: Date) {
  const dateStr = dt.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = dt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} ${timeStr}`;
}

async function sendAppointmentReminder(appointment: {
  id: string;
  title: string;
  date: Date;
  patientId: string;
  providerId: string;
}) {
  const startStr = formatDateTime(new Date(appointment.date));

  // Patient reminder
  await NotificationService.createNotification(
    appointment.patientId,
    'appointment',
    'Appointment Reminder',
    `Your appointment "${appointment.title}" starts at ${startStr}.`,
    'high',
    '/patient/appointments'
  );

  // Provider reminder
  await NotificationService.createNotification(
    appointment.providerId,
    'appointment',
    'Appointment Reminder',
    `You have "${appointment.title}" with a patient at ${startStr}.`,
    'medium',
    '/provider/appointments'
  );
}

async function main() {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  // Guard to limit duplicate notifications if run frequently:
  // Only target appointments starting in the next hour (inclusive)
  // and not in the past.
  const upcoming = await prisma.appointment.findMany({
    where: {
      date: {
        gte: now,
        lte: inOneHour,
      },
      status: {
        in: ['scheduled', 'confirmed'],
      },
    },
    select: {
      id: true,
      title: true,
      date: true,
      patientId: true,
      providerId: true,
    },
    orderBy: { date: 'asc' },
  });

  const stats: ReminderStats = {
    targeted: upcoming.length,
    sentPatient: 0,
    sentProvider: 0,
    failed: 0,
  };

  console.log(`[Reminders] Targeting ${upcoming.length} appointments from ${now.toISOString()} to ${inOneHour.toISOString()}`);

  for (const appt of upcoming) {
    try {
      await sendAppointmentReminder(appt);
      // NotificationService.createNotification internally attempts both email and push,
      // but for stats we count push intent for both parties.
      stats.sentPatient++;
      stats.sentProvider++;
      // Record delivery audit is handled inside NotificationService sendPushNotification
    } catch (err) {
      stats.failed++;
      console.error(`[Reminders] Failed to send reminder for appointment ${appt.id}`, err);
    }

    // Optional throttle to avoid burst sends; adjust as needed
    await new Promise((r) => setTimeout(r, 50));
  }

  // Basic failure-rate alert threshold (log only; hook to alerting system if available)
  const totalDeliveries = stats.sentPatient + stats.sentProvider + stats.failed;
  const failureRate = totalDeliveries ? (stats.failed / totalDeliveries) * 100 : 0;

  console.log(
    `[Reminders] Completed. Targeted=${stats.targeted} sentPatient=${stats.sentPatient} sentProvider=${stats.sentProvider} failed=${stats.failed} failureRate=${failureRate.toFixed(2)}%`
  );

  if (failureRate > 10) {
    // Hook alerting integration here (email, monitoring, etc.)
    console.error('[Reminders] ALERT: Delivery failure rate exceeded 10% threshold');
  }
}

// Run as a standalone script
main()
  .then(() => {
    console.log('[Reminders] Job finished successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Reminders] Job failed', err);
    process.exit(1);
  });