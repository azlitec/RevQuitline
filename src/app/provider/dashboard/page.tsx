import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import StatsCards from '@/components/provider/Dashboard/StatsCards';
import PatientAnalytics from '@/components/provider/Dashboard/PatientAnalytics';
import QuickActions from '@/components/provider/Dashboard/QuickActions';
import RecentActivities from '@/components/provider/Dashboard/RecentActivities';

export default async function ProviderDashboardPage() {
  try {
    // Auth check on the server
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      redirect('/login?callbackUrl=/provider/dashboard');
    }

    // Check if user is a provider
    if (!session.user.isClerk && !session.user.isAdmin) {
      redirect('/dashboard');
    }

    // Fetch basic provider data (without relations since schema is simplified)
    const providerData = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });

    if (!providerData) {
      redirect('/login');
    }

    // Fetch real statistics for the provider dashboard
    const [
      uniquePatients,
      todaysAppointments,
      pendingConsultations,
      completedSessions,
      appointments
    ] = await Promise.all([
      // Total unique patients for this provider - use groupBy instead of count with distinct
      prisma.appointment.groupBy({
        by: ['patientId'],
        where: {
          providerId: session.user.id as string,
        },
        _count: {
          patientId: true,
        },
      }).then(results => results.length),
      
      // Today's appointments
      prisma.appointment.count({
        where: {
          providerId: session.user.id as string,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          status: {
            in: ['scheduled', 'confirmed', 'in-progress'],
          },
        },
      }),
      
      // Pending consultations (scheduled appointments)
      prisma.appointment.count({
        where: {
          providerId: session.user.id as string,
          status: 'scheduled',
          date: {
            gte: new Date(),
          },
        },
      }),
      
      // Completed sessions
      prisma.appointment.count({
        where: {
          providerId: session.user.id as string,
          status: 'completed',
        },
      }),
      
      // Recent appointments for RecentActivities component
      prisma.appointment.findMany({
        where: {
          providerId: session.user.id as string,
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        take: 10, // Limit to recent appointments for dashboard
      }),
    ]);

    // Format appointments for the dashboard
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment.id,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      date: appointment.date,
      status: appointment.status,
      type: appointment.type || 'Consultation'
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Provider Dashboard</h1>
            <p className="text-gray-600">Welcome back, Dr. {providerData.email || 'Provider'}</p>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards
          totalPatients={uniquePatients}
          todaysAppointments={todaysAppointments}
          pendingConsultations={pendingConsultations}
          completedSessions={completedSessions}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Analytics */}
          <PatientAnalytics />

          {/* Quick Actions */}
          <QuickActions />
        </div>

        {/* Recent Activities */}
        <RecentActivities appointments={formattedAppointments} />
      </div>
    );
    
  } catch (error) {
    console.error("Provider dashboard error:", error);
    
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto mt-8">
        <h2 className="text-xl font-bold mb-4">Error Loading Provider Dashboard</h2>
        <p>We encountered a problem loading your dashboard data.</p>
        <p className="mt-2">Please try again later or contact support.</p>
      </div>
    );
  }
}