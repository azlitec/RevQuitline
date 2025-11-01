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

    const patientId = session.user.id;

    // Get patient data
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      }
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get appointments count
    const appointmentsCount = await prisma.appointment.groupBy({
      by: ['status'],
      where: { patientId },
      _count: { id: true }
    });

    // Calculate stats
    const upcomingAppointments = appointmentsCount
      .filter(a => ['scheduled', 'confirmed'].includes(a.status))
      .reduce((sum, a) => sum + a._count.id, 0);

    const completedAppointments = appointmentsCount
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + a._count.id, 0);

    // Get connected doctors
    const connectedDoctors = await prisma.user.findMany({
      where: {
        isProvider: true,
        appointmentsAsProvider: {
          some: { patientId }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        specialty: true,
      },
      take: 10
    });

    // Get recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      where: { patientId },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    });

    // Format data
    const formattedDoctors = connectedDoctors.map(doctor => ({
      id: doctor.id,
      name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      specialty: doctor.specialty || 'General Medicine',
    }));

    const formattedAppointments = recentAppointments.map(appointment => ({
      id: appointment.id,
      doctorName: `Dr. ${appointment.provider?.firstName} ${appointment.provider?.lastName}`,
      date: appointment.date.toLocaleDateString(),
      time: appointment.date.toLocaleTimeString(),
      status: appointment.status,
      type: appointment.type || 'consultation'
    }));

    const dashboardData = {
      totalDoctors: connectedDoctors.length,
      upcomingAppointments,
      completedAppointments,
      recentAppointments: formattedAppointments,
      connectedDoctors: formattedDoctors,
      patient: {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        memberSince: patient.createdAt.toLocaleDateString()
      }
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Patient dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}