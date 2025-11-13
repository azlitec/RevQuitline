import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { endMeetingAndComplete } from '@/lib/google/calendar';

/**
 * End a meeting for a provider's appointment:
 * - Sets meetingEndAt
 * - Computes meetingDurationSeconds
 * - Updates status to 'completed'
 *
 * POST /api/provider/appointments/[appointmentId]/meet/end
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId: appointmentId } = await params;
    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Verify the appointment belongs to this provider
    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, providerId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found or access denied' }, { status: 404 });
    }

    const updated = await endMeetingAndComplete(appointmentId);

    return NextResponse.json({
      appointmentId: updated.id,
      meetingEndAt: (updated as any).meetingEndAt,
      meetingDurationSeconds: (updated as any).meetingDurationSeconds,
      status: (updated as any).status,
    });
  } catch (error) {
    console.error('[Provider Meet End] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}