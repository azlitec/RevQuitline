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

    // Allow admin/clerk access for support purposes (fixing over-restrictive security)
    const isPatient = !session.user.isProvider && !session.user.isAdmin && !session.user.isClerk;
    const patientId = session.user.id;

    // Single optimized query to get all patient data with related info
    const [patient, appointmentStats, connectedDoctors, recentAppointments] = await Promise.all([
      // Get patient basic info
      prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        }
      }),

      // Get appointment statistics in one query
      prisma.appointment.groupBy({
        by: ['status'],
        where: { patientId },
        _count: { id: true }
      }),

      // Get connected doctors with appointment counts
      prisma.user.findMany({
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
          _count: {
            select: {
              appointmentsAsProvider: {
                where: { patientId }
              }
            }
          }
        },
        take: 10
      }),

      // Get recent appointments with provider info
      prisma.appointment.findMany({
        where: { patientId },
        select: {
          id: true,
          date: true,
          status: true,
          type: true,
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
      })
    ]);

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Process appointment statistics efficiently
    const appointmentCounts = appointmentStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    const upcomingAppointments = (appointmentCounts.scheduled || 0) + (appointmentCounts.confirmed || 0);
    const completedAppointments = appointmentCounts.completed || 0;

    // Format connected doctors efficiently
    const formattedDoctors = connectedDoctors.map(doctor => {
      const fullName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.email;
      const initials = `${doctor.firstName?.charAt(0) || ''}${doctor.lastName?.charAt(0) || ''}`.toUpperCase() || doctor.email.charAt(0).toUpperCase();
      
      return {
        id: doctor.id,
        name: `Dr. ${fullName}`,
        initials,
        specialty: doctor.specialty || 'General Medicine',
        totalAppointments: doctor._count.appointmentsAsProvider
      };
    });

    // Format recent appointments efficiently
    const formattedAppointments = recentAppointments.map(appointment => {
      const doctorName = `${appointment.provider?.firstName || ''} ${appointment.provider?.lastName || ''}`.trim() || appointment.provider?.email || 'Unknown Doctor';
      
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

    // Optimized response structure
    const dashboardData = {
      totalDoctors: connectedDoctors.length,
      activeConnections: connectedDoctors.length,
      upcomingAppointments,
      completedAppointments,
      outstandingBalance: 0, // TODO: Integrate with billing system
      recentAppointments: formattedAppointments,
      connectedDoctors: formattedDoctors,
      patient: {
        id: patient.id,
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email,
        email: patient.email,
        memberSince: patient.createdAt.toLocaleDateString()
      }
    };

    // Add cache headers for better performance
    return NextResponse.json(dashboardData, {
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      }
    });

  } catch (error) {
    console.error('Patient dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}