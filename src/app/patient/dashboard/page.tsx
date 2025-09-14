'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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

  useEffect(() => {
    if (session?.user && !session.user.isProvider) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/patient/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
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
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Patient Dashboard</h1>
          <p className="text-sm md:text-base text-gray-500">Manage your healthcare connections and appointments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/patient/doctors"
            className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly"
          >
            <IconWithFallback icon="search" emoji="🔍" className="text-white" />
            <span>Find Doctors</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="card p-3 md:p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-blue-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="people" emoji="👥" className="text-blue-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Connected Doctors</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{dashboardData?.activeConnections || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-green-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="event" emoji="📅" className="text-green-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Upcoming</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{dashboardData?.upcomingAppointments || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-purple-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="task_alt" emoji="✅" className="text-purple-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Completed</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{dashboardData?.completedAppointments || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-orange-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="payment" emoji="💰" className="text-orange-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Outstanding</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">RM {dashboardData?.outstandingBalance || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Connected Doctors */}
        <div className="lg:col-span-2">
          <div className="card p-4 md:p-6 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 space-y-3 sm:space-y-0">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">My Doctors</h3>
              <Link
                href="/patient/my-doctors"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 w-fit"
              >
                <span>View All</span>
                <IconWithFallback icon="arrow_forward" emoji="→" className="text-xs" />
              </Link>
            </div>
            
            {dashboardData?.connectedDoctors && dashboardData.connectedDoctors.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {dashboardData.connectedDoctors.slice(0, 3).map((doctor: any) => (
                  <div key={doctor.id} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {doctor.initials}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 text-sm md:text-base">{doctor.name}</h4>
                        <p className="text-xs md:text-sm text-gray-500">{doctor.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/patient/appointments?doctor=${doctor.id}`}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors touch-friendly"
                        title="Book Appointment"
                      >
                        <IconWithFallback icon="event" emoji="📅" className="text-sm" />
                      </Link>
                      <button className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-50 rounded-lg transition-colors touch-friendly">
                        <IconWithFallback icon="chat" emoji="💬" className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 md:py-12">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <IconWithFallback icon="search" emoji="🔍" className="text-gray-400 text-lg md:text-2xl" />
                </div>
                <h3 className="text-base md:text-lg font-medium text-gray-600 mb-2">No doctors connected yet</h3>
                <p className="text-sm md:text-base text-gray-500 mb-4">Find and connect with healthcare providers</p>
                <Link
                  href="/patient/doctors"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium touch-friendly"
                >
                  Find Doctors
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Recent Appointments */}
          <div className="card p-4 md:p-6 shadow-soft">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 md:mb-6">Recent Appointments</h3>
            
            {dashboardData?.recentAppointments && dashboardData.recentAppointments.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentAppointments.slice(0, 3).map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <IconWithFallback icon="event" emoji="📅" className="text-blue-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm">{appointment.doctorName}</h4>
                      <p className="text-xs text-gray-500">{appointment.date}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                      appointment.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
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

          {/* Quick Actions */}
          <div className="card p-4 md:p-6 shadow-soft">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 md:mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/patient/doctors"
                className="flex items-center space-x-3 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors touch-friendly"
              >
                <IconWithFallback icon="search" emoji="🔍" className="text-blue-600" />
                <span className="font-medium text-sm">Find New Doctor</span>
              </Link>
              <Link
                href="/patient/appointments"
                className="flex items-center space-x-3 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors touch-friendly"
              >
                <IconWithFallback icon="event" emoji="📅" className="text-green-600" />
                <span className="font-medium text-sm">Schedule Appointment</span>
              </Link>
              <Link
                href="/patient/health-records"
                className="flex items-center space-x-3 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors touch-friendly"
              >
                <IconWithFallback icon="folder" emoji="📋" className="text-purple-600" />
                <span className="font-medium text-sm">Health Records</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}