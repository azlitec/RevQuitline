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

    const providerId = session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's appointments
    const todaysAppointments = await prisma.appointment.findMany({
      where: {
        providerId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Get total patients assigned to provider through appointments
    const patientsWithAppointments = await prisma.appointment.findMany({
      where: {
        providerId
      },
      select: {
        patientId: true
      },
      distinct: ['patientId']
    });
    
    const totalPatients = patientsWithAppointments.length;

    // Get monthly stats
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyAppointments = await prisma.appointment.findMany({
      where: {
        providerId,
        date: {
          gte: firstDayOfMonth
        }
      }
    });

    // Calculate statistics
    const todayStats = {
      totalAppointments: todaysAppointments.length,
      completedAppointments: todaysAppointments.filter(apt => apt.status === 'completed').length,
      inProgressAppointments: todaysAppointments.filter(apt => apt.status === 'in-progress').length,
      scheduledAppointments: todaysAppointments.filter(apt => apt.status === 'scheduled' || apt.status === 'confirmed').length
    };

    const monthlyStats = {
      totalAppointments: monthlyAppointments.length,
      completedAppointments: monthlyAppointments.filter(apt => apt.status === 'completed').length,
      revenue: monthlyAppointments.filter(apt => apt.status === 'completed').length * 100 // Simplified calculation
    };

    // Get recent activities (last 10 appointments)
    const recentActivities = await prisma.appointment.findMany({
      where: {
        providerId,
        status: { in: ['completed', 'in-progress', 'scheduled'] }
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    });

    // Weekly performance data (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayAppointments = await prisma.appointment.count({
        where: {
          providerId,
          date: {
            gte: day,
            lt: nextDay
          }
        }
      });

      weeklyData.push({
        date: day.toISOString().split('T')[0],
        appointments: dayAppointments
      });
    }

    return NextResponse.json({
      todayStats,
      monthlyStats,
      totalPatients,
      recentActivities,
      weeklyData
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}