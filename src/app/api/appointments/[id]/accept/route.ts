import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notificationService';

/**
 * PATCH /api/appointments/[id]/accept
 * - Confirms a scheduled appointment (status -> confirmed)
 * - Provider-only, must own the appointment
 * - Logs audit "appointment.accepted" via AuditLog (action=update, metadata.event)
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

    // Load appointment and verify ownership
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        provider: true,
        patient: true,
      },
    });

    if (!existingAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (existingAppointment.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Only allow accept from scheduled status
    if (existingAppointment.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled appointments can be accepted' },
        { status: 400 }
      );
    }

    // Update to confirmed
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'confirmed',
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
            event: 'appointment.accepted',
            previousStatus: existingAppointment.status,
            newStatus: updated.status,
          } as any,
        },
      });
    } catch (auditErr) {
      console.error('Failed to write audit log (accept):', auditErr);
    }

    // Notify provider (optional) and patient
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

      // Provider info notice
      await NotificationService.createNotification(
        updated.providerId,
        'success',
        'Appointment Accepted',
        `You accepted appointment with ${patientName} on ${appointmentDate} at ${appointmentTime}`,
        'medium',
        `/provider/appointments`
      );

      // Patient notice
      await NotificationService.createNotification(
        existingAppointment.patientId,
        'success',
        'Appointment Confirmed',
        `Your appointment has been accepted by the provider for ${appointmentDate} at ${appointmentTime}`,
        'medium',
        undefined
      );
    } catch (notificationErr) {
      console.error('Failed to create notifications (accept):', notificationErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Accept appointment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}