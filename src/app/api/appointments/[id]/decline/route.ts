import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notificationService';

/**
 * PATCH /api/appointments/[id]/decline
 * - Cancels a scheduled appointment (status -> cancelled)
 * - Accepts body { reason?: string }
 * - Provider-only, must own the appointment
 * - Logs audit "appointment.declined" with reason
 * - Notifies patient
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;
    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason: string | undefined = body?.reason;

    // Load appointment and verify ownership
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { provider: true, patient: true },
    });

    if (!existingAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (existingAppointment.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Only allow decline from scheduled or confirmed
    if (!['scheduled', 'confirmed'].includes(existingAppointment.status)) {
      return NextResponse.json(
        { error: 'Only scheduled or confirmed appointments can be declined' },
        { status: 400 }
      );
    }

    // Persist reason into notes (schema has no dedicated cancelReason)
    const appendedNotes = [
      existingAppointment.notes || '',
      reason ? `cancelReason:${reason}` : '',
    ]
      .filter(Boolean)
      .join('\n')
      .trim();

    // Update to cancelled
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        notes: appendedNotes || existingAppointment.notes,
        updatedAt: new Date(),
      },
      include: {
        provider: {
          select: { firstName: true, lastName: true, email: true, specialty: true },
        },
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'update',
          entityType: 'appointment',
          entityId: appointmentId,
          source: 'api',
          metadata: {
            event: 'appointment.declined',
            previousStatus: existingAppointment.status,
            newStatus: updated.status,
            reason: reason || null,
          } as any,
        },
      });
    } catch (auditErr) {
      console.error('Failed to write audit log (decline):', auditErr);
    }

    // Notify patient
    try {
      const patientName = `${updated.patient.firstName} ${updated.patient.lastName}`;
      const appointmentDate = new Date(updated.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      const appointmentTime = new Date(updated.date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      await NotificationService.createNotification(
        existingAppointment.patientId,
        'warning',
        'Appointment Declined',
        `Your appointment on ${appointmentDate} at ${appointmentTime} was declined${reason ? `: ${reason}` : ''}`,
        'high',
        undefined
      );
    } catch (notificationErr) {
      console.error('Failed to create notifications (decline):', notificationErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Decline appointment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}