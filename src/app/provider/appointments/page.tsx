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
  date: string;
  duration: number;
  type: string;
  status: string;
  reason?: string;
  notes?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    smokingStatus?: string;
  };
}

export default function ProviderAppointmentsPage() {
  const { data: session } = useSession();
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (session?.user?.isProvider) {
      fetchAppointments();
      fetchPatients();
    }
  }, [selectedTab, session?.user?.isProvider]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters based on selected tab
      const params = new URLSearchParams();
      
      if (selectedTab === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('date', today);
      } else if (selectedTab === 'upcoming') {
        params.append('status', 'scheduled,confirmed');
      } else {
        params.append('status', 'completed,cancelled,no-show');
      }

      const response = await fetch(`/api/provider/appointments?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/provider/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment status');
      }

      // Refresh appointments after update
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const createAppointment = async (formData: FormData) => {
    try {
      const appointmentData = {
        patientId: formData.get('patientId'),
        date: new Date(`${formData.get('date')}T${formData.get('time')}`).toISOString(),
        duration: parseInt(formData.get('duration') as string) || 30,
        type: formData.get('type') || 'consultation',
        notes: formData.get('notes') || ''
      };

      const response = await fetch('/api/provider/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }

      // Refresh appointments after creation
      fetchAppointments();
      setShowNewAppointmentModal(false);
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
    }
  };

  // Format appointments for display
  const formattedAppointments = appointments.map(apt => {
    const firstName = apt.patient.firstName || '';
    const lastName = apt.patient.lastName || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    
    // Calculate fees based on type
    const fees = {
      'consultation': 150,
      'follow-up': 100,
      'emergency': 200
    };
    
    const fee = fees[apt.type as keyof typeof fees] || 80;
    
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
      type: apt.type.charAt(0).toUpperCase() + apt.type.slice(1),
      duration: `${apt.duration} mins`,
      location: 'In-Person',
      rawStatus: apt.status,
      fee: `RM ${fee}.00`,
      phone: apt.patient.phone || ''
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
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Appointments Management</h2>
          <p className="text-sm md:text-base text-gray-500">Manage and track all patient appointments</p>
        </div>
        <button
          onClick={() => setShowNewAppointmentModal(true)}
          className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly"
        >
          <IconWithFallback icon="add" emoji="➕" className="text-white" />
          <span className="hidden sm:inline">New Appointment</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Appointment Filters */}
      <div className="card p-4 md:p-6 mb-6 md:mb-8 shadow-soft">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Date Range</label>
            <input type="date" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Status</label>
            <select className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly">
              <option>All Status</option>
              <option>Scheduled</option>
              <option>Confirmed</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Service Type</label>
            <select className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly">
              <option>All Services</option>
              <option>Consultation</option>
              <option>Follow-up</option>
              <option>Emergency</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full bg-gray-100 text-gray-700 p-2 md:p-3 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly">
              <IconWithFallback icon="filter_list" emoji="🔽" className="text-gray-600" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4 md:mb-6 w-full md:w-fit overflow-x-auto">
        {[
          { key: 'today', label: "Today's Appointments", shortLabel: "Today", icon: 'today', emoji: '📅' },
          { key: 'upcoming', label: 'Upcoming', shortLabel: "Upcoming", icon: 'upcoming', emoji: '⏰' },
          { key: 'past', label: 'Past', shortLabel: "Past", icon: 'history', emoji: '📜' }
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-3 md:px-6 py-2 md:py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-1 md:space-x-2 text-sm md:text-base whitespace-nowrap touch-friendly ${
              selectedTab === tab.key
                ? 'bg-white text-blue-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 active:bg-white/70'
            }`}
            onClick={() => setSelectedTab(tab.key as any)}
          >
            <IconWithFallback
              icon={tab.icon}
              emoji={tab.emoji}
              className={selectedTab === tab.key ? 'text-blue-600' : 'text-gray-500'}
            />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="card p-3 md:p-6 shadow-soft">
        {/* Desktop Table View */}
        <div className="hidden lg:block">
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
                              <p className="text-sm text-gray-500">{appointment.phone}</p>
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
                            {/* Status Management Buttons */}
                            {selectedTab !== 'past' && (
                              <>
                                {appointment.rawStatus === 'scheduled' && (
                                  <button
                                    onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                                    className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {appointment.rawStatus === 'confirmed' && (
                                  <button
                                    onClick={() => updateAppointmentStatus(appointment.id, 'in-progress')}
                                    className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 transition-colors"
                                  >
                                    Start
                                  </button>
                                )}
                                {appointment.rawStatus === 'in-progress' && (
                                  <button
                                    onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                    className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors"
                                  >
                                    Complete
                                  </button>
                                )}
                              </>
                            )}
                            
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

        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {filteredAppointments.length > 0 ? (
            <div className="space-y-3">
              {filteredAppointments.map((appointment) => {
                const statusIcon = getStatusIcon(appointment.rawStatus);
                return (
                  <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    {/* Patient Info Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 patient-avatar rounded-full flex items-center justify-center text-white font-semibold shadow-soft text-sm">
                          {appointment.patientInitials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{appointment.patientName}</p>
                          <p className="text-xs text-gray-500">{appointment.phone}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
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
                    </div>

                    {/* Appointment Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Service</p>
                        <p className="font-medium text-gray-800">{appointment.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fee</p>
                        <p className="font-semibold text-gray-800">{appointment.fee}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                        <p className="font-medium text-gray-800 text-xs">
                          {appointment.date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-500">{appointment.time}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                        <p className="font-medium text-gray-800">{appointment.duration}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                      {/* Status Management Buttons */}
                      {selectedTab !== 'past' && (
                        <>
                          {appointment.rawStatus === 'scheduled' && (
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 active:bg-green-800 transition-colors touch-friendly font-medium"
                            >
                              Confirm
                            </button>
                          )}
                          {appointment.rawStatus === 'confirmed' && (
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'in-progress')}
                              className="px-3 py-1.5 bg-yellow-600 text-white rounded-md text-xs hover:bg-yellow-700 active:bg-yellow-800 transition-colors touch-friendly font-medium"
                            >
                              Start
                            </button>
                          )}
                          {appointment.rawStatus === 'in-progress' && (
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs hover:bg-purple-700 active:bg-purple-800 transition-colors touch-friendly font-medium"
                            >
                              Complete
                            </button>
                          )}
                        </>
                      )}
                      
                      <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors touch-friendly" title="View">
                        <IconWithFallback icon="visibility" emoji="👁️" className="text-sm" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors touch-friendly" title="Edit">
                        <IconWithFallback icon="edit" emoji="✏️" className="text-sm" />
                      </button>
                      <button className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-friendly" title="Delete">
                        <IconWithFallback icon="delete" emoji="🗑️" className="text-sm" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <IconWithFallback icon="event_note" emoji="📅" className="text-gray-400 text-2xl" />
                </div>
                <h3 className="text-base md:text-lg font-medium text-gray-600">
                  {selectedTab === 'today' ? 'No appointments today' :
                   selectedTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedTab === 'today'
                    ? 'No appointments scheduled for today'
                    : selectedTab === 'upcoming'
                    ? 'Schedule appointments to see them here'
                    : 'Your appointment history will appear here'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-strong w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">New Appointment</h3>
                <button
                  onClick={() => setShowNewAppointmentModal(false)}
                  className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createAppointment(formData);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Patient</label>
                    <select
                      name="patientId"
                      required
                      className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Service</label>
                    <select
                      name="type"
                      className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    >
                      <option value="consultation">Consultation</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Date</label>
                    <input
                      type="date"
                      name="date"
                      required
                      className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Time</label>
                    <input
                      type="time"
                      name="time"
                      required
                      className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Duration (minutes)</label>
                    <select
                      name="duration"
                      defaultValue="30"
                      className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    placeholder="Additional notes..."
                  ></textarea>
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewAppointmentModal(false)}
                    className="px-4 md:px-6 py-2 text-sm md:text-base text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors touch-friendly"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 md:px-6 py-2 text-sm md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong touch-friendly"
                  >
                    Create Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}