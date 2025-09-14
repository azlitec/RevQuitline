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

    // Check if user is a patient (not provider or admin)
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
      where: {
        patientId: patientId
      },
      _count: {
        id: true
      }
    });

    // Calculate stats
    const upcomingAppointments = appointmentsCount
      .filter(a => ['scheduled', 'confirmed'].includes(a.status))
      .reduce((sum, a) => sum + a._count.id, 0);

    const completedAppointments = appointmentsCount
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + a._count.id, 0);

    // Get connected doctors (providers who have appointments with this patient)
    const connectedDoctors = await prisma.user.findMany({
      where: {
        isProvider: true,
        appointmentsAsProvider: {
          some: {
            patientId: patientId
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        specialty: true,
        _count: {
          select: {
            appointmentsAsProvider: {
              where: {
                patientId: patientId
              }
            }
          }
        }
      },
      take: 10
    });

    // Format connected doctors
    const formattedDoctors = connectedDoctors.map(doctor => {
      const firstName = doctor.firstName || '';
      const lastName = doctor.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || doctor.email;
      const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || doctor.email.charAt(0).toUpperCase();
      
      return {
        id: doctor.id,
        name: `Dr. ${fullName}`,
        initials,
        specialty: doctor.specialty || 'General Medicine',
        totalAppointments: doctor._count.appointmentsAsProvider
      };
    });

    // Get recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        patientId: patientId
      },
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
      orderBy: {
        date: 'desc'
      },
      take: 5
    });

    // Format recent appointments
    const formattedAppointments = recentAppointments.map(appointment => {
      const firstName = appointment.provider?.firstName || '';
      const lastName = appointment.provider?.lastName || '';
      const doctorName = `${firstName} ${lastName}`.trim() || appointment.provider?.email || 'Unknown Doctor';
      
      return {
        id: appointment.id,
        doctorName: `Dr. ${doctorName}`,
        date: appointment.date.toLocaleDateString(),
        time: appointment.date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        status: appointment.status,
        type: appointment.type || 'consultation'
      };
    });

    // Mock outstanding balance for now (you can integrate with a billing system later)
    const outstandingBalance = 0;

    const dashboardData = {
      totalDoctors: connectedDoctors.length,
      activeConnections: connectedDoctors.length,
      upcomingAppointments,
      completedAppointments,
      outstandingBalance,
      recentAppointments: formattedAppointments,
      connectedDoctors: formattedDoctors,
      patient: {
        id: patient.id,
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email,
        email: patient.email,
        memberSince: patient.createdAt.toLocaleDateString()
      }
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Patient dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}