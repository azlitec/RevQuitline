import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { recordAttendanceAndMaybeStart, isMeetingActive } from '@/lib/google/calendar';

/**
 * Return Google Meet link and meeting metadata for an appointment if
 * the requester is the provider or the patient of that appointment.
 * Also logs attendance and sets meetingStartAt if not already set.
 *
 * GET /api/appointments/[id]/meet/join
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: appointmentId } = await params;
    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Load appointment and check membership
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const isMember = appt.providerId === session.user.id || appt.patientId === session.user.id;
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If meeting hasn't been created yet, return 404 with guidance
    if (!appt.meetingLink) {
      return NextResponse.json(
        {
          error: 'Meeting link not available',
          message: 'The provider has not created a meeting link yet.',
        },
        { status: 404 }
      );
    }

    // Record attendance and start time if needed
    const displayName =
      session.user.name ||
      (session.user as any).email?.split('@')?.[0] ||
      'participant';
    await recordAttendanceAndMaybeStart(appointmentId, session.user.id, displayName);

    // Reload meeting fields after attendance update
    const apptWithMeeting = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    const meetingStartAt = (apptWithMeeting as any)?.meetingStartAt || null;
    const meetingEndAt = (apptWithMeeting as any)?.meetingEndAt || null;
    const meetingMeta = (apptWithMeeting as any)?.meetingMeta || null;

    // Participant list (if any)
    const participants = Array.isArray(meetingMeta?.participants)
      ? meetingMeta.participants
      : [];

    return NextResponse.json({
      appointmentId,
      meetingLink: appt.meetingLink,
      meetingProvider: (apptWithMeeting as any)?.meetingProvider || 'google_meet',
      meetingId: (apptWithMeeting as any)?.meetingId || null,
      calendarEventId: (apptWithMeeting as any)?.calendarEventId || null,
      active: isMeetingActive(meetingStartAt, meetingEndAt),
      meetingStartAt,
      meetingEndAt,
      meetingDurationSeconds: (apptWithMeeting as any)?.meetingDurationSeconds || null,
      participants,
      metadata: meetingMeta,
    });
  } catch (error) {
    console.error('[Appointments Meet Join] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}