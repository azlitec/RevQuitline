import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a patient (not provider or admin)
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { doctorId, treatmentType, message } = await request.json();

    if (!doctorId || !treatmentType) {
      return NextResponse.json(
        { error: 'Doctor ID and treatment type are required' }, 
        { status: 400 }
      );
    }

    const patientId = session.user.id;

    // Check if doctor exists and is a provider
    const doctor = await prisma.user.findFirst({
      where: {
        id: doctorId,
        isProvider: true
      }
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Check if connection already exists
    const existingConnection = await prisma.doctorPatientConnection.findFirst({
      where: {
        providerId: doctorId,
        patientId: patientId,
        treatmentType: treatmentType
      }
    });

    if (existingConnection) {
      return NextResponse.json({ 
        error: 'Connection request already exists for this treatment type' 
      }, { status: 409 });
    }

    // Create new connection request
    const connection = await prisma.doctorPatientConnection.create({
      data: {
        providerId: doctorId,
        patientId: patientId,
        treatmentType: treatmentType,
        requestMessage: message || `Connection request for ${treatmentType}`,
        status: 'pending'
      }
    });

    // Create notification for the doctor
    await prisma.notification.create({
      data: {
        userId: doctorId,
        type: 'info',
        title: 'New Patient Connection Request',
        message: `You have a new connection request for ${treatmentType} treatment.`,
        priority: 'medium'
      }
    });

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        status: connection.status,
        treatmentType: connection.treatmentType,
        createdAt: connection.createdAt
      }
    });

  } catch (error) {
    console.error('Doctor connection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}