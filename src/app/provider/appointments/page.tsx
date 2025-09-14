'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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

interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: string;
  duration: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  meetingLink?: string;
  notes?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface FormattedAppointment {
  id: string;
  patientName: string;
  patientEmail: string;
  patientInitials: string;
  date: Date;
  time: string;
  status: string;
  type: string;
  duration: string;
  location: string;
  rawStatus: string;
  fee: string;
}

export default function ProviderAppointmentsPage() {
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [selectedTab]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for demonstration
      const mockAppointments: Appointment[] = [
        {
          id: '1',
          title: 'Free-smoking Session',
          date: new Date().toISOString(),
          duration: 45,
          type: 'consultation',
          status: 'confirmed',
          patient: {
            id: '1',
            firstName: 'Ahmad',
            lastName: 'Rahman',
            email: 'ahmad@example.com'
          }
        },
        {
          id: '2',
          title: 'General Consultation',
          date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          duration: 30,
          type: 'consultation',
          status: 'scheduled',
          patient: {
            id: '2',
            firstName: 'Siti',
            lastName: 'Nurhaliza',
            email: 'siti@example.com'
          }
        },
        {
          id: '3',
          title: 'Follow-up Session',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 25,
          type: 'follow-up',
          status: 'scheduled',
          patient: {
            id: '3',
            firstName: 'Raj',
            lastName: 'Kumar',
            email: 'raj@example.com'
          }
        }
      ];
      
      setAppointments(mockAppointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      // Mock update - replace with actual API call
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: newStatus as any }
            : apt
        )
      );
    } catch (err) {
      console.error('Error updating appointment status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Format appointments for display
  const formattedAppointments: FormattedAppointment[] = appointments.map(apt => {
    const firstName = apt.patient.firstName;
    const lastName = apt.patient.lastName;
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    
    // Calculate fees based on type
    const fees = {
      'consultation': 'RM 150.00',
      'follow-up': 'RM 100.00',
      'emergency': 'RM 200.00'
    };
    
    return {
      id: apt.id,
      patientName: `${firstName} ${lastName}`,
      patientEmail: apt.patient.email,
      patientInitials: initials,
      date: new Date(apt.date),
      time: new Date(apt.date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      status: apt.status.charAt(0).toUpperCase() + apt.status.slice(1).replace('-', ' '),
      type: apt.title,
      duration: `${apt.duration} mins`,
      location: apt.meetingLink ? 'Virtual' : 'In-Person',
      rawStatus: apt.status,
      fee: fees[apt.type as keyof typeof fees] || 'RM 80.00'
    };
  });

  // Filter appointments based on selected tab
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const filteredAppointments = formattedAppointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (selectedTab === 'today') {
      return appointmentDate.getTime() === today.getTime();
    } else if (selectedTab === 'upcoming') {
      return appointmentDate.getTime() >= tomorrow.getTime() && 
             ['scheduled', 'confirmed'].includes(apt.rawStatus);
    } else {
      return ['completed', 'cancelled', 'no-show'].includes(apt.rawStatus);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return { icon: 'check_circle', emoji: '✅' };
      case 'in-progress': return { icon: 'play_circle', emoji: '▶️' };
      case 'completed': return { icon: 'task_alt', emoji: '✅' };
      case 'cancelled': return { icon: 'cancel', emoji: '❌' };
      case 'scheduled': return { icon: 'schedule', emoji: '📅' };
      default: return { icon: 'event', emoji: '📅' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading appointments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-xl shadow-soft max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <IconWithFallback icon="error_outline" emoji="⚠️" className="text-red-600" />
          <h2 className="text-xl font-bold">Error Loading Appointments</h2>
        </div>
        <p className="mb-4">{error}</p>
        <button 
          onClick={fetchAppointments}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-medium hover:shadow-strong"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Appointments Management</h2>
          <p className="text-gray-500">Manage and track all patient appointments</p>
        </div>
        <button 
          onClick={() => setShowNewAppointmentModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-medium hover:shadow-strong flex items-center space-x-2"
        >
          <IconWithFallback icon="add" emoji="➕" className="text-white" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Appointment Filters */}
      <div className="card p-6 mb-8 shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <input type="date" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
              <option>All Status</option>
              <option>Scheduled</option>
              <option>Confirmed</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
            <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
              <option>All Services</option>
              <option>Free-smoking Session</option>
              <option>General Consultation</option>
              <option>Follow-up</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
              <IconWithFallback icon="filter_list" emoji="🔽" className="text-gray-600" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {[
          { key: 'today', label: "Today's Appointments", icon: 'today', emoji: '📅' },
          { key: 'upcoming', label: 'Upcoming', icon: 'upcoming', emoji: '⏰' },
          { key: 'past', label: 'Past', icon: 'history', emoji: '📜' }
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-2 ${
              selectedTab === tab.key
                ? 'bg-white text-blue-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
            onClick={() => setSelectedTab(tab.key as any)}
          >
            <IconWithFallback 
              icon={tab.icon} 
              emoji={tab.emoji} 
              className={selectedTab === tab.key ? 'text-blue-600' : 'text-gray-500'} 
            />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="card p-6 shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-700">Patient</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-700">Service</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-700">Date & Time</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-700">Duration</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-700">Fee</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment) => {
                  const statusIcon = getStatusIcon(appointment.rawStatus);
                  return (
                    <tr key={appointment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 patient-avatar rounded-full flex items-center justify-center text-white font-semibold shadow-soft">
                            {appointment.patientInitials}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{appointment.patientName}</p>
                            <p className="text-sm text-gray-500">{appointment.patientEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-800">{appointment.type}</p>
                        <p className="text-sm text-gray-500">{appointment.location}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-800">
                          {appointment.date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-gray-500">{appointment.time}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-800">{appointment.duration}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-gray-800">{appointment.fee}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${
                          appointment.rawStatus === 'completed' ? 'bg-green-100 text-green-700' :
                          appointment.rawStatus === 'in-progress' ? 'bg-blue-100 text-blue-700 status-badge' :
                          appointment.rawStatus === 'confirmed' ? 'bg-purple-100 text-purple-700' :
                          appointment.rawStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          <IconWithFallback 
                            icon={statusIcon.icon} 
                            emoji={statusIcon.emoji} 
                            className="text-xs"
                          />
                          <span>{appointment.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                            <IconWithFallback icon="visibility" emoji="👁️" className="text-sm" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-50 rounded-lg transition-colors" title="Edit">
                            <IconWithFallback icon="edit" emoji="✏️" className="text-sm" />
                          </button>
                          <button className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <IconWithFallback icon="delete" emoji="🗑️" className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <IconWithFallback icon="event_note" emoji="📅" className="text-gray-400 text-2xl" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-600">
                        {selectedTab === 'today' ? 'No appointments today' : 
                         selectedTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
                      </h3>
                      <p className="text-gray-500">
                        {selectedTab === 'today' 
                          ? 'No appointments scheduled for today'
                          : selectedTab === 'upcoming'
                          ? 'Schedule appointments to see them here'
                          : 'Your appointment history will appear here'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-strong w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">New Appointment</h3>
                <button 
                  onClick={() => setShowNewAppointmentModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                    <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
                      <option>Select Patient</option>
                      <option>Ahmad Rahman</option>
                      <option>Siti Nurhaliza</option>
                      <option>Raj Kumar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                    <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
                      <option>Free-smoking Session</option>
                      <option>General Consultation</option>
                      <option>Follow-up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input type="date" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input type="time" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea rows={3} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" placeholder="Additional notes..."></textarea>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowNewAppointmentModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-medium hover:shadow-strong">
                Create Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}