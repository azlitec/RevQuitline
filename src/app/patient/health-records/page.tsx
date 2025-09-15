'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import HealthRecordModal from '@/components/patient/HealthRecordModal';

interface HealthRecord {
  id: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
  provider: {
    firstName: string;
    lastName: string;
    specialty: string | null;
  };
}

interface VitalSign {
  bloodPressure: string | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  respiratoryRate: number | null;
  temperature: number | null;
}

interface SmokingMetric {
  cigarettesPerDay: number | null;
  peakFlow: number | null;
  carbonMonoxideLevel: number | null;
  quitDurationDays: number | null;
}

export default function PatientHealthRecordsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [vitalStats, setVitalStats] = useState({
    bloodPressure: 'N/A',
    heartRate: 'N/A',
    oxygenSaturation: 'N/A',
    respiratoryRate: 'N/A',
    temperature: 'N/A'
  });
  const [smokingMetrics, setSmokingMetrics] = useState({
    cigarettesPerDay: 0,
    peakFlow: 'N/A',
    carbonMonoxide: 'N/A',
    quitDuration: '0 days'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || !session.user) {
      router.push('/login?callbackUrl=/patient/health-records');
      return;
    }

    // Check if user is a patient (not provider or admin)
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      // Redirect to appropriate dashboard based on user role
      if (session.user.isAdmin) {
        router.push('/admin/dashboard');
      } else if (session.user.isClerk) {
        router.push('/clerk/dashboard');
      } else if (session.user.isProvider) {
        router.push('/provider/dashboard');
      }
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch health records
      const recordsResponse = await fetch('/api/patient/health-records');
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setHealthRecords(recordsData.healthRecords || []);
      }

      // Fetch latest vital signs and smoking metrics from the dashboard API
      const dashboardResponse = await fetch('/api/patient/dashboard');
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();

        // Format vital stats
        if (dashboardData.latestVitalSign) {
          const vitals = dashboardData.latestVitalSign;
          setVitalStats({
            bloodPressure: vitals.bloodPressure || 'N/A',
            heartRate: vitals.heartRate ? `${vitals.heartRate} bpm` : 'N/A',
            oxygenSaturation: vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : 'N/A',
            respiratoryRate: vitals.respiratoryRate ? `${vitals.respiratoryRate} breaths/min` : 'N/A',
            temperature: vitals.temperature ? `${vitals.temperature}°F` : 'N/A'
          });
        }

        // Format smoking metrics
        if (dashboardData.latestSmokingMetric) {
          const smoking = dashboardData.latestSmokingMetric;
          setSmokingMetrics({
            cigarettesPerDay: smoking.cigarettesPerDay || 0,
            peakFlow: smoking.peakFlow ? `${smoking.peakFlow} L/min` : 'N/A',
            carbonMonoxide: smoking.carbonMonoxideLevel ? `${smoking.carbonMonoxideLevel} ppm` : 'N/A',
            quitDuration: smoking.quitDurationDays ? `${smoking.quitDurationDays} days` : '0 days'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load health records data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (recordId: string) => {
    setSelectedRecordId(recordId);
    setModalOpen(true);
  };

  const handleDownloadRecord = (recordId: string) => {
    window.open(`/api/patient/health-records/${recordId}/download`, '_blank');
  };

  const handleDownloadAllRecords = () => {
    window.open('/api/patient/health-records/export', '_blank');
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRecordId(null);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-gray-600 font-medium">Loading health records...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto mt-8">
        <h2 className="text-xl font-bold mb-4">Error Loading Health Records</h2>
        <p>{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

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
          <button
            onClick={handleDownloadAllRecords}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105"
          >
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
                          }).format(new Date(record.date))}
                        </span>
                        <span className="text-sm text-gray-600">• {record.type}</span>
                        <span className="text-sm text-gray-600">• {record.provider ? `${record.provider.firstName} ${record.provider.lastName}` : 'Unknown Provider'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleViewDetails(record.id)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDownloadRecord(record.id)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:border-green-400 transition-all duration-300 font-medium"
                    >
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

        {/* Health Record Details Modal */}
        <HealthRecordModal
          recordId={selectedRecordId}
          isOpen={modalOpen}
          onClose={closeModal}
        />
      </div>
    );
}