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
      redirect('/dashboard');
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
            <h1 className="text-2xl font-bold text-gray-800">Health Records</h1>
            <p className="text-gray-600">Your complete medical history and health data</p>
          </div>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
            Download Records
          </button>
        </div>

        {/* Vital Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blood Pressure</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{vitalStats.bloodPressure}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <span className="text-blue-600 text-2xl">❤️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Heart Rate</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{vitalStats.heartRate}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <span className="text-red-600 text-2xl">💓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Oxygen Saturation</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{vitalStats.oxygenSaturation}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <span className="text-green-600 text-2xl">🌬️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Respiratory Rate</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{vitalStats.respiratoryRate}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <span className="text-purple-600 text-2xl">🌡️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Temperature</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{vitalStats.temperature}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100">
                <span className="text-orange-600 text-2xl">🌡️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Smoking Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cigarettes/Day</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{smokingMetrics.cigarettesPerDay}</p>
                <p className="text-xs text-gray-500 mt-1">{smokingMetrics.cigarettesPerDay > 0 ? 'Current usage' : 'No smoking reported'}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <span className="text-red-600 text-2xl">🚬</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Peak Flow</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{smokingMetrics.peakFlow}</p>
                <p className="text-xs text-gray-500 mt-1">Lung function</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <span className="text-blue-600 text-2xl">💨</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CO Level</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{smokingMetrics.carbonMonoxide}</p>
                <p className="text-xs text-gray-500 mt-1">Carbon monoxide</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <span className="text-green-600 text-2xl">☁️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quit Duration</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{smokingMetrics.quitDuration}</p>
                <p className="text-xs text-gray-500 mt-1">Smoke-free</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <span className="text-purple-600 text-2xl">🎯</span>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Records List */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Medical Records</h2>
          {healthRecords.length > 0 ? (
            <div className="space-y-4">
              {healthRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-6 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xl">📋</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{record.title}</h3>
                      <p className="text-sm text-gray-600">{record.description || 'No description available'}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-500">
                          {new Intl.DateTimeFormat('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }).format(record.date)}
                        </span>
                        <span className="text-sm text-gray-500">• {record.type}</span>
                        <span className="text-sm text-gray-500">• {record.provider ? `${record.provider.firstName} ${record.provider.lastName}` : 'Unknown Provider'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                      View Details
                    </button>
                    <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No health records yet</h3>
              <p className="text-gray-500">Your medical records will appear here after your first appointment</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-blue-100 text-blue-600 mr-4">
                📝
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Add Health Note</h4>
                <p className="text-sm text-gray-600">Record personal observations</p>
              </div>
            </button>

            <button className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-green-100 text-green-600 mr-4">
                📊
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Track Symptoms</h4>
                <p className="text-sm text-gray-600">Monitor health changes</p>
              </div>
            </button>

            <button className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-purple-100 text-purple-600 mr-4">
                🩺
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Request Records</h4>
                <p className="text-sm text-gray-600">Get complete medical history</p>
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