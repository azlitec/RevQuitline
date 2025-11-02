'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, Video, MapPin, Loader2 } from 'lucide-react';
import IntakeForm from '@/components/patient/IntakeForm';
import { CalendarPicker } from '@/components/ui/CalendarPicker';
import PaymentGuide from '@/components/patient/PaymentGuide';

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
  const [validationWarnings, setValidationWarnings] = useState<any[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);
  const [minimumBookingTime, setMinimumBookingTime] = useState<string>('');
  const [completedIntakeForms, setCompletedIntakeForms] = useState<Set<string>>(new Set());
  const [showPaymentGuide, setShowPaymentGuide] = useState(false);
  const [selectedPaymentAppointment, setSelectedPaymentAppointment] = useState<any>(null);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, string>>({});

  // Simple slot assumptions (can be replaced with real availability later)
  const defaultTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  const [availableSlotsMap, setAvailableSlotsMap] = useState<Record<string, number>>({});

  // Check if we should show booking form based on service parameter
  useEffect(() => {
    if (serviceParam === 'quitline-smoking-cessation') {
      setSelectedService('quitline_smoking_cessation');
      setShowBookingForm(true);
      fetchDoctors();
    }
  }, [serviceParam]);

  // Calculate minimum booking time (30 minutes from now)
  useEffect(() => {
    const now = new Date();
    const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    setMinimumBookingTime(minTime.toTimeString().slice(0, 5)); // HH:MM format
  }, []);

  // Naive available slots map for next 60 days (today depends on minimumBookingTime)
  useEffect(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      if (i === 0) {
        const count = defaultTimes.filter((t) => !minimumBookingTime || t >= minimumBookingTime).length;
        map[dateStr] = count;
      } else {
        map[dateStr] = defaultTimes.length;
      }
    }
    setAvailableSlotsMap(map);
  }, [minimumBookingTime]);

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

      // Fetch all appointments and filter by date on frontend
      // Pass pagination explicitly; API supports page & limit via PaginationSchema
      const response = await fetch(`/api/appointments?page=0&limit=50`);

      if (!response.ok) {
        const detail = `HTTP ${response.status}`;
        throw new Error(`Failed to fetch appointments (${detail})`);
      }

      const envelope = await response.json();
      // Fix: API returns { success: true, data: { items, total, page, pageSize } }
      const items = envelope.data?.items ?? envelope.items ?? envelope.appointments ?? [];
      setAppointments(items);

      // Check intake form status for quitline appointments
      const quitlineAppointments = items.filter((apt: any) => apt.type === 'quitline_smoking_cessation');

      // Check intake form status for each quitline appointment
      for (const appointment of quitlineAppointments) {
        await checkIntakeFormStatus(appointment.id);
      }

      // Check payment status for appointments with price
      const paidAppointments = items.filter((apt: any) => apt.price && apt.price > 0);
      for (const appointment of paidAppointments) {
        await checkPaymentStatus(appointment.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
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

  const checkIntakeFormStatus = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/patient/intake-form?appointmentId=${appointmentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.completed) {
          setCompletedIntakeForms(prev => new Set([...prev, appointmentId]));
        }
      }
    } catch (error) {
      console.error('Error checking intake form status:', error);
    }
  };

  const checkPaymentStatus = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/payment-status`);
      if (response.ok) {
        const data = await response.json();
        setPaymentStatuses(prev => ({
          ...prev,
          [appointmentId]: data.status || 'pending'
        }));
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      // Default to pending if can't check
      setPaymentStatuses(prev => ({
        ...prev,
        [appointmentId]: 'pending'
      }));
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

  const handlePayment = async (appointmentId: string) => {
    try {
      setBookingLoading(true);
      
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to BayarCash payment page
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error || 'Failed to create payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      alert('An error occurred while creating payment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const validateAppointment = async () => {
    try {
      // Combine date and time
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);

      const validationData = {
        date: appointmentDateTime.toISOString(),
        duration: 30, // Default duration
        providerId: selectedDoctor,
      };

      const response = await fetch('/api/appointments/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationData),
      });

      if (!response.ok) {
        throw new Error('Failed to validate appointment');
      }

      const validationResult = await response.json();
      return validationResult;
    } catch (err) {
      console.error('Error validating appointment:', err);
      throw err;
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
      // First validate the appointment
      const validationResult = await validateAppointment();

      if (!validationResult.valid) {
        // Show validation errors
        setBookingError(validationResult.errors[0]?.message || 'Appointment validation failed');
        setBookingLoading(false);
        return;
      }

      // If there are warnings, show them to the user
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        setValidationWarnings(validationResult.warnings);
        setShowValidationModal(true);

        // Store the booking data for later use
        const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
        setPendingBookingData({
          title: `${selectedServiceInfo?.label} with ${doctors.find(d => d.id === selectedDoctor)?.firstName} ${doctors.find(d => d.id === selectedDoctor)?.lastName}`,
          description: notes || undefined,
          date: appointmentDateTime.toISOString(),
          duration: 30,
          type: selectedService,
          serviceName: selectedServiceInfo?.label,
          price: selectedServiceInfo?.price,
          providerId: selectedDoctor,
          meetingLink: undefined,
          reason: notes || undefined
        });

        setBookingLoading(false);
        return;
      }

      // No warnings, proceed with booking
      await proceedWithBooking();

    } catch (err) {
      console.error('Error in booking process:', err);
      setBookingError(err instanceof Error ? err.message : 'Failed to process booking');
      setBookingLoading(false);
    }
  };

  const proceedWithBooking = async (bookingData?: any) => {
    try {
      const dataToUse = bookingData || (() => {
        const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
        return {
          title: `${selectedServiceInfo?.label} with ${doctors.find(d => d.id === selectedDoctor)?.firstName} ${doctors.find(d => d.id === selectedDoctor)?.lastName}`,
          description: notes || undefined,
          date: appointmentDateTime.toISOString(),
          duration: 30,
          type: selectedService,
          serviceName: selectedServiceInfo?.label,
          price: selectedServiceInfo?.price,
          providerId: selectedDoctor,
          meetingLink: undefined,
          reason: notes || undefined
        };
      })();

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToUse),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book appointment');
      }

      const newAppointment = await response.json();

      // Reset form and state
      setSelectedDoctor('');
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      setShowBookingForm(false);
      setShowValidationModal(false);
      setValidationWarnings([]);
      setPendingBookingData(null);

      // Refresh appointments list
      fetchAppointments();

      // If appointment has price, redirect to payment immediately
      if (newAppointment.price && newAppointment.price > 0) {
        // Show success message first
        alert(`Appointment booked successfully! You will now be redirected to payment (RM ${newAppointment.price.toFixed(2)})`);
        
        // Redirect to payment
        try {
          const paymentResponse = await fetch('/api/payment/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ appointmentId: newAppointment.id }),
          });

          const paymentData = await paymentResponse.json();

          if (paymentResponse.ok && paymentData.success) {
            // Redirect to BayarCash payment page
            window.location.href = paymentData.paymentUrl;
          } else {
            alert(`Appointment booked, but payment setup failed: ${paymentData.error}. You can pay later from your appointments page.`);
          }
        } catch (paymentError) {
          console.error('Payment setup error:', paymentError);
          alert('Appointment booked successfully! You can complete payment from your appointments page.');
        }
      } else {
        alert('Appointment booked successfully!');
      }

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

  // Filter based on date/time AND status
  const now = new Date();
  const upcomingAppointments = formattedAppointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    // Upcoming: appointment date is in the future AND status is not cancelled/completed/no-show
    return appointmentDate >= now && !['Cancelled', 'Completed', 'No-show'].includes(apt.status);
  });
  const pastAppointments = formattedAppointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    // Past: appointment date is in the past OR status is cancelled/completed/no-show
    return appointmentDate < now || ['Cancelled', 'Completed', 'No-show'].includes(apt.status);
  });

  const displayedAppointments = selectedTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  // Service options
  const serviceOptions = [
    { value: 'consultation', label: 'General Consultation', price: null },
    { value: 'follow_up', label: 'Follow-up Appointment', price: null },
    { value: 'emergency', label: 'Emergency Consultation', price: null },
    { value: 'quitline_smoking_cessation', label: 'Quitline Free-Smoking Session (INRT)', price: 150 },
    { value: 'psychiatrist_session', label: 'Psychiatrist Session', price: 200 },
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
                <CalendarPicker
                  selectedDate={selectedDate ? new Date(selectedDate) : null}
                  onDateSelect={(date) => {
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const dd = String(date.getDate()).padStart(2, '0');
                    const iso = `${yyyy}-${mm}-${dd}`;
                    setSelectedDate(iso);
                    // Reset time when date changes to recalculate available times
                    setSelectedTime('');
                  }}
                  minDate={new Date()}
                  availableSlots={availableSlotsMap}
                />
                <p className="text-xs text-gray-500 mt-1">
                  📅 Select a date and time at least 30 minutes from now
                </p>
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
                  <option value="09:00" disabled={selectedDate === new Date().toISOString().split('T')[0] && minimumBookingTime > '09:00'}>9:00 AM</option>
                  <option value="10:00" disabled={selectedDate === new Date().toISOString().split('T')[0] && minimumBookingTime > '10:00'}>10:00 AM</option>
                  <option value="11:00" disabled={selectedDate === new Date().toISOString().split('T')[0] && minimumBookingTime > '11:00'}>11:00 AM</option>
                  <option value="14:00" disabled={selectedDate === new Date().toISOString().split('T')[0] && minimumBookingTime > '14:00'}>2:00 PM</option>
                  <option value="15:00" disabled={selectedDate === new Date().toISOString().split('T')[0] && minimumBookingTime > '15:00'}>3:00 PM</option>
                  <option value="16:00" disabled={selectedDate === new Date().toISOString().split('T')[0] && minimumBookingTime > '16:00'}>4:00 PM</option>
                </select>
                {selectedDate === new Date().toISOString().split('T')[0] && (
                  <p className="text-xs text-gray-500 mt-1">
                    📅 Appointments must be booked at least 30 minutes in advance.
                    {minimumBookingTime && ` Earliest available: ${new Date(`1970-01-01T${minimumBookingTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                  </p>
                )}
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

            {/* Payment Summary - Show if service has price */}
            {selectedServiceInfo?.price && (
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-orange-800">Payment Required</h3>
                  <span className="text-2xl font-bold text-orange-600">RM {selectedServiceInfo.price}</span>
                </div>
                <div className="text-sm text-orange-700 space-y-1">
                  <p>• Payment will be processed after booking confirmation</p>
                  <p>• Multiple payment methods available (Card, Online Banking, E-Wallet)</p>
                  <p>• Your appointment will be confirmed after successful payment</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const apt = {
                      title: `${selectedServiceInfo?.label} with ${doctors.find(d => d.id === selectedDoctor)?.firstName} ${doctors.find(d => d.id === selectedDoctor)?.lastName}`,
                      price: selectedServiceInfo.price
                    };
                    setSelectedPaymentAppointment(apt);
                    setShowPaymentGuide(true);
                  }}
                  className="mt-3 text-sm text-orange-600 hover:text-orange-800 font-medium underline"
                >
                  View Payment Guide
                </button>
              </div>
            )}

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
                className={`px-8 py-3 text-white rounded-lg shadow-medium hover:shadow-strong transition-all duration-300 font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2 ${
                  selectedServiceInfo?.price 
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                }`}
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : selectedServiceInfo?.price ? (
                  <span>Book & Pay RM {selectedServiceInfo.price}</span>
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
                      
                      {/* Payment Status Indicator */}
                      {appointments.find(apt => apt.id === appointment.id)?.price && appointments.find(apt => apt.id === appointment.id)?.price > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          paymentStatuses[appointment.id] === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : paymentStatuses[appointment.id] === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {paymentStatuses[appointment.id] === 'paid' ? '✓ Paid' : 
                           paymentStatuses[appointment.id] === 'failed' ? '✗ Payment Failed' : 
                           '⏳ Payment Pending'}
                        </span>
                      )}
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
                      {/* Payment Button - Show if appointment has price and not paid */}
                      {appointments.find(apt => apt.id === appointment.id)?.price && 
                       appointments.find(apt => apt.id === appointment.id)?.price > 0 && 
                       paymentStatuses[appointment.id] !== 'paid' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const apt = appointments.find(a => a.id === appointment.id);
                              setSelectedPaymentAppointment(apt);
                              setShowPaymentGuide(true);
                            }}
                            className="px-4 py-2 border border-orange-600 text-orange-600 rounded-lg text-sm hover:bg-orange-50 transition-all duration-300 font-medium"
                          >
                            Payment Guide
                          </button>
                          <button
                            onClick={() => handlePayment(appointment.id)}
                            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg text-sm hover:from-orange-700 hover:to-orange-800 shadow-medium hover:shadow-strong transition-all duration-300 font-semibold hover:scale-105"
                          >
                            {paymentStatuses[appointment.id] === 'failed' ? 'Retry Payment' : 'Pay Now'} - RM {appointments.find(apt => apt.id === appointment.id)?.price?.toFixed(2)}
                          </button>
                        </div>
                      )}

                      {/* Payment Completed Indicator */}
                      {appointments.find(apt => apt.id === appointment.id)?.price && 
                       appointments.find(apt => apt.id === appointment.id)?.price > 0 && 
                       paymentStatuses[appointment.id] === 'paid' && (
                        <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <span className="text-green-600">✓</span>
                          <span className="text-sm font-medium text-green-700">
                            Payment Completed - RM {appointments.find(apt => apt.id === appointment.id)?.price?.toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      {/* Intake Form Button for Quitline Appointments */}
                      {appointment.type === 'Quitline_smoking_cessation' && (
                        <button
                          onClick={() => {
                            setIntakeFormAppointmentId(appointment.id);
                            setShowIntakeForm(true);
                          }}
                          className={`px-6 py-2 rounded-lg text-sm font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 ${
                            completedIntakeForms.has(appointment.id)
                              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                              : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                          }`}
                        >
                          {completedIntakeForms.has(appointment.id) ? 'Completed (view)' : 'Complete Intake Form'}
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
            // Mark this appointment as having completed intake form
            setCompletedIntakeForms(prev => new Set([...prev, intakeFormAppointmentId]));
            // Refresh appointments to show updated status
            fetchAppointments();
          }}
          onClose={() => {
            setShowIntakeForm(false);
            setIntakeFormAppointmentId(null);
            // Refresh to get latest status
            fetchAppointments();
          }}
        />
      )}

      {/* Validation Warning Modal */}
      {showValidationModal && validationWarnings.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-strong w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">Appointment Booking Confirmation</h3>
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setValidationWarnings([]);
                    setPendingBookingData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-xl">⚠️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Please Review Before Booking</h4>
                    <p className="text-sm text-gray-600">We found some potential scheduling conflicts</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {validationWarnings.map((warning, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      warning.severity === 'error' ? 'bg-red-50 border-red-200' :
                      warning.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <span className={`text-lg ${
                          warning.severity === 'error' ? 'text-red-600' :
                          warning.severity === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          {warning.severity === 'error' ? '❌' :
                           warning.severity === 'warning' ? '⚠️' : 'ℹ️'}
                        </span>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            warning.severity === 'error' ? 'text-red-800' :
                            warning.severity === 'warning' ? 'text-yellow-800' :
                            'text-blue-800'
                          }`}>
                            {warning.message}
                          </p>

                          {/* Show additional details for specific warning types */}
                          {warning.type === 'too_soon' && warning.minimumTime && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="font-medium">Minimum booking time:</p>
                              <p className="mt-1">
                                {new Date(warning.minimumTime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>
                          )}

                          {warning.type === 'same_day_multiple' && warning.existingAppointments && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="font-medium">Existing appointments today:</p>
                              <ul className="list-disc list-inside mt-1">
                                {warning.existingAppointments.map((apt: any, idx: number) => (
                                  <li key={idx}>
                                    {new Date(apt.date).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })} - {apt.type} ({apt.status})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {warning.type === 'busy_schedule' && warning.nearbyAppointments && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="font-medium">Nearby appointments:</p>
                              <ul className="list-disc list-inside mt-1">
                                {warning.nearbyAppointments.map((apt: any, idx: number) => (
                                  <li key={idx}>
                                    {new Date(apt.date).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })} - Dr. {apt.provider} ({apt.specialty})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary in Confirmation Modal */}
              {pendingBookingData?.price && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-orange-800 mb-2">Payment Required</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700">Total Amount:</span>
                    <span className="text-xl font-bold text-orange-600">RM {pendingBookingData.price}</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-2">
                    You will be redirected to payment after booking confirmation.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setValidationWarnings([]);
                    setPendingBookingData(null);
                  }}
                  className="px-4 md:px-6 py-2 text-sm md:text-base text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors touch-friendly"
                >
                  Cancel Booking
                </button>
                <button
                  onClick={() => proceedWithBooking(pendingBookingData)}
                  className={`px-6 md:px-8 py-2 text-sm md:text-base text-white rounded-lg shadow-medium hover:shadow-strong touch-friendly font-medium transition-colors ${
                    pendingBookingData?.price 
                      ? 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800'
                      : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                  }`}
                >
                  {pendingBookingData?.price ? `Book & Pay RM ${pendingBookingData.price}` : 'Proceed with Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Guide Modal */}
      <PaymentGuide
        isOpen={showPaymentGuide}
        onClose={() => {
          setShowPaymentGuide(false);
          setSelectedPaymentAppointment(null);
        }}
        amount={selectedPaymentAppointment?.price}
        appointmentTitle={selectedPaymentAppointment?.title}
      />
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