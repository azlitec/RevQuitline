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

    // Check if user is a provider
    if (!session.user.isProvider) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all patients with appointments with this provider
    const appointments = await prisma.appointment.findMany({
      where: {
        providerId: session.user.id,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            smokingStatus: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Get unique patients
    const patientsMap = new Map();
    appointments.forEach(appointment => {
      const patient = appointment.patient;
      if (patient && !patientsMap.has(patient.id)) {
        patientsMap.set(patient.id, {
          id: patient.id,
          firstName: patient.firstName || '',
          lastName: patient.lastName || '',
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth?.toISOString(),
          smokingStatus: patient.smokingStatus,
          createdAt: patient.createdAt.toISOString(),
          status: 'active' // Simple status
        });
      }
    });

    const patients = Array.from(patientsMap.values());

    return NextResponse.json({
      patients,
      total: patients.length
    });

  } catch (error) {
    console.error('Provider patients API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}