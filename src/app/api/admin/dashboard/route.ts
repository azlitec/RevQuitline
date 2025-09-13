import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Get user count
    const userCount = await prisma.user.count();
    
    // Get appointment count
    const appointmentCount = await prisma.appointment.count();
    
    // Get upcoming appointments count
    const upcomingAppointments = await prisma.appointment.count({
      where: {
        status: 'scheduled',
        date: {
          gte: new Date()
        }
      }
    });
    
    // Get completed appointments count
    const completedAppointments = await prisma.appointment.count({
      where: {
        status: 'completed'
      }
    });
    
    // Get recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
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
    
    // Format recent appointments
    const formattedAppointments = recentAppointments.map((appointment) => ({
      id: appointment.id,
      title: appointment.title,
      type: appointment.type,
      status: appointment.status,
      date: appointment.date,
      duration: appointment.duration,
      providerName: appointment.provider ? `${appointment.provider.firstName} ${appointment.provider.lastName}` : 'Unknown Provider',
      patientName: appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Unknown Patient',
      createdAt: appointment.createdAt
    }));
    
    // Get recent users
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isProvider: true,
        createdAt: true
      }
    });
    
    // Format recent users
    const formattedUsers = recentUsers.map((user) => ({
      id: user.id,
      name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'Unknown User',
      email: user.email,
      role: user.role,
      isProvider: user.isProvider,
      createdAt: user.createdAt
    }));
    
    return NextResponse.json({
      userCount,
      appointmentCount,
      upcomingAppointments,
      completedAppointments,
      recentAppointments: formattedAppointments,
      recentUsers: formattedUsers
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching dashboard data' },
      { status: 500 }
    );
  }
}