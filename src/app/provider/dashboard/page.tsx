'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

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

interface DashboardData {
  todayStats: {
    totalAppointments: number;
    completedAppointments: number;
    inProgressAppointments: number;
    scheduledAppointments: number;
  };
  monthlyStats: {
    totalAppointments: number;
    completedAppointments: number;
    revenue: number;
  };
  totalPatients: number;
  recentActivities: Array<{
    id: string;
    date: string;
    type: string;
    status: string;
    duration: number;
    patient: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  weeklyData: Array<{
    date: string;
    appointments: number;
  }>;
}

export default function ProviderDashboardPage() {
  const { data: session, status } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || !session.user?.isProvider) {
      redirect('/login');
    }

    fetchDashboardData();
  }, [session, status]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/provider/dashboard');
      
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

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString()}`;
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateFee = (type: string) => {
    const fees = {
      'consultation': 150,
      'follow-up': 100,
      'emergency': 200
    };
    return fees[type as keyof typeof fees] || 80;
  };

  const getMaxHeight = (appointments: number) => {
    const maxAppts = Math.max(...(dashboardData?.weeklyData.map(d => d.appointments) || [1]));
    const percentage = (appointments / maxAppts) * 100;
    return Math.max(percentage * 0.4, 16); // Min 16px height
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
      <div className="p-8 bg-red-50 text-red-700 rounded-xl shadow-soft max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <IconWithFallback icon="error_outline" emoji="⚠️" className="text-red-600" />
          <h2 className="text-xl font-bold">Error Loading Dashboard</h2>
        </div>
        <p className="mb-4">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <IconWithFallback icon="info" emoji="ℹ️" className="text-gray-400 text-2xl" />
        <p className="text-gray-600 mt-2">No dashboard data available</p>
      </div>
    );
  }

  const { todayStats, monthlyStats, totalPatients, recentActivities, weeklyData } = dashboardData;
  const activePatients = Math.floor(totalPatients * 0.78); // 78% active rate

  return (
    <>
      {/* Today's Overview */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Today's Overview</h2>
          <div className="flex space-x-2">
            <button 
              onClick={fetchDashboardData}
              className="text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50"
            >
              <IconWithFallback icon="refresh" emoji="🔄" />
            </button>
            <button className="text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50">
              <IconWithFallback icon="more_vert" emoji="⋮" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="card p-3 sm:p-4 lg:p-6 shadow-soft hover-effect">
            <div className="flex justify-between items-start">
              <div className="bg-blue-100 p-3 rounded-xl">
                <IconWithFallback icon="event_available" emoji="📅" className="text-blue-600" />
              </div>
              <div className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">
                {todayStats.totalAppointments > 0 ? '+' : ''}
                {((todayStats.totalAppointments / Math.max(1, totalPatients)) * 100).toFixed(0)}%
              </div>
            </div>
            <p className="text-gray-500 mt-4 text-sm font-medium">Today's Appointments</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.totalAppointments}</p>
            <p className="text-xs text-gray-400 mt-1">
              {todayStats.completedAppointments} completed, {todayStats.scheduledAppointments} remaining
            </p>
          </div>
          
          <div className="card p-6 shadow-soft hover-effect">
            <div className="flex justify-between items-start">
              <div className="bg-yellow-100 p-3 rounded-xl">
                <IconWithFallback icon="schedule" emoji="⏰" className="text-yellow-600" />
              </div>
              {todayStats.inProgressAppointments > 0 ? (
                <div className="bg-yellow-100 text-yellow-600 text-xs font-bold px-3 py-1 rounded-full status-badge">LIVE</div>
              ) : (
                <div className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">-</div>
              )}
            </div>
            <p className="text-gray-500 mt-4 text-sm font-medium">In Progress</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.inProgressAppointments}</p>
            <p className="text-xs text-gray-400 mt-1">Active consultations</p>
          </div>
          
          <div className="card p-6 shadow-soft hover-effect">
            <div className="flex justify-between items-start">
              <div className="bg-purple-100 p-3 rounded-xl">
                <IconWithFallback icon="people" emoji="👥" className="text-purple-600" />
              </div>
              <div className="bg-purple-100 text-purple-600 text-xs font-bold px-3 py-1 rounded-full">
                +{monthlyStats.totalAppointments}
              </div>
            </div>
            <p className="text-gray-500 mt-4 text-sm font-medium">Total Patients</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{totalPatients.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">This month</p>
          </div>
          
          <div className="card p-6 shadow-soft hover-effect">
            <div className="flex justify-between items-start">
              <div className="bg-green-100 p-3 rounded-xl">
                <IconWithFallback icon="monetization_on" emoji="💰" className="text-green-600" />
              </div>
              <div className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">
                +{((monthlyStats.revenue / Math.max(1, monthlyStats.revenue * 0.8)) * 100).toFixed(0)}%
              </div>
            </div>
            <p className="text-gray-500 mt-4 text-sm font-medium">Revenue</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{formatCurrency(monthlyStats.revenue)}</p>
            <p className="text-xs text-gray-400 mt-1">This month</p>
          </div>
        </div>
      </section>

      {/* Patient Analytics & Quick Actions */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Analytics */}
          <div className="primary-card p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-white">Patient Analytics</h3>
              <button className="text-white opacity-80 hover:opacity-100">
                <IconWithFallback icon="more_horiz" emoji="⋯" className="text-white" />
              </button>
            </div>
            <div className="flex justify-center items-center my-6">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-blue-300 opacity-30" cx="50" cy="50" fill="transparent" r="35" stroke="currentColor" strokeWidth="8"></circle>
                  <circle 
                    className="progress-ring__circle text-white" 
                    cx="50" 
                    cy="50" 
                    fill="transparent" 
                    r="35" 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeWidth="8" 
                    style={{ 
                      strokeDasharray: '219.9', 
                      strokeDashoffset: `calc(219.9 - (219.9 * ${(activePatients / Math.max(1, totalPatients)) * 100}) / 100)`
                    }}
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col justify-center items-center">
                  <span className="text-3xl font-bold text-white">
                    {totalPatients > 0 ? Math.floor((activePatients / totalPatients) * 100) : 0}%
                  </span>
                  <span className="text-sm text-blue-100">Active Rate</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm">Total Active Patients</p>
              <p className="text-3xl font-bold text-white">{activePatients}</p>
              <p className="text-blue-100 text-sm">of {totalPatients} registered</p>
            </div>
          </div>

          {/* Quick Actions & Services */}
          <div className="col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-3 sm:p-4 lg:p-6 hover-effect shadow-soft">
                <div className="flex justify-between items-start">
                  <div className="bg-gradient-to-r from-purple-400 to-purple-600 p-3 rounded-xl text-white">
                    <IconWithFallback icon="healing" emoji="⚕️" className="text-white" />
                  </div>
                  <button className="text-blue-600 font-semibold text-sm hover:underline">View All</button>
                </div>
                <p className="text-gray-500 mt-4 text-sm font-medium">Free-smoking Sessions</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {monthlyStats.completedAppointments}
                </p>
                <p className="text-xs text-gray-400 mt-1">Completed this month</p>
                <div className="mt-4 flex items-center">
                  <div className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
                    {monthlyStats.completedAppointments > monthlyStats.totalAppointments * 0.6 ? 'Most Popular' : 'Active'}
                  </div>
                </div>
              </div>
              
              <div className="card p-6 hover-effect shadow-soft">
                <div className="flex justify-between items-start">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-600 p-3 rounded-xl text-white">
                    <IconWithFallback icon="description" emoji="📄" className="text-white" />
                  </div>
                  <button className="text-blue-600 font-semibold text-sm hover:underline">Create New</button>
                </div>
                <p className="text-gray-500 mt-4 text-sm font-medium">Prescriptions</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {Math.floor(monthlyStats.completedAppointments * 0.7)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Issued this week</p>
                <div className="mt-4 flex items-center">
                  <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                    {Math.floor(monthlyStats.completedAppointments * 0.1)} pending
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Performance Chart */}
            <div className="card p-3 sm:p-4 lg:p-6 shadow-soft">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Weekly Performance</h3>
                <select className="bg-gray-50 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none border border-gray-200 focus:border-blue-400">
                  <option>This Week</option>
                  <option>Last Week</option>
                  <option>This Month</option>
                </select>
              </div>
              <div className="flex items-end justify-between h-40 space-x-3">
                {weeklyData.map((dayData, index) => {
                  const height = getMaxHeight(dayData.appointments);
                  const dayName = getDayName(dayData.date);
                  const isToday = new Date(dayData.date).toDateString() === new Date().toDateString();
                  
                  return (
                    <div key={dayData.date} className="text-center flex-1">
                      <div 
                        className={`rounded-t-lg mb-2 relative overflow-hidden transition-all duration-500 hover:scale-105 ${
                          dayData.appointments === 0
                            ? 'bg-gray-200' 
                            : 'bg-gradient-to-t from-blue-400 to-blue-300'
                        }`}
                        style={{ height: `${height}px` }}
                      >
                        {dayData.appointments > 0 && (
                          <div className="absolute inset-0 bg-white opacity-20"></div>
                        )}
                        {isToday && dayData.appointments > 0 && (
                          <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                            <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-600">{dayName}</p>
                      <p className="text-xs text-gray-400">
                        {dayData.appointments === 0 ? 'No appointments' : `${dayData.appointments} patients`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Patient Activities */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Recent Patient Activities</h2>
          <button className="text-blue-600 font-semibold hover:underline flex items-center space-x-2">
            <span>View All</span>
            <IconWithFallback icon="arrow_forward" emoji="→" className="text-blue-600" />
          </button>
        </div>
        <div className="card p-6 shadow-soft">
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => {
                const patientInitials = getPatientInitials(activity.patient.firstName, activity.patient.lastName);
                const activityTime = getActivityTime(activity.date);
                const fee = calculateFee(activity.type);
                
                return (
                  <div key={activity.id} className="appointment-card p-4 rounded-lg border-l-4 border-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 patient-avatar rounded-full flex items-center justify-center text-white font-semibold">
                          {patientInitials}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {activity.patient.firstName} {activity.patient.lastName}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center space-x-1">
                            <span>{activity.type}</span>
                            <span>•</span>
                            <span>{activityTime}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                          <IconWithFallback icon="schedule" emoji="⏰" className="text-gray-400 text-sm" />
                          <span>{activity.duration} mins</span>
                        </span>
                        <span className="text-sm font-semibold text-gray-800">RM {fee}.00</span>
                        <span className={`text-sm font-semibold py-2 px-4 rounded-full ${
                          activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                          activity.status === 'in-progress' ? 'bg-blue-100 text-blue-700 status-badge' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1).replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <IconWithFallback icon="event_busy" emoji="📅❌" className="text-gray-400 text-2xl" />
                <p className="text-gray-600 mt-2">No recent activities</p>
                <p className="text-gray-500 text-sm">Activities will appear here as you complete appointments</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
