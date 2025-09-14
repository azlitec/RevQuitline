import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

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

export default async function ProviderDashboardPage() {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      redirect('/login?callbackUrl=/provider/dashboard');
    }

    if (!session.user.isProvider) {
      if (session.user.isAdmin) {
        redirect('/admin/dashboard');
      } else if (session.user.isClerk) {
        redirect('/clerk/dashboard');
      } else {
        redirect('/patient/dashboard');
      }
    }

    // Fetch provider data
    const providerData = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });

    if (!providerData) {
      redirect('/login');
    }

    const providerName =
      [providerData.firstName, providerData.lastName].filter(Boolean).join(' ').trim() ||
      (providerData as any).name ||
      (providerData.email ? providerData.email.split('@')[0] : '') ||
      'Dr. Provider';

    // Enhanced mock data for provider dashboard
    const todayStats = {
      appointments: 24,
      inProgress: 3,
      totalPatients: 1247,
      revenue: 'RM 12,450'
    };

    const recentActivities = [
      {
        id: '1',
        patientName: 'Ahmad Rahman',
        patientInitials: 'AR',
        type: 'Free-smoking Session',
        time: '2:30 PM',
        duration: '45 mins',
        fee: 'RM 150.00',
        status: 'Completed'
      },
      {
        id: '2',
        patientName: 'Siti Nurhaliza',
        patientInitials: 'SN',
        type: 'General Consultation',
        time: '1:15 PM',
        duration: '30 mins',
        fee: 'RM 80.00',
        status: 'In Progress'
      },
      {
        id: '3',
        patientName: 'Raj Kumar',
        patientInitials: 'RK',
        type: 'Follow-up Session',
        time: '3:45 PM',
        duration: '25 mins',
        fee: 'RM 100.00',
        status: 'Scheduled'
      }
    ];

    return (
      <>
        {/* Today's Overview */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Today's Overview</h2>
            <div className="flex space-x-2">
              <button className="text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50">
                <IconWithFallback icon="refresh" emoji="🔄" />
              </button>
              <button className="text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50">
                <IconWithFallback icon="more_vert" emoji="⋮" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6 shadow-soft hover-effect">
              <div className="flex justify-between items-start">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <IconWithFallback icon="event_available" emoji="📅" className="text-blue-600" />
                </div>
                <div className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">+12%</div>
              </div>
              <p className="text-gray-500 mt-4 text-sm font-medium">Today's Appointments</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.appointments}</p>
              <p className="text-xs text-gray-400 mt-1">8 completed, 16 remaining</p>
            </div>
            
            <div className="card p-6 shadow-soft hover-effect">
              <div className="flex justify-between items-start">
                <div className="bg-yellow-100 p-3 rounded-xl">
                  <IconWithFallback icon="schedule" emoji="⏰" className="text-yellow-600" />
                </div>
                <div className="bg-yellow-100 text-yellow-600 text-xs font-bold px-3 py-1 rounded-full status-badge">LIVE</div>
              </div>
              <p className="text-gray-500 mt-4 text-sm font-medium">In Progress</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.inProgress}</p>
              <p className="text-xs text-gray-400 mt-1">Active consultations</p>
            </div>
            
            <div className="card p-6 shadow-soft hover-effect">
              <div className="flex justify-between items-start">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <IconWithFallback icon="people" emoji="👥" className="text-purple-600" />
                </div>
                <div className="bg-purple-100 text-purple-600 text-xs font-bold px-3 py-1 rounded-full">+89</div>
              </div>
              <p className="text-gray-500 mt-4 text-sm font-medium">Total Patients</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.totalPatients.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">This month</p>
            </div>
            
            <div className="card p-6 shadow-soft hover-effect">
              <div className="flex justify-between items-start">
                <div className="bg-green-100 p-3 rounded-xl">
                  <IconWithFallback icon="monetization_on" emoji="💰" className="text-green-600" />
                </div>
                <div className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">+15%</div>
              </div>
              <p className="text-gray-500 mt-4 text-sm font-medium">Revenue</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.revenue}</p>
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
                        strokeDashoffset: 'calc(219.9 - (219.9 * 78) / 100)'
                      }}
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-center items-center">
                    <span className="text-3xl font-bold text-white">78%</span>
                    <span className="text-sm text-blue-100">Active Rate</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-blue-100 text-sm">Total Active Patients</p>
                <p className="text-3xl font-bold text-white">972</p>
                <p className="text-blue-100 text-sm">of 1,247 registered</p>
              </div>
            </div>

            {/* Quick Actions & Services */}
            <div className="col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 hover-effect shadow-soft">
                  <div className="flex justify-between items-start">
                    <div className="bg-gradient-to-r from-purple-400 to-purple-600 p-3 rounded-xl text-white">
                      <IconWithFallback icon="healing" emoji="⚕️" className="text-white" />
                    </div>
                    <button className="text-blue-600 font-semibold text-sm hover:underline">View All</button>
                  </div>
                  <p className="text-gray-500 mt-4 text-sm font-medium">Free-smoking Sessions</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">156</p>
                  <p className="text-xs text-gray-400 mt-1">Completed this month</p>
                  <div className="mt-4 flex items-center">
                    <div className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">Most Popular</div>
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
                  <p className="text-3xl font-bold text-gray-800 mt-2">89</p>
                  <p className="text-xs text-gray-400 mt-1">Issued this week</p>
                  <div className="mt-4 flex items-center">
                    <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">12 pending</div>
                  </div>
                </div>
              </div>

              {/* Weekly Performance Chart */}
              <div className="card p-6 shadow-soft">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Weekly Performance</h3>
                  <select className="bg-gray-50 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none border border-gray-200 focus:border-blue-400">
                    <option>This Week</option>
                    <option>Last Week</option>
                    <option>This Month</option>
                  </select>
                </div>
                <div className="flex items-end justify-between h-40 space-x-3">
                  {[
                    { day: 'Mon', patients: '8 patients', height: 'h-20' },
                    { day: 'Tue', patients: '12 patients', height: 'h-32' },
                    { day: 'Wed', patients: '15 patients', height: 'h-36' },
                    { day: 'Thu', patients: '10 patients', height: 'h-28' },
                    { day: 'Fri', patients: '18 patients', height: 'h-40' },
                    { day: 'Sat', patients: '9 patients', height: 'h-24' },
                    { day: 'Sun', patients: 'Closed', height: 'h-16', closed: true }
                  ].map((item, index) => (
                    <div key={item.day} className="text-center flex-1">
                      <div 
                        className={`${item.height} rounded-t-lg mb-2 relative overflow-hidden transition-all duration-500 hover:scale-105 ${
                          item.closed 
                            ? 'bg-gray-200' 
                            : 'bg-gradient-to-t from-blue-400 to-blue-300'
                        }`}
                      >
                        {!item.closed && (
                          <div className="absolute inset-0 bg-white opacity-20"></div>
                        )}
                        {item.day === 'Fri' && !item.closed && (
                          <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                            <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-600">{item.day}</p>
                      <p className="text-xs text-gray-400">{item.patients}</p>
                    </div>
                  ))}
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
              {recentActivities.map((activity) => (
                <div key={activity.id} className="appointment-card p-4 rounded-lg border-l-4 border-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 patient-avatar rounded-full flex items-center justify-center text-white font-semibold">
                        {activity.patientInitials}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{activity.patientName}</p>
                        <p className="text-sm text-gray-500 flex items-center space-x-1">
                          <span>{activity.type}</span>
                          <span>•</span>
                          <span>{activity.time}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                        <IconWithFallback icon="schedule" emoji="⏰" className="text-gray-400 text-sm" />
                        <span>{activity.duration}</span>
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{activity.fee}</span>
                      <span className={`text-sm font-semibold py-2 px-4 rounded-full ${
                        activity.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        activity.status === 'In Progress' ? 'bg-blue-100 text-blue-700 status-badge' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    );
    
  } catch (error) {
    console.error("Provider dashboard error:", error);
    
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F8FF' }}>
        <div className="p-8 bg-white text-red-700 rounded-3xl shadow-strong max-w-md mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconWithFallback icon="error_outline" emoji="⚠️" className="text-red-600 text-2xl" />
            </div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">Unable to load provider dashboard.</p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-medium hover:shadow-strong">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
