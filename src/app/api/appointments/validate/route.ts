import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      date,
      duration = 30,
      providerId,
      patientId: requestedPatientId
    } = body;

    // Determine the actual patient ID based on user role
    let patientId: string;
    if (session.user.isProvider || session.user.isAdmin) {
      patientId = requestedPatientId;
    } else {
      patientId = session.user.id;
    }

    if (!date || !providerId || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: date, providerId, patientId' },
        { status: 400 }
      );
    }

    const appointmentDateTime = new Date(date);
    const appointmentEndTime = new Date(appointmentDateTime.getTime() + duration * 60000);

    const warnings: any[] = [];
    const errors: any[] = [];

    // Check minimum advance booking time (30 minutes from now)
    const now = new Date();
    const minimumBookingTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

    if (appointmentDateTime < minimumBookingTime) {
      errors.push({
        type: 'too_soon',
        message: `Appointments must be booked at least 30 minutes in advance. The earliest available time is ${minimumBookingTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}.`,
        severity: 'error',
        minimumTime: minimumBookingTime.toISOString()
      });
    }

    // Check for exact duplicate appointment (same doctor, same time)
    const existingExactAppointment = await prisma.appointment.findFirst({
      where: {
        patientId,
        providerId,
        date: appointmentDateTime,
        status: {
          in: ['scheduled', 'confirmed', 'in-progress']
        }
      },
      include: {
        provider: {
          select: { firstName: true, lastName: true, specialty: true }
        }
      }
    });

    if (existingExactAppointment) {
      errors.push({
        type: 'duplicate_exact',
        message: `You already have an appointment with Dr. ${existingExactAppointment.provider.firstName} ${existingExactAppointment.provider.lastName} at exactly the same time.`,
        severity: 'error'
      });
    }

    // Check for overlapping appointments with the same doctor
    const overlappingAppointment = await prisma.appointment.findFirst({
      where: {
        patientId,
        providerId,
        OR: [
          {
            AND: [
              { date: { lte: appointmentDateTime } },
              {
                date: {
                  gte: new Date(appointmentDateTime.getTime() - (duration * 60000))
                }
              }
            ]
          },
          {
            AND: [
              { date: { gte: appointmentDateTime } },
              { date: { lt: appointmentEndTime } }
            ]
          }
        ],
        status: {
          in: ['scheduled', 'confirmed', 'in-progress']
        }
      },
      include: {
        provider: {
          select: { firstName: true, lastName: true, specialty: true }
        }
      }
    });

    if (overlappingAppointment) {
      errors.push({
        type: 'overlapping',
        message: `This appointment overlaps with your existing appointment with Dr. ${overlappingAppointment.provider.firstName} ${overlappingAppointment.provider.lastName}.`,
        severity: 'error',
        existingAppointment: {
          date: overlappingAppointment.date,
          duration: overlappingAppointment.duration,
          type: overlappingAppointment.type
        }
      });
    }

    // Check for multiple appointments with same doctor on same day
    const sameDayAppointments = await prisma.appointment.findMany({
      where: {
        patientId,
        providerId,
        date: {
          gte: new Date(appointmentDateTime.getFullYear(), appointmentDateTime.getMonth(), appointmentDateTime.getDate()),
          lt: new Date(appointmentDateTime.getFullYear(), appointmentDateTime.getMonth(), appointmentDateTime.getDate() + 1)
        },
        status: {
          in: ['scheduled', 'confirmed', 'in-progress']
        }
      }
    });

    if (sameDayAppointments.length > 0) {
      warnings.push({
        type: 'same_day_multiple',
        message: `You already have ${sameDayAppointments.length} appointment(s) with this doctor today. Consider if you really need another appointment.`,
        severity: 'warning',
        existingAppointments: sameDayAppointments.map(apt => ({
          date: apt.date,
          type: apt.type,
          status: apt.status
        }))
      });
    }

    // Check for appointments with different doctors at similar times
    const similarTimeAppointments = await prisma.appointment.findMany({
      where: {
        patientId,
        date: {
          gte: new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
          lte: new Date(appointmentDateTime.getTime() + 2 * 60 * 60 * 1000)  // 2 hours after
        },
        status: {
          in: ['scheduled', 'confirmed', 'in-progress']
        }
      },
      include: {
        provider: {
          select: { firstName: true, lastName: true, specialty: true }
        }
      }
    });

    if (similarTimeAppointments.length > 0) {
      warnings.push({
        type: 'busy_schedule',
        message: `You have ${similarTimeAppointments.length} other appointment(s) within 2 hours of this time slot.`,
        severity: 'info',
        nearbyAppointments: similarTimeAppointments.map(apt => ({
          date: apt.date,
          provider: `${apt.provider.firstName} ${apt.provider.lastName}`,
          specialty: apt.provider.specialty,
          type: apt.type
        }))
      });
    }

    // Check for too many appointments in a short period
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        patientId,
        date: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        },
        status: {
          in: ['scheduled', 'confirmed', 'in-progress']
        }
      }
    });

    if (recentAppointments.length >= 3) {
      warnings.push({
        type: 'high_appointment_load',
        message: `You have ${recentAppointments.length} appointments scheduled in the next week. Consider spacing them out for better health management.`,
        severity: 'warning',
        appointmentCount: recentAppointments.length
      });
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      warnings,
      canProceed: warnings.length > 0 && errors.length === 0,
      mustConfirm: warnings.length > 0
    });

  } catch (error) {
    console.error('Appointment validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during validation' },
      { status: 500 }
    );
  }
}