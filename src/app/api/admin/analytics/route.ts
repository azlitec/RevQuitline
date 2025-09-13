import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || 'last30days';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(range, startDateParam, endDateParam);
    
    // Get user metrics
    const userMetrics = await getUserMetrics(startDate, endDate);
    
    // Get appointment metrics
    const appointmentMetrics = await getAppointmentMetrics(startDate, endDate);
    
    // Get healthcare metrics
    const healthcareMetrics = await getHealthcareMetrics(startDate, endDate);

    return NextResponse.json({
      userMetrics,
      appointmentMetrics,
      healthcareMetrics,
      dateRange: {
        start: startDate,
        end: endDate,
        rangeType: range
      }
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate date range based on selection
function calculateDateRange(
  range: string,
  startDateParam: string | null,
  endDateParam: string | null
) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  
  // Set end time to end of day
  endDate.setHours(23, 59, 59, 999);
  
  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case 'yesterday':
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      break;
      
    case 'last7days':
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case 'last30days':
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
      
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
      
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
      
    case 'custom':
      if (startDateParam) {
        startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
      }
      
      if (endDateParam) {
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
      }
      
      break;
  }
  
  return { startDate, endDate };
}

// Function to get user metrics
async function getUserMetrics(startDate: Date, endDate: Date) {
  // Get total users
  const totalUsers = await prisma.user.count();
  
  // Get new users today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newUsersToday = await prisma.user.count({
    where: {
      createdAt: {
        gte: today
      }
    }
  });
  
  // Get new users this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const newUsersThisWeek = await prisma.user.count({
    where: {
      createdAt: {
        gte: startOfWeek
      }
    }
  });
  
  // Get new users this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newUsersThisMonth = await prisma.user.count({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    }
  });
  
  // Get users by date for the selected range
  const usersByDateRaw = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as count
    FROM "User"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  const usersByDate = Array.isArray(usersByDateRaw) ? usersByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    count: Number(item.count)
  })) : [];
  
  // Get users by role (for Quitline)
  const patientUsers = await prisma.user.count({
    where: {
      isProvider: false,
      isAdmin: false,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const providerUsers = await prisma.user.count({
    where: {
      isProvider: true,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const adminUsers = await prisma.user.count({
    where: {
      isAdmin: true,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const usersByRole = [
    { role: 'Patient', count: patientUsers },
    { role: 'Provider', count: providerUsers },
    { role: 'Admin', count: adminUsers }
  ];
  
  return {
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    usersByDate,
    usersByRole
  };
}

// Function to get appointment metrics
async function getAppointmentMetrics(startDate: Date, endDate: Date) {
  // Get total appointments
  const totalAppointments = await prisma.appointment.count();
  
  // Get appointments created today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointmentsToday = await prisma.appointment.count({
    where: {
      createdAt: {
        gte: today
      }
    }
  });
  
  // Get appointments created this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const appointmentsThisWeek = await prisma.appointment.count({
    where: {
      createdAt: {
        gte: startOfWeek
      }
    }
  });
  
  // Get appointments created this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const appointmentsThisMonth = await prisma.appointment.count({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    }
  });
  
  // Get appointments by status
  const scheduledAppointments = await prisma.appointment.count({
    where: {
      status: 'scheduled',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const completedAppointments = await prisma.appointment.count({
    where: {
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const cancelledAppointments = await prisma.appointment.count({
    where: {
      status: 'cancelled',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const noShowAppointments = await prisma.appointment.count({
    where: {
      status: 'no_show',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const appointmentsByStatus = [
    { status: 'Scheduled', count: scheduledAppointments },
    { status: 'Completed', count: completedAppointments },
    { status: 'Cancelled', count: cancelledAppointments },
    { status: 'No Show', count: noShowAppointments }
  ];
  
  // Get appointments by date for the selected range
  const appointmentsByDateRaw = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as count
    FROM "Appointment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  const appointmentsByDate = Array.isArray(appointmentsByDateRaw) ? appointmentsByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    count: Number(item.count)
  })) : [];
  
  return {
    totalAppointments,
    appointmentsToday,
    appointmentsThisWeek,
    appointmentsThisMonth,
    appointmentsByStatus,
    appointmentsByDate
  };
}

// Function to get healthcare metrics
async function getHealthcareMetrics(startDate: Date, endDate: Date) {
  // Get conversion metrics for patient signups
  const totalVisitors = await prisma.user.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const patientsWithAppointments = await prisma.appointment.groupBy({
    by: ['patientId'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const activePatients = patientsWithAppointments.length;
  
  // Calculate conversion rate (visitors to active patients)
  const conversionRate = totalVisitors > 0 ? activePatients / totalVisitors : 0;
  
  // Get provider activity metrics
  const providersWithAppointments = await prisma.appointment.groupBy({
    by: ['providerId'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const activeProviders = providersWithAppointments.length;
  
  // Calculate average appointments per provider
  const totalAppointmentsInRange = await prisma.appointment.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const avgAppointmentsPerProvider = activeProviders > 0
    ? totalAppointmentsInRange / activeProviders
    : 0;
  
  // Create healthcare funnel data
  const healthcareFunnel = [
    { stage: 'Visitors', count: totalVisitors, rate: 1 },
    { stage: 'Registered Patients', count: totalVisitors, rate: 1 }, // Same as visitors for now
    { stage: 'Active Patients', count: activePatients, rate: totalVisitors > 0 ? activePatients / totalVisitors : 0 },
    { stage: 'Appointments Scheduled', count: totalAppointmentsInRange, rate: totalVisitors > 0 ? totalAppointmentsInRange / totalVisitors : 0 }
  ];
  
  return {
    conversionRate,
    activePatients,
    activeProviders,
    avgAppointmentsPerProvider,
    healthcareFunnel
  };
}