'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, Loader2 } from 'lucide-react';

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
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    specialty?: string;
  };
}

interface FormattedAppointment {
  id: string;
  providerName: string;
  providerSpecialty: string;
  date: Date;
  time: string;
  status: string;
  type: string;
  duration: string;
  location: string;
}

export default function PatientAppointmentsPage() {
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');
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
      
      const status = selectedTab === 'upcoming' ? 'scheduled,confirmed,in-progress' : 'completed,cancelled,no-show';
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

  const cancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel appointment');
      }

      // Refresh appointments after cancellation
      fetchAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('Failed to cancel appointment. Please try again.');
    }
  };

  // Format appointments for display
  const formattedAppointments: FormattedAppointment[] = appointments.map(apt => ({
    id: apt.id,
    providerName: `${apt.provider.firstName} ${apt.provider.lastName}`,
    providerSpecialty: apt.provider.specialty || 'Healthcare Provider',
    date: new Date(apt.date),
    time: new Date(apt.date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    status: apt.status.charAt(0).toUpperCase() + apt.status.slice(1),
    type: apt.type.charAt(0).toUpperCase() + apt.type.slice(1),
    duration: `${apt.duration} minutes`,
    location: apt.meetingLink ? 'Virtual - Google Meet' : 'In-Person'
  }));

  const upcomingAppointments = formattedAppointments.filter(apt =>
    ['Scheduled', 'Confirmed', 'In-progress'].includes(apt.status)
  );
  const pastAppointments = formattedAppointments.filter(apt =>
    !['Scheduled', 'Confirmed', 'In-progress'].includes(apt.status)
  );

  const displayedAppointments = selectedTab === 'upcoming' ? upcomingAppointments : pastAppointments;

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
          <h1 className="text-2xl font-bold text-gray-800">My Appointments</h1>
          <p className="text-gray-600">Manage your healthcare appointments</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
          Schedule New Appointment
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200">
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
          {selectedTab === 'upcoming' ? 'Upcoming Appointments' : 'Past Appointments'}
        </h2>
        
        {displayedAppointments.length > 0 ? (
          <div className="space-y-4">
            {displayedAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-6 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xl">📅</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{appointment.providerName}</h3>
                    <p className="text-sm text-gray-600">{appointment.providerSpecialty}</p>
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
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    appointment.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                    appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'In-progress' ? 'bg-yellow-100 text-yellow-800' :
                    appointment.status === 'Completed' ? 'bg-purple-100 text-purple-800' :
                    appointment.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status}
                  </span>
                  {selectedTab === 'upcoming' && (
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                        Reschedule
                      </button>
                      <button
                        onClick={() => cancelAppointment(appointment.id)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      {appointment.location === 'Virtual - Google Meet' && (
                        <button className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                          Join Meeting
                        </button>
                      )}
                    </div>
                  )}
                  {selectedTab === 'past' && (
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                        View Details
                      </button>
                      <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                        Rate Provider
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {selectedTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
            </h3>
            <p className="text-gray-500">
              {selectedTab === 'upcoming' 
                ? 'Schedule your first appointment to get started'
                : 'Your appointment history will appear here'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}