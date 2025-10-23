import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { createGoogleMeetForAppointment } from '@/lib/google/calendar';

/**
 * Create (or return existing) Google Meet link for a provider's appointment.
 * - Requires authenticated provider who owns the appointment.
 * - If Google OAuth isn't connected for the provider, returns 428 with an oauthUrl to connect.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.appointmentId;
    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Verify the appointment belongs to this provider
    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId: session.user.id },
      select: {
        id: true,
        meetingLink: true,
        meetingProvider: true,
        calendarEventId: true,
        meetingId: true,
        date: true,
        duration: true,
        title: true,
      } as any, // allow fields added in recent migration
    });

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found or access denied' }, { status: 404 });
    }

    // If already has a meeting link, return it
    if (existing.meetingLink) {
      return NextResponse.json({
        appointmentId: existing.id,
        meetingLink: existing.meetingLink,
        meetingProvider: (existing as any).meetingProvider || 'google_meet',
        calendarEventId: (existing as any).calendarEventId || null,
        meetingId: (existing as any).meetingId || null,
        title: existing.title,
        date: existing.date,
        duration: existing.duration,
        created: false,
      });
    }

    // Create a new Google Meet for this appointment
    if (process.env.DISABLE_GOOGLE === 'true') {
      return NextResponse.json(
        { error: 'Google integration disabled' },
        { status: 503 }
      );
    }
    const updated = await createGoogleMeetForAppointment(appointmentId, session.user.id);

    return NextResponse.json({
      appointmentId: updated.id,
      meetingLink: (updated as any).meetingLink,
      meetingProvider: (updated as any).meetingProvider,
      calendarEventId: (updated as any).calendarEventId,
      meetingId: (updated as any).meetingId,
      title: (updated as any).title,
      date: (updated as any).date,
      duration: (updated as any).duration,
      created: true,
    });
  } catch (error: any) {
    // If Google not connected, bubble an oauthUrl allowing client to initiate OAuth
    if (error && error.oauthUrl) {
      return NextResponse.json(
        { error: 'Google account not connected', oauthUrl: error.oauthUrl },
        { status: 428 } // Precondition Required
      );
    }
    console.error('Create Meet link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}