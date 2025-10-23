import { google, calendar_v3 } from 'googleapis';
import { prisma } from '@/lib/db';
import { ensureClientForUser, assertProviderHasGoogle } from '@/lib/google/googleClient';

/**
 * Create a Google Calendar event with a Google Meet link for a given appointment.
 * - Requires the provider (doctor) to have connected Google OAuth (refresh token).
 * - Stores meeting details back into the Appointment record.
 *
 * Returns updated appointment including meeting fields.
 */
export async function createGoogleMeetForAppointment(appointmentId: string, providerId: string) {
  // Ensure appointment exists and belongs to provider
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, providerId },
  });

  if (!appt) {
    throw new Error('Appointment not found or access denied');
  }

  // Fetch provider and patient minimal details
  const [provider, patient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.user.findUnique({
      where: { id: appt.patientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  // Ensure provider has Google connected
  await assertProviderHasGoogle(providerId);

  const oauth2Client = await ensureClientForUser(providerId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Compute start/end
  const startDate = new Date(appt.date);
  const endDate = new Date(appt.date);
  const durationMinutes = appt.duration || 30;
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);

  // Try to use a timezone from environment or fall back to UTC
  const timeZone = process.env.APP_TIMEZONE || 'UTC';

  const requestId = `appt-${appointmentId}-${Date.now()}`;

  const attendees: calendar_v3.Schema$EventAttendee[] = [];
  const patientEmail = patient?.email;
  if (patientEmail) {
    attendees.push({
      email: patientEmail,
      displayName: `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim() || undefined,
      optional: false,
    });
  }

  const summary =
    appt.title || `Consultation with ${patient?.firstName ?? 'patient'}`;
  const description = [
    appt.serviceName ? `Service: ${appt.serviceName}` : '',
    `Appointment ID: ${appointmentId}`,
  ]
    .filter(Boolean)
    .join('\n');

  const event: calendar_v3.Schema$Event = {
    summary,
    description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone,
    },
    attendees,
    // Ask Google to create a Meet for us
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  // Insert event on provider's primary calendar
  const insertResp = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all', // notify attendees via email (optional)
  });

  const created = insertResp.data;

  // Extract Meet link and IDs
  const conference = created.conferenceData;
  const entryPoints = conference?.entryPoints || [];
  const meetVideo = entryPoints.find((e) => e.entryPointType === 'video');
  const meetingLink =
    meetVideo?.uri ||
    (created.hangoutLink as string | undefined) ||
    undefined;

  const meetingId =
    (conference?.conferenceId as string | undefined) ||
    (created.id as string | undefined) ||
    undefined;

  // Persist on appointment (cast to avoid TS literal issues during schema evolution)
  const dataAny: any = {
    meetingProvider: 'google_meet',
    meetingLink: meetingLink ?? null,
    meetingId: meetingId ?? null,
    calendarEventId: created.id || null,
    meetingMeta: {
      ...(created.htmlLink ? { htmlLink: created.htmlLink } : {}),
      ...(conference?.conferenceId ? { conferenceId: conference.conferenceId } : {}),
      ...(entryPoints?.length ? { entryPoints } : {}),
      organizer: provider?.email ?? null,
    },
    updatedAt: new Date(),
  };

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: dataAny,
  });

  return updated;
}

/**
 * Basic helper to derive "active" status based on stored timestamps.
 * Free Google APIs do not expose live Meet presence in free tier;
 * use in-app signals and timestamps instead.
 */
export function isMeetingActive(meetingStartAt?: Date | null, meetingEndAt?: Date | null) {
  if (!meetingStartAt) return false;
  if (meetingEndAt) return false;
  const now = Date.now();
  return meetingStartAt.getTime() <= now;
}

/**
 * Track attendance (in meetingMeta.participants array) and optionally set start time.
 */
export async function recordAttendanceAndMaybeStart(appointmentId: string, userId: string, displayName?: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  const meta = ((appt as any)?.meetingMeta) || {};
  const participants: any[] = Array.isArray(meta.participants) ? meta.participants : [];

  participants.push({
    userId,
    displayName,
    joinedAt: new Date().toISOString(),
  });

  const dataAny: any = {
    meetingMeta: {
      ...meta,
      participants,
    },
  };

  if (!(appt as any)?.meetingStartAt) {
    dataAny.meetingStartAt = new Date();
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: dataAny,
  });
}

/**
 * Mark meeting end, compute duration, optionally set status COMPLETED.
 */
export async function endMeetingAndComplete(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  const end = new Date();
  let durationSeconds: number | null = null;

  const startAt = (appt as any)?.meetingStartAt as Date | undefined;
  if (startAt) {
    durationSeconds = Math.max(
      0,
      Math.floor((end.getTime() - new Date(startAt).getTime()) / 1000)
    );
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      meetingEndAt: end,
      meetingDurationSeconds: durationSeconds,
      status: 'completed',
      updatedAt: new Date(),
    } as any,
  });
}