import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export default async function PatientHealthRecordsPage() {
  try {
    // Auth check on the server
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      redirect('/login?callbackUrl=/patient/health-records');
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

    // Fetch health records for the patient
    const healthRecords = await prisma.healthRecord.findMany({
      where: {
        patientId: session.user.id as string
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Fetch latest vital sign entry
    const latestVitalSign = await prisma.vitalSign.findFirst({
      where: {
        patientId: session.user.id as string
      },
      orderBy: {
        recordedAt: 'desc'
      }
    });

    // Fetch latest smoking metric entry
    const latestSmokingMetric = await prisma.smokingMetric.findFirst({
      where: {
        patientId: session.user.id as string
      },
      orderBy: {
        recordedAt: 'desc'
      }
    });

    // Format vital stats from latest entry or use defaults
    const vitalStats = latestVitalSign ? {
      bloodPressure: latestVitalSign.bloodPressure || 'N/A',
      heartRate: latestVitalSign.heartRate ? `${latestVitalSign.heartRate} bpm` : 'N/A',
      oxygenSaturation: latestVitalSign.oxygenSaturation ? `${latestVitalSign.oxygenSaturation}%` : 'N/A',
      respiratoryRate: latestVitalSign.respiratoryRate ? `${latestVitalSign.respiratoryRate} breaths/min` : 'N/A',
      temperature: latestVitalSign.temperature ? `${latestVitalSign.temperature}°F` : 'N/A'
    } : {
      bloodPressure: 'N/A',
      heartRate: 'N/A',
      oxygenSaturation: 'N/A',
      respiratoryRate: 'N/A',
      temperature: 'N/A'
    };

    // Format smoking metrics from latest entry or use defaults
    const smokingMetrics = latestSmokingMetric ? {
      cigarettesPerDay: latestSmokingMetric.cigarettesPerDay || 0,
      peakFlow: latestSmokingMetric.peakFlow ? `${latestSmokingMetric.peakFlow} L/min` : 'N/A',
      carbonMonoxide: latestSmokingMetric.carbonMonoxideLevel ? `${latestSmokingMetric.carbonMonoxideLevel} ppm` : 'N/A',
      quitDuration: latestSmokingMetric.quitDurationDays ? `${latestSmokingMetric.quitDurationDays} days` : '0 days'
    } : {
      cigarettesPerDay: 0,
      peakFlow: 'N/A',
      carbonMonoxide: 'N/A',
      quitDuration: '0 days'
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Health Records</h1>
            <p className="text-gray-600 flex items-center">
              Your complete medical history and health data
              <span className="ml-2 text-sm text-gray-400">•</span>
              <span className="ml-2 text-sm text-blue-600 font-medium">{healthRecords.length} records</span>
            </p>
          </div>
          <button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
            Download Records
          </button>
        </div>

        {/* Enhanced Vital Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Blood Pressure</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{vitalStats.bloodPressure}</p>
                <p className="text-xs text-gray-500 mt-1">Latest reading</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-blue-100 to-blue-200 shadow-sm">
                <span className="text-blue-600 text-2xl">❤️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-red-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Heart Rate</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{vitalStats.heartRate}</p>
                <p className="text-xs text-gray-500 mt-1">BPM</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-red-100 to-red-200 shadow-sm">
                <span className="text-red-600 text-2xl">💓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-green-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Oxygen Saturation</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{vitalStats.oxygenSaturation}</p>
                <p className="text-xs text-gray-500 mt-1">SpO2 level</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-100 to-green-200 shadow-sm">
                <span className="text-green-600 text-2xl">🌬️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-purple-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Respiratory Rate</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">{vitalStats.respiratoryRate}</p>
                <p className="text-xs text-gray-500 mt-1">Breaths per minute</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-100 to-purple-200 shadow-sm">
                <span className="text-purple-600 text-2xl">🌡️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Temperature</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">{vitalStats.temperature}</p>
                <p className="text-xs text-gray-500 mt-1">Body temperature</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-orange-100 to-orange-200 shadow-sm">
                <span className="text-orange-600 text-2xl">🌡️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Smoking Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-red-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Cigarettes/Day</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{smokingMetrics.cigarettesPerDay}</p>
                <p className="text-xs text-gray-500 mt-1">{smokingMetrics.cigarettesPerDay > 0 ? 'Current usage' : 'No smoking reported'}</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-red-100 to-red-200 shadow-sm">
                <span className="text-red-600 text-2xl">🚬</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Peak Flow</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{smokingMetrics.peakFlow}</p>
                <p className="text-xs text-gray-500 mt-1">Lung function</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-blue-100 to-blue-200 shadow-sm">
                <span className="text-blue-600 text-2xl">💨</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-green-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">CO Level</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{smokingMetrics.carbonMonoxide}</p>
                <p className="text-xs text-gray-500 mt-1">Carbon monoxide</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-100 to-green-200 shadow-sm">
                <span className="text-green-600 text-2xl">☁️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft hover:shadow-strong border border-gray-100 hover:border-purple-200 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Quit Duration</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">{smokingMetrics.quitDuration}</p>
                <p className="text-xs text-gray-500 mt-1">Smoke-free</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-100 to-purple-200 shadow-sm">
                <span className="text-purple-600 text-2xl">🎯</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Medical Records List */}
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-strong border border-gray-100 hover:shadow-xl transition-all duration-300">
          <h2 className="text-xl md:text-2xl font-bold gradient-text mb-6">Medical Records</h2>
          {healthRecords.length > 0 ? (
            <div className="space-y-4">
              {healthRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-6 rounded-xl border border-gray-200 hover:border-blue-300 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 shadow-medium hover:shadow-strong hover:scale-102"
                >
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-blue-600 text-2xl">📋</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-lg">{record.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{record.description || 'No description available'}</p>
                      <div className="flex items-center space-x-4 mt-3">
                        <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                          {new Intl.DateTimeFormat('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }).format(record.date)}
                        </span>
                        <span className="text-sm text-gray-600">• {record.type}</span>
                        <span className="text-sm text-gray-600">• {record.provider ? `${record.provider.firstName} ${record.provider.lastName}` : 'Unknown Provider'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 font-medium">
                      View Details
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:border-green-400 transition-all duration-300 font-medium">
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
                <span className="text-4xl">📋</span>
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">No health records yet</h3>
              <p className="text-gray-500 text-lg mb-6">Your medical records will appear here after your first appointment</p>
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
                Schedule Your First Appointment
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Quick Actions */}
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-strong border border-gray-100 hover:shadow-xl transition-all duration-300">
          <h2 className="text-xl md:text-2xl font-bold gradient-text mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button className="flex items-center p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-strong bg-gradient-to-r from-white to-blue-50 hover:from-blue-50 hover:to-blue-100 transition-all duration-300 hover:scale-105 group">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-r from-blue-100 to-blue-200 text-blue-600 mr-4 shadow-sm group-hover:shadow-medium transition-all duration-300">
                📝
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">Add Health Note</h4>
                <p className="text-sm text-gray-600 mt-1">Record personal observations</p>
              </div>
            </button>

            <button className="flex items-center p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-strong bg-gradient-to-r from-white to-green-50 hover:from-green-50 hover:to-green-100 transition-all duration-300 hover:scale-105 group">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-r from-green-100 to-green-200 text-green-600 mr-4 shadow-sm group-hover:shadow-medium transition-all duration-300">
                📊
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">Track Symptoms</h4>
                <p className="text-sm text-gray-600 mt-1">Monitor health changes</p>
              </div>
            </button>

            <button className="flex items-center p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-strong bg-gradient-to-r from-white to-purple-50 hover:from-purple-50 hover:to-purple-100 transition-all duration-300 hover:scale-105 group">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-r from-purple-100 to-purple-200 text-purple-600 mr-4 shadow-sm group-hover:shadow-medium transition-all duration-300">
                🩺
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">Request Records</h4>
                <p className="text-sm text-gray-600 mt-1">Get complete medical history</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
    
  } catch (error) {
    console.error("Patient health records error:", error);
    
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto mt-8">
        <h2 className="text-xl font-bold mb-4">Error Loading Health Records</h2>
        <p>We encountered a problem loading your health record data.</p>
        <p className="mt-2">Please try again later or contact support.</p>
      </div>
    );
  }
}