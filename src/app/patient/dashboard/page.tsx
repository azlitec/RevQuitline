import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export default async function PatientDashboardPage() {
  try {
    // Auth check on the server
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      redirect('/login?callbackUrl=/patient/dashboard');
    }

    // Check if user is a patient (not provider or admin)
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      // Redirect to appropriate dashboard based on user role
      if (session.user.isAdmin) {
        redirect('/admin/dashboard');
      } else if (session.user.isClerk) {
        redirect('/clerk/dashboard');
      } else if (session.user.isProvider) {
        redirect('/provider/dashboard');
      }
    }

    // Fetch patient data
    const patientData = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });

    if (!patientData) {
      redirect('/login');
    }

    // Mock data for patient dashboard
    const mockAppointments = [
      {
        id: '1',
        providerName: 'Dr. Smith',
        date: new Date(),
        status: 'Scheduled',
        type: 'Initial Consultation'
      },
      {
        id: '2',
        providerName: 'Dr. Johnson',
        date: new Date(Date.now() - 86400000),
        status: 'Completed',
        type: 'Follow-up'
      }
    ];

    const healthStats = {
      daysSmokeFree: 7,
      cravingsToday: 3,
      moneySaved: 42.50,
      healthImprovement: '15%'
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Patient Dashboard</h1>
            <p className="text-blue-700">Welcome back, {patientData.email || 'Patient'}</p>
          </div>
          <div className="text-sm text-blue-600">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Health Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg border border-blue-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Days Smoke-Free</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">{healthStats.daysSmokeFree}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-md">
                <span className="text-white text-2xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg border border-blue-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Cravings Today</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">{healthStats.cravingsToday}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-md">
                <span className="text-white text-2xl">💪</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg border border-blue-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Money Saved</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">${healthStats.moneySaved}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-md">
                <span className="text-white text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg border border-blue-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Health Improvement</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">{healthStats.healthImprovement}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-md">
                <span className="text-white text-2xl">❤️</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-200/50">
            <h3 className="text-lg font-semibold text-blue-900 mb-6">Upcoming Appointments</h3>
            <div className="space-y-4">
              {mockAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-200/50 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-sm font-medium">📅</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">{appointment.providerName}</h4>
                      <p className="text-sm text-blue-700">
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(new Date(appointment.date))} • {appointment.type}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                    appointment.status === 'Scheduled' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    appointment.status === 'Completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                    'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-200/50">
            <h3 className="text-lg font-semibold text-blue-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4">
              <button className="flex items-center p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-200/50 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl text-white shadow-md mr-4">
                  📅
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Schedule Appointment</h4>
                  <p className="text-sm text-blue-700">Book a new consultation</p>
                </div>
              </button>

              <button className="flex items-center p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-200/50 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl text-white shadow-md mr-4">
                  📝
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Health Journal</h4>
                  <p className="text-sm text-blue-700">Record your progress</p>
                </div>
              </button>

              <button className="flex items-center p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-200/50 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl text-white shadow-md mr-4">
                  💊
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Medication Tracking</h4>
                  <p className="text-sm text-blue-700">Manage your prescriptions</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
    
  } catch (error) {
    console.error("Patient dashboard error:", error);
    
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto mt-8">
        <h2 className="text-xl font-bold mb-4">Error Loading Patient Dashboard</h2>
        <p>We encountered a problem loading your dashboard data.</p>
        <p className="mt-2">Please try again later or contact support.</p>
      </div>
    );
  }
}