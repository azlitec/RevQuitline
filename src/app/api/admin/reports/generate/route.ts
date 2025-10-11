import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import jsPDF from 'jspdf';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Helper function to get date range
function getDateRange(period: string, date: Date = new Date()) {
  const now = new Date(date);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (period) {
    case 'daily':
      return { startDate: startOfDay, endDate: endOfDay };
    case 'weekly':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { startDate: startOfWeek, endDate: endOfWeek };
    case 'monthly':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: startOfMonth, endDate: endOfMonth };
    case 'yearly':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { startDate: startOfYear, endDate: endOfYear };
    default:
      return { startDate: startOfDay, endDate: endOfDay };
  }
}

// Helper function to generate PDF
async function generateReportPDF(type: string, period: string, data: any, title: string): Promise<Buffer> {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(title, 20, 30);
  
  // Add generation date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 45);
  
  // Add report type and period
  doc.text(`Type: ${type.charAt(0).toUpperCase() + type.slice(1)}`, 20, 55);
  doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 20, 65);
  
  let yPosition = 85;
  
  switch (type) {
    case 'appointments':
      doc.setFontSize(16);
      doc.text('Appointments Summary', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.text(`Total Appointments: ${data.totalAppointments || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Completed: ${data.completedAppointments || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Cancelled: ${data.cancelledAppointments || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`No-show: ${data.noShowAppointments || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Completion Rate: ${data.completionRate || 0}%`, 20, yPosition);
      break;
      
    case 'users':
      doc.setFontSize(16);
      doc.text('Users Summary', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.text(`Total Users: ${data.totalUsers || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Patients: ${data.totalPatients || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Providers: ${data.totalProviders || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`New This Period: ${data.newUsers || 0}`, 20, yPosition);
      break;
      
    case 'revenue':
      doc.setFontSize(16);
      doc.text('Revenue Summary', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.text(`Total Revenue: RM ${data.totalRevenue || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Paid Invoices: ${data.paidInvoices || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Pending Invoices: ${data.pendingInvoices || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Overdue Invoices: ${data.overdueInvoices || 0}`, 20, yPosition);
      break;
      
    case 'engagement':
      doc.setFontSize(16);
      doc.text('Engagement Summary', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.text(`Active Users: ${data.activeUsers || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Messages Sent: ${data.messagesSent || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Appointments Booked: ${data.appointmentsBooked || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Avg. Engagement Score: ${data.avgEngagementScore || 0}`, 20, yPosition);
      break;
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { type, period } = await request.json();

    if (!type || !period) {
      return NextResponse.json({ message: 'Type and period are required' }, { status: 400 });
    }

    // Validate inputs
    const validTypes = ['appointments', 'users', 'revenue', 'engagement'];
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ message: 'Invalid report type' }, { status: 400 });
    }

    if (!validPeriods.includes(period)) {
      return NextResponse.json({ message: 'Invalid report period' }, { status: 400 });
    }

    console.log('[Generate Report] Type:', type, 'Period:', period);

    // Get date range
    const { startDate, endDate } = getDateRange(period);
    console.log('[Generate Report] Date range:', { startDate, endDate });

    // Generate report data based on type
    let reportData: any = {};
    const reportTitle = `${type.charAt(0).toUpperCase() + type.slice(1)} ${period.charAt(0).toUpperCase() + period.slice(1)} Report - ${new Date().toLocaleDateString()}`;

    switch (type) {
      case 'appointments':
        const appointments = await prisma.appointment.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            provider: {
              select: { firstName: true, lastName: true },
            },
            patient: {
              select: { firstName: true, lastName: true },
            },
          },
        });

        const completedAppointments = appointments.filter(a => a.status === 'completed').length;
        const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
        const noShowAppointments = appointments.filter(a => a.status === 'no-show').length;
        const completionRate = appointments.length > 0 ? Math.round((completedAppointments / appointments.length) * 100) : 0;

        reportData = {
          totalAppointments: appointments.length,
          completedAppointments,
          cancelledAppointments,
          noShowAppointments,
          completionRate,
        };
        break;

      case 'users':
        const totalUsers = await prisma.user.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const totalPatients = await prisma.user.count({
          where: {
            isProvider: false,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const totalProviders = await prisma.user.count({
          where: {
            isProvider: true,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        reportData = {
          totalUsers,
          totalPatients,
          totalProviders,
          newUsers: totalUsers,
        };
        break;

      case 'revenue':
        const invoices = await prisma.invoice.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const totalRevenue = invoices.reduce((sum, invoice) => {
          return invoice.status === 'paid' ? sum + invoice.amount : sum;
        }, 0);

        const paidInvoices = invoices.filter(i => i.status === 'paid').length;
        const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
        const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

        reportData = {
          totalRevenue,
          paidInvoices,
          pendingInvoices,
          overdueInvoices,
        };
        break;

      case 'engagement':
        const messages = await prisma.message.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const appointmentsBooked = await prisma.appointment.count({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Simple engagement calculation (can be enhanced)
        const activeUsers = await prisma.user.count({
          where: {
            OR: [
              {
                appointmentsAsPatient: {
                  some: {
                    date: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
              },
              {
                appointmentsAsProvider: {
                  some: {
                    date: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
              },
            ],
          },
        });

        reportData = {
          activeUsers,
          messagesSent: messages,
          appointmentsBooked,
          avgEngagementScore: activeUsers > 0 ? Math.round(((messages + appointmentsBooked) / activeUsers) * 10) / 10 : 0,
        };
        break;
    }

    console.log('[Generate Report] Generated data:', reportData);

    // Generate PDF
    const pdfBuffer = await generateReportPDF(type, period, reportData, reportTitle);
    
    // Create unique filename
    const reportId = `report-${Date.now()}`;
    const fileName = `${type}-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
    const fileUrl = `/reports/${fileName}`;

    // Save report to database
    const report = await prisma.report.create({
      data: {
        title: reportTitle,
        type,
        period,
        fileUrl,
        status: 'completed',
        data: reportData,
      },
    });

    console.log('[Generate Report] Generated:', { reportId, fileName });

    return NextResponse.json({
      message: 'Report generated successfully',
      report: {
        id: report.id,
        title: report.title,
        type: report.type,
        period: report.period,
        generatedAt: report.generatedAt,
        fileUrl: report.fileUrl,
        status: report.status,
      },
    });
  } catch (error) {
    console.error('[Generate Report] Error:', error);
    return NextResponse.json(
      {
        message: 'An error occurred while generating report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
