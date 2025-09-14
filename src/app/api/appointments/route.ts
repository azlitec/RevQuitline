import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // Filter by patient or provider based on user role
    if (session.user.isProvider) {
      whereClause.providerId = session.user.id;
    } else {
      whereClause.patientId = session.user.id;
    }

    // Filter by status if provided - support multiple statuses separated by commas
    if (status && status !== 'all') {
      const statuses = status.split(',');
      if (statuses.length > 1) {
        whereClause.status = { in: statuses };
      } else {
        whereClause.status = status;
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true
          }
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.appointment.count({ where: whereClause });

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Appointments API error:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      date,
      duration,
      type,
      serviceName,
      price,
      providerId,
      patientId: requestedPatientId,
      meetingLink
    } = body;

    // Determine the actual patient ID based on user role
    let patientId: string;
    if (session.user.isProvider || session.user.isAdmin) {
      // Provider/Admin creating appointment - use provided patientId
      patientId = requestedPatientId;
    } else {
      // Patient booking appointment - use their own ID as patientId
      patientId = session.user.id;
    }

    // Validate required fields
    if (!title || !date || !providerId || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Set default service name and price based on type
    let finalServiceName = serviceName;
    let finalPrice = price;

    if (type === 'quitline_smoking_cessation') {
      finalServiceName = finalServiceName || 'Quitline Free-Smoking Session (INRT)';
      finalPrice = finalPrice || 150;
    }

    const appointment = await prisma.appointment.create({
      data: {
        title,
        description,
        date: new Date(date),
        duration: duration || 30,
        type: type || 'consultation',
        serviceName: finalServiceName,
        price: finalPrice,
        status: 'scheduled',
        meetingLink,
        providerId,
        patientId
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true
          }
        },
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json(appointment, { status: 201 });

  } catch (error) {
    console.error('Create appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const appointmentId = url.pathname.split('/').pop();
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status values
    const validStatuses = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Check if user has permission to update appointment
    // Providers can only update their own appointments
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        provider: true,
        patient: true
      }
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (session.user.isProvider && existingAppointment.providerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update the appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: newStatus,
        updatedAt: new Date()
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            specialty: true
          }
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(updatedAppointment);

  } catch (error) {
    console.error('Update appointment status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}