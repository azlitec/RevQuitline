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
    const reportType = searchParams.get('type') || 'all'; // Can be 'users', 'appointments', 'patients', 'all'
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(range, startDateParam, endDateParam);
    
    // Generate CSV data based on report type
    let csvData = '';
    
    if (reportType === 'users' || reportType === 'all') {
      const userData = await getUserData(startDate, endDate);
      csvData += 'USER DATA\n';
      csvData += 'Date,New Users\n';
      userData.forEach(row => {
        csvData += `${row.date},${row.count}\n`;
      });
      
      if (reportType === 'all') {
        csvData += '\n';
      }
    }
    
    if (reportType === 'appointments' || reportType === 'all') {
      const appointmentData = await getAppointmentData(startDate, endDate);
      
      if (reportType === 'all') {
        csvData += 'APPOINTMENT DATA\n';
      }
      
      csvData += 'Date,Appointments Scheduled,Appointments Completed\n';
      appointmentData.forEach(row => {
        csvData += `${row.date},${row.scheduled},${row.completed}\n`;
      });
      
      if (reportType === 'all') {
        csvData += '\n';
        
        csvData += 'APPOINTMENT STATUS SUMMARY\n';
        csvData += 'Status,Count\n';
        
        const appointmentStatus = await getAppointmentStatusData(startDate, endDate);
        appointmentStatus.forEach(row => {
          csvData += `${row.status},${row.count}\n`;
        });
        
        csvData += '\n';
      }
    }
    
    if (reportType === 'patients' || reportType === 'all') {
      const patientData = await getPatientData(startDate, endDate);
      
      if (reportType === 'all') {
        csvData += 'PATIENT REGISTRATION DATA\n';
      }
      
      csvData += 'Date,New Patients Registered\n';
      patientData.forEach(row => {
        csvData += `${row.date},${row.count}\n`;
      });
      
      if (reportType === 'all') {
        csvData += '\n';
      }
    }
    
    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="analytics-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`);
    
    return new Response(csvData, { headers });
  } catch (error) {
    console.error('Error generating analytics report:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics report' },
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

// Get user data by date
async function getUserData(startDate: Date, endDate: Date) {
  const usersByDateRaw = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as count
    FROM "User"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  return Array.isArray(usersByDateRaw) ? usersByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    count: Number(item.count)
  })) : [];
}

// Get appointment data by date
async function getAppointmentData(startDate: Date, endDate: Date) {
  // Get appointments scheduled by date
  const appointmentsScheduledRaw = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as scheduled
    FROM "Appointment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  const appointmentsScheduled = Array.isArray(appointmentsScheduledRaw) ?
    appointmentsScheduledRaw.map((item: any) => ({
      date: new Date(item.date).toISOString().split('T')[0],
      scheduled: Number(item.scheduled),
      completed: 0
    })) : [];
  
  // Get appointments completed by date
  const appointmentsCompletedRaw = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "updatedAt") as date,
      COUNT(*) as completed
    FROM "Appointment"
    WHERE
      "updatedAt" BETWEEN ${startDate} AND ${endDate} AND
      status = 'completed'
    GROUP BY DATE_TRUNC('day', "updatedAt")
    ORDER BY date ASC
  `;
  
  // Merge the data
  const completedMap = new Map();
  if (Array.isArray(appointmentsCompletedRaw)) {
    appointmentsCompletedRaw.forEach((item: any) => {
      completedMap.set(
        new Date(item.date).toISOString().split('T')[0],
        Number(item.completed)
      );
    });
  }
  
  // Update the completed counts in our results
  appointmentsScheduled.forEach(item => {
    if (completedMap.has(item.date)) {
      item.completed = completedMap.get(item.date);
    }
  });
  
  // Add any dates that only have completed appointments
  completedMap.forEach((completed, date) => {
    if (!appointmentsScheduled.some(item => item.date === date)) {
      appointmentsScheduled.push({
        date,
        scheduled: 0,
        completed
      });
    }
  });
  
  // Sort by date
  appointmentsScheduled.sort((a, b) => a.date.localeCompare(b.date));
  
  return appointmentsScheduled;
}

// Get appointment status statistics
async function getAppointmentStatusData(startDate: Date, endDate: Date) {
  // Get appointment counts by status
  const appointmentsByStatusRaw = await prisma.$queryRaw`
    SELECT
      status,
      COUNT(*) as count
    FROM "Appointment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY status
    ORDER BY count DESC
  `;
  
  return Array.isArray(appointmentsByStatusRaw) ? appointmentsByStatusRaw.map((item: any) => ({
    status: item.status,
    count: Number(item.count)
  })) : [];
}

// Get patient registration data by date
async function getPatientData(startDate: Date, endDate: Date) {
  const patientsByDateRaw = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as count
    FROM "User"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate} AND "role" = 'patient'
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  return Array.isArray(patientsByDateRaw) ? patientsByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    count: Number(item.count)
  })) : [];
}