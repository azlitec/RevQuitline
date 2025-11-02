import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notificationService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const patientId = searchParams.get('patientId');

    // Build where clause
    const where: any = {
      providerId: session.user.id
    };

    if (status) {
      const statusArray = status.split(',');
      where.status = { in: statusArray };
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay
      };
    } else if (startDate && endDate) {
      // For calendar view - get appointments within date range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.date = {
        gte: start,
        lte: end
      };
    }

    if (patientId) {
      where.patientId = patientId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            smokingStatus: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!session.user.isProvider) {
      return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    }

    const body = await request.json();
    const { patientId, date, duration, type, reason, notes } = body;

    // Validate required fields
    if (!patientId || !date) {
      return NextResponse.json(
        { error: 'Patient ID and date are required' },
        { status: 400 }
      );
    }

    // Normalize service type to Prisma enum ServiceType (consultation, follow_up, emergency, quitline_smoking_cessation, psychiatrist_session)
    const allowedTypes = ['consultation','follow_up','emergency','quitline_smoking_cessation','psychiatrist_session'] as const;
    const rawType = (type ?? 'consultation');
    let normalizedType = typeof rawType === 'string'
      ? rawType.trim().toLowerCase().replace(/-/g, '_')
      : 'consultation';
    if (!(allowedTypes as readonly string[]).includes(normalizedType)) {
      normalizedType = 'consultation';
    }

    // Load patient name to construct a sensible required title
    const patientForTitle = await prisma.user.findUnique({
      where: { id: patientId },
      select: { firstName: true, lastName: true }
    });
    const patientName = patientForTitle
      ? `${patientForTitle.firstName ?? ''} ${patientForTitle.lastName ?? ''}`.trim()
      : 'patient';
    const humanizedType = normalizedType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const computedTitle = `${humanizedType} with ${patientName || 'patient'}`;

    // Create appointment - using only fields that exist in schema
    const appointmentData: any = {
      title: computedTitle,
      patientId,
      providerId: session.user.id,
      date: new Date(date),
      duration: duration || 30,
      type: normalizedType,
      status: 'scheduled'
    };

    // Add optional fields if provided
    if (reason) {
      appointmentData.description = reason;
    }
    
    if (notes) {
      appointmentData.notes = notes;
    }

    const appointment = await prisma.appointment.create({
      data: appointmentData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Create notification for the provider
    try {
      const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
      const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const appointmentTime = new Date(appointment.date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      await NotificationService.createNotification(
        session.user.id,
        'success',
        'New Appointment Scheduled',
        `New appointment with ${patientName} on ${appointmentDate} at ${appointmentTime}`,
        'medium',
        `/provider/appointments`
      );
    } catch (notificationError) {
      console.error('Failed to create appointment notification:', notificationError);
      // Don't fail the appointment creation if notification fails
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Unknown argument')) {
        return NextResponse.json(
          { error: 'Invalid appointment data provided' },
          { status: 400 }
        );
      }
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid patient or provider ID' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}