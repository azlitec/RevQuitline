import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
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
    
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Create appointment - using only fields that exist in schema
    const appointmentData: any = {
      patientId,
      providerId: session.user.id,
      date: new Date(date),
      duration: duration || 30,
      type: type || 'consultation',
      status: 'scheduled'
    };

    // Add optional fields if provided
    if (reason) {
      appointmentData.reason = reason;
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

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}