'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, Loader2, CheckCircle, XCircle, PlayCircle, User } from 'lucide-react';

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
  date: Date;
  time: string;
  status: string;
  type: string;
  duration: string;
  location: string;
  rawStatus: string;
}

export default function ProviderAppointmentsPage() {
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, [selectedTab]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let status = '';
      if (selectedTab === 'today') {
        status = 'scheduled,confirmed';
      } else if (selectedTab === 'upcoming') {
        status = 'scheduled,confirmed';
      } else {
        status = 'completed,cancelled,no-show,in-progress';
      }
      
      const response = await fetch(`/api/appointments?status=${status}`);
      
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

  // Format appointments for display
  const formattedAppointments: FormattedAppointment[] = appointments.map(apt => ({
    id: apt.id,
    patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
    patientEmail: apt.patient.email,
    date: new Date(apt.date),
    time: new Date(apt.date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    status: apt.status.charAt(0).toUpperCase() + apt.status.slice(1),
    type: apt.type.charAt(0).toUpperCase() + apt.type.slice(1),
    duration: `${apt.duration} minutes`,
    location: apt.meetingLink ? 'Virtual - Google Meet' : 'In-Person',
    rawStatus: apt.status
  }));

  // Filter appointments based on selected tab
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const filteredAppointments = formattedAppointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (selectedTab === 'today') {
      return appointmentDate.getTime() === today.getTime() && 
             ['scheduled', 'confirmed'].includes(apt.rawStatus);
    } else if (selectedTab === 'upcoming') {
      return appointmentDate.getTime() >= tomorrow.getTime() && 
             ['scheduled', 'confirmed'].includes(apt.rawStatus);
    } else {
      return ['completed', 'cancelled', 'no-show', 'in-progress'].includes(apt.rawStatus);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'in-progress': return <PlayCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto mt-8">
        <h2 className="text-xl font-bold mb-4">Error Loading Appointments</h2>
        <p>{error}</p>
        <button 
          onClick={fetchAppointments}
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
          <h1 className="text-2xl font-bold text-gray-800">Appointment Management</h1>
          <p className="text-gray-600">Manage your patient appointments and workflow</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
          Create New Appointment
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          className={`pb-2 px-4 font-medium ${
            selectedTab === 'today'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('today')}
        >
          Today's Appointments
        </button>
        <button
          className={`pb-2 px-4 font-medium ${
            selectedTab === 'upcoming'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`pb-2 px-4 font-medium ${
            selectedTab === 'past'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('past')}
        >
          Past
        </button>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {selectedTab === 'today' ? "Today's Appointments" : 
           selectedTab === 'upcoming' ? 'Upcoming Appointments' : 'Past Appointments'}
        </h2>
        
        {filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-6 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{appointment.patientName}</h3>
                    <p className="text-sm text-gray-600">{appointment.patientEmail}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-500">
                        {new Intl.DateTimeFormat('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        }).format(appointment.date)} at {appointment.time}
                      </span>
                      <span className="text-sm text-gray-500">• {appointment.duration}</span>
                      <span className="text-sm text-gray-500">• {appointment.location}</span>
                      <span className="text-sm text-gray-500">• {appointment.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(appointment.rawStatus)}`}>
                    {getStatusIcon(appointment.rawStatus)}
                    <span>{appointment.status}</span>
                  </span>
                  
                  {/* Status Management Buttons */}
                  {selectedTab !== 'past' && (
                    <div className="flex space-x-2">
                      {appointment.rawStatus === 'scheduled' && (
                        <button 
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                        >
                          Confirm
                        </button>
                      )}
                      {appointment.rawStatus === 'confirmed' && (
                        <button 
                          onClick={() => updateAppointmentStatus(appointment.id, 'in-progress')}
                          className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700"
                        >
                          Start
                        </button>
                      )}
                      {appointment.rawStatus === 'in-progress' && (
                        <button 
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
                        >
                          Complete
                        </button>
                      )}
                      {(appointment.rawStatus === 'scheduled' || appointment.rawStatus === 'confirmed') && (
                        <button 
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      )}
                      {appointment.location === 'Virtual - Google Meet' && appointment.rawStatus === 'confirmed' && (
                        <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                          Join Meeting
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
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
        )}
      </div>
    </div>
  );
}