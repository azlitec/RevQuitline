'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import PushNotificationPrompt from '@/components/ui/PushNotificationPrompt';

// Enhanced Icon component with fallbacks
const IconWithFallback = ({ icon, emoji, className = '' }: {
  icon: string;
  emoji: string;
  className?: string;
}) => {
  return (
    <span className={`icon-container ${className}`}>
      <span
        className="material-icons"
        style={{
          fontSize: '24px',
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: '1',
          letterSpacing: 'normal',
          textTransform: 'none',
          display: 'inline-block',
          whiteSpace: 'nowrap',
          wordWrap: 'normal',
          direction: 'ltr',
          WebkitFontFeatureSettings: '"liga"',
          WebkitFontSmoothing: 'antialiased'
        }}
      >
        {icon}
      </span>
      <span
        className="emoji-fallback"
        style={{
          fontSize: '20px',
          display: 'none'
        }}
      >
        {emoji}
      </span>
    </span>
  );
};

interface PatientDashboardData {
  totalDoctors: number;
  activeConnections: number;
  upcomingAppointments: number;
  completedAppointments: number;
  outstandingBalance: number;
  recentAppointments: any[];
  connectedDoctors: any[];
}

export default function PatientDashboardPage() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuitlineBanner, setShowQuitlineBanner] = useState(true);
  const [activeRxCount, setActiveRxCount] = useState<number>(0);

  useEffect(() => {
    if (session?.user && !session.user.isProvider) {
      fetchDashboardData();
      fetchActiveRxCount();
    } else if (session === null) {
      // Session is null, user not logged in
      setLoading(false);
      setError('Please log in to view your dashboard');
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/patient/dashboard', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timeout. Please check your connection and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred');
      }
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveRxCount = async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', '0');
      params.set('pageSize', '1');
      params.set('status', 'ACTIVE');
      const response = await fetch(`/api/patient/prescriptions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prescriptions');
      }
      const json = await response.json();
      const total = json?.data?.total ?? 0;
      setActiveRxCount(typeof total === 'number' ? total : 0);
    } catch {
      setActiveRxCount(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 bg-red-50 text-red-700 rounded-xl shadow-soft max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <IconWithFallback icon="error_outline" emoji="⚠️" className="text-red-600" />
          <h2 className="text-xl font-bold">Error Loading Dashboard</h2>
        </div>
        <p className="mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-6 py-2 rounded-lg font-medium transition-colors touch-friendly"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <PushNotificationPrompt role="patient" />
      {/* Enhanced Welcome Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Patient Dashboard</h1>
          <p className="text-sm md:text-base text-gray-500 flex items-center">
            Manage your healthcare connections and appointments
            <IconWithFallback
              icon="expand_more"
              emoji="🔽"
              className="ml-1 text-sm text-gray-400 hover:text-blue-500 cursor-pointer"
            />
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/patient/doctors"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 transition-all duration-300 shadow-medium hover:shadow-strong flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly hover:scale-105"
          >
            <IconWithFallback icon="search" emoji="🔍" className="text-white" />
            <span>Find Doctors</span>
          </Link>
        </div>
      </div>

      {/* Quitline Free-Smoking Session Banner */}
      {showQuitlineBanner && (
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl p-4 md:p-6 mb-6 md:mb-8 shadow-lg relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-16 h-16 bg-white rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-white rounded-full"></div>
            <div className="absolute top-8 left-8 w-8 h-8 bg-white rounded-full"></div>
          </div>

          <div className="relative z-10">
            <button
              onClick={() => setShowQuitlineBanner(false)}
              className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <IconWithFallback icon="close" emoji="✕" className="text-lg" />
            </button>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  Start Your Smoke-Free Journey Today!
                </h2>
                <p className="text-green-100 mb-4 md:mb-0 text-sm md:text-base">
                  Learn how (Inhaler Nicotine Replacement Therapy) INRT can help you quit faster with our specialized session.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:ml-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                  <div className="text-sm text-green-100">Session Price</div>
                  <div className="text-2xl font-bold">RM 150</div>
                </div>
                <Link
                  href="/patient/appointments?service=quitline-smoking-cessation"
                  className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors shadow-lg hover:shadow-xl text-center"
                >
                  Book Your RM150 Session Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="card p-3 md:p-6 hover-effect shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex justify-between items-start">
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="people" emoji="👥" className="text-blue-600 text-sm md:text-base" />
            </div>
            <div className="bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1 rounded-full">
              +{(() => {
                const connections = dashboardData?.activeConnections || 0;
                return connections > 0 ? Math.floor((connections / Math.max(1, connections + 2)) * 100) : 0;
              })()}%
            </div>
          </div>
          <p className="text-gray-500 mt-4 text-sm font-medium">Connected Doctors</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">{dashboardData?.activeConnections || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Active connections</p>
        </div>

        <div className="card p-3 md:p-6 hover-effect shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex justify-between items-start">
            <div className="bg-gradient-to-r from-green-100 to-green-200 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="event" emoji="📅" className="text-green-600 text-sm md:text-base" />
            </div>
            <div className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">
              +{(() => {
                const upcoming = dashboardData?.upcomingAppointments || 0;
                return upcoming > 0 ? Math.floor((upcoming / Math.max(1, upcoming + 1)) * 100) : 0;
              })()}%
            </div>
          </div>
          <p className="text-gray-500 mt-4 text-sm font-medium">Upcoming Appointments</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">{dashboardData?.upcomingAppointments || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Scheduled this month</p>
        </div>

        <div className="card p-3 md:p-6 hover-effect shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex justify-between items-start">
            <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="task_alt" emoji="✅" className="text-purple-600 text-sm md:text-base" />
            </div>
            <div className="bg-purple-100 text-purple-600 text-xs font-bold px-3 py-1 rounded-full">
              +{(() => {
                const completed = dashboardData?.completedAppointments || 0;
                return completed > 0 ? Math.floor((completed / Math.max(1, completed + 3)) * 100) : 0;
              })()}%
            </div>
          </div>
          <p className="text-gray-500 mt-4 text-sm font-medium">Completed Sessions</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">{dashboardData?.completedAppointments || 0}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="card p-3 md:p-6 hover-effect shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex justify-between items-start">
            <div className="bg-gradient-to-r from-orange-100 to-orange-200 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="payment" emoji="💰" className="text-orange-600 text-sm md:text-base" />
            </div>
            <div className={`text-xs font-bold px-3 py-1 rounded-full ${
              (dashboardData?.outstandingBalance || 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
            }`}>
              {(dashboardData?.outstandingBalance || 0) > 0 ? 'Due' : 'Paid'}
            </div>
          </div>
          <p className="text-gray-500 mt-4 text-sm font-medium">Outstanding Balance</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">RM {dashboardData?.outstandingBalance || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Payment status</p>
        </div>

        {/* Active Prescriptions Widget */}
        <div className="card p-3 md:p-6 hover-effect shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex justify-between items-start">
            <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="medication" emoji="💊" className="text-purple-600 text-sm md:text-base" />
            </div>
            <Link
              href="/patient/prescriptions"
              className="text-purple-600 text-xs font-bold px-3 py-1 rounded-full hover:underline"
            >
              View
            </Link>
          </div>
          <p className="text-gray-500 mt-4 text-sm font-medium">Active Prescriptions</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">{activeRxCount || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Currently active</p>
        </div>
      </div>

      {/* Wellness Tips */}
      <div className="mb-6 md:mb-8">
        <div className="card p-4 md:p-6 shadow-soft">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Today's Health Tip</h3>
            <button className="text-blue-600 font-semibold text-sm hover:underline">More Tips</button>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <IconWithFallback icon="lightbulb" emoji="💡" className="text-blue-600" />
              </div>
              <div>
                <p className="text-gray-800 font-medium">Stay Hydrated</p>
                <p className="text-gray-600 text-sm mt-1">Drinking enough water is crucial for your health. Aim for 8 glasses a day to maintain optimal body function.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Connected Doctors */}
        <div className="lg:col-span-2">
          <div className="card p-4 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 space-y-3 sm:space-y-0">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">My Appointments</h3>
              <Link
                href="/patient/appointments"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 w-fit hover:scale-105 transition-all duration-300"
              >
                <span>View All</span>
                <IconWithFallback icon="arrow_forward" emoji="→" className="text-xs" />
              </Link>
            </div>
            
            {dashboardData?.recentAppointments && dashboardData.recentAppointments.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {dashboardData.recentAppointments.slice(0, 3).map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-medium hover:scale-102">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm">
                        <IconWithFallback icon="event" emoji="📅" className="text-green-600 text-sm md:text-base" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 text-sm md:text-base">{appointment.doctorName}</h4>
                        <p className="text-xs md:text-sm text-gray-500">{appointment.date}</p>
                        {appointment.type === 'quitline_smoking_cessation' && (
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="text-xs bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 px-2 py-1 rounded-full font-medium">
                              🚭 Quitline Session
                            </span>
                          </div>
                        )}
                        {appointment.type === 'psychiatrist_session' && (
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 px-2 py-1 rounded-full font-medium">
                              🧠 Psychiatrist Session
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        appointment.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' :
                        appointment.status === 'upcoming' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700' :
                        'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 md:py-12">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <IconWithFallback icon="event" emoji="📅" className="text-gray-400 text-lg md:text-2xl" />
                </div>
                <h3 className="text-base md:text-lg font-medium text-gray-600 mb-2">No upcoming appointments</h3>
                <p className="text-sm md:text-base text-gray-500 mb-4">Schedule your first appointment to get started</p>
                <Link
                  href="/patient/appointments"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 text-sm font-medium touch-friendly"
                >
                  Schedule Appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Recent Appointments */}
          <div className="card p-4 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 md:mb-6">Recent Appointments</h3>

            {dashboardData?.recentAppointments && dashboardData.recentAppointments.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentAppointments.slice(0, 3).map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-medium">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                      <IconWithFallback icon="event" emoji="📅" className="text-blue-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm">{appointment.doctorName}</h4>
                      <p className="text-xs text-gray-500">{appointment.date}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      appointment.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' :
                      appointment.status === 'upcoming' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700' :
                      'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <IconWithFallback icon="event_note" emoji="📅" className="text-gray-400 text-2xl mb-2" />
                <p className="text-sm text-gray-500">No recent appointments</p>
              </div>
            )}
          </div>


        </div>
      </div>
    </>
  );
}