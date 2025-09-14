'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, Video, MapPin, Loader2 } from 'lucide-react';
import IntakeForm from '@/components/patient/IntakeForm';

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

function PatientAppointmentsContent() {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get('service');

  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [intakeFormAppointmentId, setIntakeFormAppointmentId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>('consultation');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Check if we should show booking form based on service parameter
  useEffect(() => {
    if (serviceParam === 'quitline-smoking-cessation') {
      setSelectedService('quitline_smoking_cessation');
      setShowBookingForm(true);
      fetchDoctors();
    }
  }, [serviceParam]);

  // Fetch doctors when booking form is shown
  useEffect(() => {
    if (showBookingForm) {
      fetchDoctors();
    }
  }, [showBookingForm]);

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

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/patient/doctors');
      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }
      const data = await response.json();
      setDoctors(data.doctors || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setDoctors([]); // Set empty array instead of mock data
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    // Validation
    if (!selectedDoctor) {
      setBookingError('Please select a doctor');
      return;
    }
    if (!selectedDate) {
      setBookingError('Please select a date');
      return;
    }
    if (!selectedTime) {
      setBookingError('Please select a time');
      return;
    }

    setBookingLoading(true);

    try {
      // Combine date and time
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);

      const appointmentData = {
        title: `${selectedServiceInfo?.label} with ${doctors.find(d => d.id === selectedDoctor)?.firstName} ${doctors.find(d => d.id === selectedDoctor)?.lastName}`,
        description: notes || undefined,
        date: appointmentDateTime.toISOString(),
        duration: 30, // Default duration
        type: selectedService,
        serviceName: selectedServiceInfo?.label,
        price: selectedServiceInfo?.price,
        providerId: selectedDoctor,
        meetingLink: undefined, // Will be set later if virtual
        reason: notes || undefined
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book appointment');
      }

      const newAppointment = await response.json();

      // Reset form
      setSelectedDoctor('');
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      setShowBookingForm(false);

      // Refresh appointments list
      fetchAppointments();

      alert('Appointment booked successfully!');

    } catch (err) {
      console.error('Error booking appointment:', err);
      setBookingError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
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

  // Service options
  const serviceOptions = [
    { value: 'consultation', label: 'General Consultation', price: null },
    { value: 'follow_up', label: 'Follow-up Appointment', price: null },
    { value: 'emergency', label: 'Emergency Consultation', price: null },
    { value: 'quitline_smoking_cessation', label: 'Quitline Free-Smoking Session (INRT)', price: 150 },
  ];

  const selectedServiceInfo = serviceOptions.find(s => s.value === selectedService);

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
          <h1 className="text-2xl font-bold gradient-text">My Appointments</h1>
          <p className="text-gray-600 flex items-center">
            Manage your healthcare appointments
            <span className="ml-2 text-sm text-gray-400">•</span>
            <span className="ml-2 text-sm text-blue-600 font-medium">{upcomingAppointments.length} upcoming</span>
          </p>
        </div>
        <button
          onClick={() => {
            setShowBookingForm(true);
            setSelectedService('consultation');
            fetchDoctors();
          }}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105"
        >
          Schedule New Appointment
        </button>
      </div>

      {/* Enhanced Booking Form */}
      {showBookingForm && (
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-strong border border-gray-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold gradient-text">Book New Appointment</h2>
            <button
              onClick={() => setShowBookingForm(false)}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
                disabled={serviceParam === 'quitline-smoking-cessation'}
              >
                {serviceOptions.map((service) => (
                  <option key={service.value} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
              {selectedServiceInfo?.price && (
                <div className="mt-3 bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-semibold">
                    💰 Session Price: RM {selectedServiceInfo.price}
                  </p>
                </div>
              )}
            </div>

            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
              >
                <option value="">Choose a doctor...</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.firstName} {doctor.lastName} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
                >
                  <option value="">Select time...</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white resize-none"
                placeholder="Any specific concerns or information you'd like to share..."
              />
            </div>

            {/* Error Display */}
            {bookingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm font-medium">{bookingError}</p>
              </div>
            )}

            {/* Enhanced Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowBookingForm(false)}
                disabled={bookingLoading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bookingLoading}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-medium hover:shadow-strong transition-all duration-300 font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2"
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Booking...</span>
                  </>
                ) : (
                  <span>Book Appointment</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Enhanced Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          className={`flex-1 py-3 px-6 font-semibold rounded-md transition-all duration-300 ${
            selectedTab === 'upcoming'
              ? 'bg-white text-green-600 shadow-medium'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
          onClick={() => setSelectedTab('upcoming')}
        >
          Upcoming ({upcomingAppointments.length})
        </button>
        <button
          className={`flex-1 py-3 px-6 font-semibold rounded-md transition-all duration-300 ${
            selectedTab === 'past'
              ? 'bg-white text-green-600 shadow-medium'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
          onClick={() => setSelectedTab('past')}
        >
          Past ({pastAppointments.length})
        </button>
      </div>

      {/* Enhanced Appointments List */}
      <div className="bg-white rounded-xl p-6 md:p-8 shadow-strong border border-gray-100 hover:shadow-xl transition-all duration-300">
        <h2 className="text-xl md:text-2xl font-bold gradient-text mb-6">
          {selectedTab === 'upcoming' ? 'Upcoming Appointments' : 'Past Appointments'}
        </h2>

        {displayedAppointments.length > 0 ? (
          <div className="space-y-4">
            {displayedAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-6 rounded-xl border border-gray-200 hover:border-blue-300 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 shadow-medium hover:shadow-strong hover:scale-102"
              >
                <div className="flex items-center space-x-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-green-600 text-2xl">📅</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">{appointment.providerName}</h3>
                    <p className="text-sm text-gray-600 font-medium">{appointment.providerSpecialty}</p>
                    <div className="flex items-center space-x-4 mt-3">
                      <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                        {new Intl.DateTimeFormat('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        }).format(appointment.date)} at {appointment.time}
                      </span>
                      <span className="text-sm text-gray-600">• {appointment.duration}</span>
                      <span className="text-sm text-gray-600">• {appointment.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                    appointment.status === 'Scheduled' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' :
                    appointment.status === 'Confirmed' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' :
                    appointment.status === 'In-progress' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800' :
                    appointment.status === 'Completed' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800' :
                    appointment.status === 'Cancelled' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800' :
                    'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                  }`}>
                    {appointment.status}
                  </span>
                  {selectedTab === 'upcoming' && (
                    <div className="flex space-x-2">
                      {/* Intake Form Button for Quitline Appointments */}
                      {appointment.type === 'Quitline_smoking_cessation' && (
                        <button
                          onClick={() => {
                            setIntakeFormAppointmentId(appointment.id);
                            setShowIntakeForm(true);
                          }}
                          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm hover:from-purple-700 hover:to-purple-800 shadow-medium hover:shadow-strong transition-all duration-300 font-semibold hover:scale-105"
                        >
                          Complete Intake Form
                        </button>
                      )}
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-blue-400 transition-all duration-300 font-medium">
                        Reschedule
                      </button>
                      <button
                        onClick={() => cancelAppointment(appointment.id)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:border-red-400 transition-all duration-300 font-medium"
                      >
                        Cancel
                      </button>
                      {appointment.location === 'Virtual - Google Meet' && (
                        <button className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-sm hover:from-green-700 hover:to-green-800 shadow-medium hover:shadow-strong transition-all duration-300 font-semibold hover:scale-105">
                          Join Meeting
                        </button>
                      )}
                    </div>
                  )}
                  {selectedTab === 'past' && (
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 font-medium">
                        View Details
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-300 font-medium">
                        Rate Provider
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
              <span className="text-4xl">📅</span>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-3">
              {selectedTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
            </h3>
            <p className="text-gray-500 text-lg mb-6">
              {selectedTab === 'upcoming'
                ? 'Schedule your first appointment to get started'
                : 'Your appointment history will appear here'
              }
            </p>
            {selectedTab === 'upcoming' && (
              <button
                onClick={() => {
                  setShowBookingForm(true);
                  setSelectedService('consultation');
                  fetchDoctors();
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105"
              >
                Schedule Your First Appointment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Intake Form Modal */}
      {showIntakeForm && intakeFormAppointmentId && (
        <IntakeForm
          appointmentId={intakeFormAppointmentId}
          onComplete={(data) => {
            console.log('Intake form completed:', data);
            setShowIntakeForm(false);
            setIntakeFormAppointmentId(null);
            // Refresh appointments to show updated status
            fetchAppointments();
          }}
          onClose={() => {
            setShowIntakeForm(false);
            setIntakeFormAppointmentId(null);
          }}
        />
      )}
    </div>
  );
}

export default function PatientAppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    }>
      <PatientAppointmentsContent />
    </Suspense>
  );
}