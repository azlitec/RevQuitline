import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

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
      <div className="min-h-screen" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#F0F8FF' }}>
        <div className="flex rounded-3xl overflow-hidden shadow-2xl m-4 lg:m-8" style={{ backgroundColor: '#E6F3FF' }}>
          {/* Beautiful Sidebar */}
          <aside className="w-20 flex flex-col items-center py-6 space-y-6" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-blue-500 font-bold text-2xl mb-4">L</div>
            <nav className="flex flex-col items-center space-y-6 flex-grow">
              <a href="#" className="nav-item active p-3 rounded-xl">
                <span className="material-icons text-blue-500">dashboard</span>
              </a>
              <a href="#" className="nav-item p-3">
                <span className="material-icons text-gray-500">calendar_today</span>
              </a>
              <a href="#" className="nav-item p-3">
                <span className="material-icons text-gray-500">people</span>
              </a>
              <a href="#" className="nav-item p-3">
                <span className="material-icons text-gray-500">local_hospital</span>
              </a>
              <a href="#" className="nav-item p-3">
                <span className="material-icons text-gray-500">medication</span>
              </a>
              <a href="#" className="nav-item p-3">
                <span className="material-icons text-gray-500">assignment</span>
              </a>
              <a href="#" className="nav-item p-3">
                <span className="material-icons text-gray-500">receipt</span>
              </a>
            </nav>
            <div className="text-gray-500 p-3 nav-item">
              <span className="material-icons">settings</span>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            {/* Beautiful Header */}
            <header className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Good Morning {providerName}</h1>
                <p className="text-gray-500 flex items-center">
                  Your daily healthcare dashboard
                  <span className="material-icons text-sm ml-1">expand_more</span>
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input 
                    className="bg-white rounded-lg py-2 pl-10 pr-4 focus:outline-none w-64 shadow-sm" 
                    placeholder="Search patients, appointments..." 
                    type="text"
                  />
                </div>
                <button className="text-gray-600 relative p-2 hover:bg-gray-100 rounded-lg transition-all duration-200">
                  <span className="material-icons">notifications_none</span>
                  <div className="notification-dot absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">5</div>
                </button>
                <button className="text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-all duration-200">
                  <span className="material-icons">refresh</span>
                </button>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                  {providerName.charAt(0).toUpperCase()}
                </div>
              </div>
            </header>

            {/* Today's Overview */}
            <section className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Today's Overview</h2>
                <div className="flex space-x-2">
                  <button className="text-gray-500 hover:text-blue-500 transition-colors">
                    <span className="material-icons">refresh</span>
                  </button>
                  <button className="text-gray-500 hover:text-blue-500 transition-colors">
                    <span className="material-icons">more_vert</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6 shadow-lg hover-effect">
                  <div className="flex justify-between items-start">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <span className="material-icons text-blue-600">event_available</span>
                    </div>
                    <div className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">+12%</div>
                  </div>
                  <p className="text-gray-500 mt-4 text-sm font-medium">Today's Appointments</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.appointments}</p>
                  <p className="text-xs text-gray-400 mt-1">8 completed, 16 remaining</p>
                </div>
                
                <div className="card p-6 shadow-lg hover-effect">
                  <div className="flex justify-between items-start">
                    <div className="bg-yellow-100 p-3 rounded-xl">
                      <span className="material-icons text-yellow-600">schedule</span>
                    </div>
                    <div className="bg-yellow-100 text-yellow-600 text-xs font-bold px-3 py-1 rounded-full animate-pulse">LIVE</div>
                  </div>
                  <p className="text-gray-500 mt-4 text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.inProgress}</p>
                  <p className="text-xs text-gray-400 mt-1">Active consultations</p>
                </div>
                
                <div className="card p-6 shadow-lg hover-effect">
                  <div className="flex justify-between items-start">
                    <div className="bg-purple-100 p-3 rounded-xl">
                      <span className="material-icons text-purple-600">people</span>
                    </div>
                    <div className="bg-purple-100 text-purple-600 text-xs font-bold px-3 py-1 rounded-full">+89</div>
                  </div>
                  <p className="text-gray-500 mt-4 text-sm font-medium">Total Patients</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{todayStats.totalPatients.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">This month</p>
                </div>
                
                <div className="card p-6 shadow-lg hover-effect">
                  <div className="flex justify-between items-start">
                    <div className="bg-green-100 p-3 rounded-xl">
                      <span className="material-icons text-green-600">monetization_on</span>
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
                      <span className="material-icons">more_horiz</span>
                    </button>
                  </div>
                  <div className="flex justify-center items-center my-6">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-blue-300 opacity-30" cx="50" cy="50" fill="transparent" r="35" stroke="currentColor" strokeWidth="8"></circle>
                        <circle 
                          className="text-white transition-all duration-1000" 
                          cx="50" 
                          cy="50" 
                          fill="transparent" 
                          r="35" 
                          stroke="currentColor" 
                          strokeLinecap="round" 
                          strokeWidth="8" 
                          style={{ 
                            strokeDasharray: '219.9', 
                            strokeDashoffset: 'calc(219.9 - (219.9 * 78) / 100)',
                            transform: 'rotate(-90deg)',
                            transformOrigin: '50% 50%'
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
                    <div className="card p-6 hover-effect">
                      <div className="flex justify-between items-start">
                        <div className="p-3 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                          <span className="material-icons">healing</span>
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
                    
                    <div className="card p-6 hover-effect">
                      <div className="flex justify-between items-start">
                        <div className="p-3 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                          <span className="material-icons">description</span>
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
                  <div className="card p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-800">Weekly Performance</h3>
                      <select className="bg-gray-50 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none">
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
                <button className="text-blue-600 font-semibold hover:underline">View All</button>
              </div>
              <div className="card p-6">
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="appointment-card p-4 rounded-lg border-l-4 border-transparent">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                            {activity.patientInitials}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{activity.patientName}</p>
                            <p className="text-sm text-gray-500">{activity.type} • {activity.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-gray-600">{activity.duration}</span>
                          <span className="text-sm font-semibold text-gray-800">{activity.fee}</span>
                          <span className={`text-sm font-semibold py-2 px-4 rounded-full ${
                            activity.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            activity.status === 'In Progress' ? 'bg-blue-100 text-blue-700 animate-pulse' :
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
          </main>
        </div>

        {/* Global fonts/icons and helper classes are imported in globals.css */}
      </div>
    );
    
  } catch (error) {
    console.error("Provider dashboard error:", error);
    
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F8FF' }}>
        <div className="p-8 bg-white text-red-700 rounded-3xl shadow-2xl max-w-md mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-red-600 text-2xl">error_outline</span>
            </div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">Unable to load provider dashboard.</p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
