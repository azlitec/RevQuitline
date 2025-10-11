import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notificationService';

/**
 * PATCH /api/appointments/[id]/reschedule
 * - Reschedules an appointment to a new date/time
 * - Body: { date: string (ISO) }
 * - Provider-only, must own the appointment
 * - Logs audit "appointment.rescheduled" with previous & new date
 * - Notifies patient about change
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

    const body = await request.json();
    const { date } = body as { date?: string };

    if (!date) {
      return NextResponse.json({ error: 'New date is required' }, { status: 400 });
    }

    const newDate = new Date(date);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
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

    // Update date (keep current status)
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: newDate,
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
            event: 'appointment.rescheduled',
            previousDate: existingAppointment.date.toISOString(),
            newDate: updated.date.toISOString(),
            status: updated.status,
          } as any,
        },
      });
    } catch (auditErr) {
      console.error('Failed to write audit log (reschedule):', auditErr);
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
        'success',
        'Appointment Rescheduled',
        `Your appointment has been rescheduled to ${appointmentDate} at ${appointmentTime}`,
        'medium',
        undefined
      );
    } catch (notificationErr) {
      console.error('Failed to create notifications (reschedule):', notificationErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}