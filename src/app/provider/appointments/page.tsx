'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Video,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Stethoscope,
  FileText,
  Plus
} from 'lucide-react';

interface Appointment {
  id: string;
  date: string;
  duration: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  reason?: string;
  notes?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    age?: number;
    smokingStatus?: string;
  };
}

interface DayAppointments {
  date: Date;
  dayName: string;
  appointments: Appointment[];
  isToday: boolean;
  isPast: boolean;
}

export default function ProviderAppointmentsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'>('all');
  const [declineTarget, setDeclineTarget] = useState<{ id: string; reason: string } | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<{ id: string; date: string } | null>(null);

  // Fetch appointments
  useEffect(() => {
    fetchAppointments();
  }, [currentMonth]);

  // Restore persisted filters and expanded cards
  useEffect(() => {
    try {
      const savedStatus = localStorage.getItem('providerAppointments.status');
      if (savedStatus && ['all','scheduled','confirmed','in-progress','completed','cancelled'].includes(savedStatus)) {
        setSelectedStatus(savedStatus as any);
      }
      const savedExpanded = localStorage.getItem('providerAppointments.expandedDays');
      if (savedExpanded) {
        const arr: string[] = JSON.parse(savedExpanded);
        setExpandedDays(new Set(arr));
      }
    } catch {}
  }, []);

  // Persist filters and expanded cards
  useEffect(() => {
    try {
      localStorage.setItem('providerAppointments.status', selectedStatus);
      localStorage.setItem('providerAppointments.expandedDays', JSON.stringify(Array.from(expandedDays)));
    } catch {}
  }, [selectedStatus, expandedDays]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      const response = await fetch(`/api/provider/appointments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');

      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Local index by date and status counts for performance
  const dateIndex = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const d = new Date(apt.date).toISOString().split('T')[0];
      const arr = map.get(d) || [];
      arr.push(apt);
      map.set(d, arr);
    }
    return map;
  }, [appointments]);

  const statusCounts = useMemo(() => {
    const counts: Record<'all'|'scheduled'|'confirmed'|'in-progress'|'completed'|'cancelled', number> = {
      all: appointments.length,
      scheduled: 0,
      confirmed: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0,
    };
    for (const a of appointments) {
      counts[a.status]++;
    }
    return counts;
  }, [appointments]);

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Generate calendar days with appointment counts
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Array<{ date: Date; count: number; isCurrentMonth: boolean; isToday: boolean }> = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const allForDay = dateIndex.get(dateStr) || [];
      const dayAppointments = selectedStatus === 'all'
        ? allForDay
        : allForDay.filter(apt => apt.status === selectedStatus);

      days.push({
        date: new Date(currentDate),
        count: dayAppointments.length,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === new Date().toDateString(),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  // Get next 5 days with appointments
  const getNext5Days = (): DayAppointments[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const next5Days: DayAppointments[] = [];
    const currentDate = new Date(today);

    for (let i = 0; i < 5; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const allForDay = dateIndex.get(dateStr) || [];
      const dayAppointments = (selectedStatus === 'all'
        ? allForDay
        : allForDay.filter(apt => apt.status === selectedStatus)
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      next5Days.push({
        date: new Date(currentDate),
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        appointments: dayAppointments,
        isToday: i === 0,
        isPast: false,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return next5Days;
  };

  const toggleDayExpansion = (dateStr: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'start' | 'complete' | 'cancel') => {
    try {
      let newStatus: string;
      switch (action) {
        case 'start':
          newStatus = 'in-progress';
          router.push(`/provider/medical-notes/${appointmentId}`);
          return;
        case 'complete':
          newStatus = 'completed';
          break;
        case 'cancel':
          if (!confirm('Are you sure you want to cancel this appointment?')) return;
          newStatus = 'cancelled';
          break;
        default:
          return;
      }

      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
    }
  };

  // New provider actions
  const acceptAppointment = async (appointmentId: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/accept`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to accept appointment');
      fetchAppointments();
    } catch (err) {
      console.error('Error accepting appointment:', err);
    }
  };

  const declineAppointment = async (appointmentId: string, reason: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/decline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to decline appointment');
      setDeclineTarget(null);
      fetchAppointments();
    } catch (err) {
      console.error('Error declining appointment:', err);
    }
  };

  const rescheduleAppointment = async (appointmentId: string, dateISO: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateISO }),
      });
      if (!res.ok) throw new Error('Failed to reschedule appointment');
      setRescheduleTarget(null);
      fetchAppointments();
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: { icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Scheduled' },
      confirmed: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Confirmed' },
      'in-progress': { icon: Stethoscope, color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'In Progress' },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200', label: 'Completed' },
      cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200', label: 'Cancelled' },
    };

    const badge = badges[status as keyof typeof badges] || badges.scheduled;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  const calendarDays = generateCalendarDays();
  const next5Days = getNext5Days();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Appointment Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your schedule and patient appointments</p>
        </div>
        <button
          onClick={() => router.push('/provider/appointments/new')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 touch-friendly"
        >
          <Plus className="w-5 h-5" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['all','scheduled','confirmed','in-progress','completed','cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSelectedStatus(s)}
            className={`px-3 py-1 rounded-full text-sm border ${
              selectedStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
            }`}
            aria-label={`Filter ${s}`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')} ({(statusCounts as any)[s]})
          </button>
        ))}
      </div>

      {/* Calendar Overview - Compact & Visual */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-friendly"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-friendly"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(day.date)}
              className={`
                relative aspect-square p-2 rounded-xl transition-all duration-200
                ${day.isCurrentMonth ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 opacity-50'}
                ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                ${selectedDate?.toDateString() === day.date.toDateString() ? 'ring-2 ring-purple-500 bg-purple-50' : ''}
                hover:shadow-md touch-friendly
              `}
            >
              <span className={`text-sm font-semibold ${day.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {day.date.getDate()}
              </span>
              
              {/* Appointment count badge */}
              {day.count > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                  <span className={`
                    inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full text-xs font-bold
                    ${day.count >= 5 ? 'bg-red-500 text-white' :
                      day.count >= 3 ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'}
                  `}>
                    {day.count}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-gray-600">1-2 appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span className="text-gray-600">3-4 appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-gray-600">5+ appointments</span>
          </div>
        </div>
      </div>

      {/* 5-Day Preview Cards - Most Important Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Next 5 Days</h2>
          <span className="text-sm text-gray-500">
            Total: {next5Days.reduce((sum, day) => sum + day.appointments.length, 0)} appointments
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
          {next5Days.map((day) => {
            const dateStr = day.date.toISOString().split('T')[0];
            const isExpanded = expandedDays.has(dateStr);
            const hasAppointments = day.appointments.length > 0;

            return (
              <div
                key={dateStr}
                className={`
                  bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-2
                  ${day.isToday ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'}
                `}
              >
                {/* Card Header - Always Visible */}
                <div
                  className={`
                    p-4 border-b-2 cursor-pointer
                    ${day.isToday ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-50 border-gray-100'}
                    ${hasAppointments ? 'hover:bg-gray-100' : ''}
                  `}
                  onClick={() => hasAppointments && toggleDayExpansion(dateStr)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {day.isToday && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                            TODAY
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-gray-900">{day.dayName}</h3>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`
                          inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-sm
                          ${day.appointments.length === 0 ? 'bg-gray-100 text-gray-600' :
                            day.appointments.length <= 3 ? 'bg-green-100 text-green-700' :
                            day.appointments.length <= 6 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'}
                        `}>
                          <Clock className="w-4 h-4" />
                          {day.appointments.length} {day.appointments.length === 1 ? 'appointment' : 'appointments'}
                        </span>
                      </div>
                    </div>
                    
                    {hasAppointments && (
                      <button className="p-1 hover:bg-white rounded-lg transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Summary preview - visible when collapsed */}
                  {!isExpanded && hasAppointments && (
                    <div className="mt-3 space-y-1">
                      {day.appointments.slice(0, 2).map((apt) => (
                        <div key={apt.id} className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-medium">
                            {new Date(apt.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                          <span className="truncate">- {apt.patient.firstName} {apt.patient.lastName}</span>
                        </div>
                      ))}
                      {day.appointments.length > 2 && (
                        <p className="text-xs text-gray-500 italic pl-6">
                          +{day.appointments.length - 2} more...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Empty state */}
                  {!hasAppointments && (
                    <p className="text-sm text-gray-500 mt-2">No appointments scheduled</p>
                  )}
                </div>

                {/* Expanded Appointment Details */}
                {isExpanded && hasAppointments && (
                  <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {day.appointments.map((apt, index) => (
                      <div
                        key={apt.id}
                        className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-gray-200"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          const k = e.key.toLowerCase();
                          if (k === 'a' && apt.status === 'scheduled') {
                            acceptAppointment(apt.id);
                          } else if (k === 'd' && (apt.status === 'scheduled' || apt.status === 'confirmed')) {
                            const reason = window.prompt('Decline reason (optional):') || '';
                            declineAppointment(apt.id, reason);
                          } else if (k === 'r' && apt.status !== 'completed' && apt.status !== 'cancelled') {
                            setRescheduleTarget({ id: apt.id, date: new Date(apt.date).toISOString().slice(0, 16) });
                          } else if (k === 's' && apt.status === 'confirmed') {
                            handleAppointmentAction(apt.id, 'start');
                          } else if (k === 'c' && apt.status === 'in-progress') {
                            handleAppointmentAction(apt.id, 'complete');
                          }
                        }}
                      >
                        {/* Time & Status Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="font-bold text-gray-900">
                              {new Date(apt.date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                            <span className="text-gray-500 text-sm">({apt.duration} min)</span>
                          </div>
                          {getStatusBadge(apt.status)}
                          {(new Date(apt.date).getTime() < Date.now() && apt.status !== 'in-progress' && apt.status !== 'completed' && apt.status !== 'cancelled') && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                              OVERDUE
                            </span>
                          )}
                        </div>

                        {/* Patient Info */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold text-gray-900">
                              {apt.patient.firstName} {apt.patient.lastName}
                            </span>
                            {apt.patient.age && (
                              <span className="text-sm text-gray-500">({apt.patient.age}yo)</span>
                            )}
                          </div>
                          
                          {apt.patient.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-3.5 h-3.5" />
                              <a href={`tel:${apt.patient.phone}`} className="hover:text-blue-600" aria-label="Call patient">
                                {apt.patient.phone}
                              </a>
                            </div>
                          )}

                          {/* Quick contact row */}
                          <div className="flex flex-wrap items-center gap-2 text-sm mt-1">
                            {apt.patient.phone && (
                              <>
                                <a
                                  href={`tel:${apt.patient.phone}`}
                                  className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
                                  aria-label="Call patient"
                                >
                                  Call
                                </a>
                                <a
                                  href={`sms:${apt.patient.phone}`}
                                  className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
                                  aria-label="SMS patient"
                                >
                                  SMS
                                </a>
                                <a
                                  href={`https://wa.me/${apt.patient.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
                                  aria-label="WhatsApp patient"
                                >
                                  WhatsApp
                                </a>
                              </>
                            )}
                            <a
                              href={`mailto:${apt.patient.email}`}
                              className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
                              aria-label="Email patient"
                            >
                              Email
                            </a>
                          </div>

                          {apt.type && (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="w-3.5 h-3.5 text-gray-500" />
                              <span className="font-medium text-gray-700 capitalize">
                                {apt.type.replace('_', ' ')}
                              </span>
                            </div>
                          )}

                          {apt.reason && (
                            <div className="text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-200">
                              <span className="font-medium">Reason: </span>{apt.reason}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                          {apt.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => acceptAppointment(apt.id)}
                                className="flex-1 min-w-[120px] px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 touch-friendly"
                                aria-label="Accept booking"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Accept
                              </button>
                              <button
                                onClick={() => {
                                  const reason = window.prompt('Decline reason (optional):') || '';
                                  declineAppointment(apt.id, reason);
                                }}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium text-sm transition-colors touch-friendly"
                                aria-label="Decline booking"
                              >
                                <XCircle className="w-4 h-4" />
                                Decline
                              </button>
                              {rescheduleTarget?.id === apt.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="datetime-local"
                                    value={rescheduleTarget.date}
                                    onChange={(e) => setRescheduleTarget({ id: apt.id, date: e.target.value })}
                                    className="px-2 py-1 border border-gray-300 rounded"
                                    aria-label="New appointment date"
                                  />
                                  <button
                                    onClick={() => rescheduleAppointment(apt.id, rescheduleTarget.date)}
                                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-sm"
                                    aria-label="Save reschedule"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setRescheduleTarget(null)}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                                    aria-label="Cancel reschedule"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setRescheduleTarget({ id: apt.id, date: new Date(apt.date).toISOString().slice(0, 16) })}
                                  className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg font-medium text-sm transition-colors touch-friendly"
                                  aria-label="Reschedule booking"
                                >
                                  Reschedule
                                </button>
                              )}
                              <a
                                href={`mailto:${apt.patient.email}`}
                                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly border border-gray-200"
                                aria-label="Message patient"
                              >
                                <Mail className="w-4 h-4" />
                                Message
                              </a>
                              <button
                                onClick={() => router.push(`/provider/patients/${apt.patient.id}`)}
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly"
                                aria-label="View profile"
                              >
                                <User className="w-4 h-4" />
                                View Profile
                              </button>
                              <button
                                onClick={() => router.push(`/provider/patients/${apt.patient.id}/emr?tab=today`)}
                                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly border border-gray-200"
                                aria-label="Open EMR"
                              >
                                <FileText className="w-4 h-4" />
                                Open EMR
                              </button>
                            </>
                          )}

                          {apt.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleAppointmentAction(apt.id, 'start')}
                                className="flex-1 min-w-[120px] px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 touch-friendly"
                                aria-label="Start consult"
                              >
                                <Stethoscope className="w-4 h-4" />
                                Start Consult
                              </button>
                              {rescheduleTarget?.id === apt.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="datetime-local"
                                    value={rescheduleTarget.date}
                                    onChange={(e) => setRescheduleTarget({ id: apt.id, date: e.target.value })}
                                    className="px-2 py-1 border border-gray-300 rounded"
                                    aria-label="New appointment date"
                                  />
                                  <button
                                    onClick={() => rescheduleAppointment(apt.id, rescheduleTarget.date)}
                                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-sm"
                                    aria-label="Save reschedule"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setRescheduleTarget(null)}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                                    aria-label="Cancel reschedule"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setRescheduleTarget({ id: apt.id, date: new Date(apt.date).toISOString().slice(0, 16) })}
                                  className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg font-medium text-sm transition-colors touch-friendly"
                                  aria-label="Reschedule booking"
                                >
                                  Reschedule
                                </button>
                              )}
                              <a
                                href={`mailto:${apt.patient.email}`}
                                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly border border-gray-200"
                                aria-label="Message patient"
                              >
                                <Mail className="w-4 h-4" />
                                Message
                              </a>
                              <button
                                onClick={() => router.push(`/provider/patients/${apt.patient.id}`)}
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly"
                                aria-label="View profile"
                              >
                                <User className="w-4 h-4" />
                                View Profile
                              </button>
                              <button
                                onClick={() => router.push(`/provider/patients/${apt.patient.id}/emr?tab=today`)}
                                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly border border-gray-200"
                                aria-label="Open EMR"
                              >
                                <FileText className="w-4 h-4" />
                                Open EMR
                              </button>
                            </>
                          )}

                          {apt.status === 'in-progress' && (
                            <>
                              <button
                                onClick={() => handleAppointmentAction(apt.id, 'complete')}
                                className="flex-1 min-w-[120px] px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 touch-friendly"
                                aria-label="Complete consult"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Complete
                              </button>
                              <button
                                onClick={() => router.push(`/provider/medical-notes/${apt.id}`)}
                                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly border border-gray-200"
                                aria-label="Add order or note"
                              >
                                <FileText className="w-4 h-4" />
                                Add Order/Note
                              </button>
                              <button
                                onClick={() => router.push(`/provider/patients/${apt.patient.id}/emr?tab=today`)}
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly"
                                aria-label="Open EMR"
                              >
                                <FileText className="w-4 h-4" />
                                Open EMR
                              </button>
                            </>
                          )}

                          {apt.status === 'completed' && (
                            <>
                              <button
                                onClick={() => router.push(`/provider/patients/${apt.patient.id}/emr?tab=today`)}
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly"
                                aria-label="Open EMR"
                              >
                                <FileText className="w-4 h-4" />
                                Open EMR
                              </button>
                              <button
                                onClick={() => router.push(`/provider/appointments/new?page=1&patientId=${apt.patient.id}`)}
                                className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium text-sm transition-colors touch-friendly"
                                aria-label="Create follow-up"
                              >
                                Create Follow‑up
                              </button>
                              <button
                                onClick={() => router.push(`/provider/correspondence`)}
                                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-colors touch-friendly border border-gray-200"
                                aria-label="Create letter"
                              >
                                Create Letter
                              </button>
                            </>
                          )}

                          {apt.status === 'cancelled' && (
                            <>
                              <button
                                onClick={() => setAppointments(prev => prev.filter(a => a.id !== apt.id))}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors touch-friendly"
                                aria-label="Archive booking"
                              >
                                Archive/Hide
                              </button>
                              <a
                                href={`mailto:${apt.patient.email}`}
                                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 touch-friendly border border-gray-200"
                                aria-label="Message patient"
                              >
                                <Mail className="w-4 h-4" />
                                Message
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointments List View */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Appointments List</h2>
          <span className="text-sm text-gray-500">
            Showing {(selectedStatus === 'all' ? appointments.length : appointments.filter(a => a.status === selectedStatus).length)} items
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {(selectedStatus === 'all' ? appointments : appointments.filter(a => a.status === selectedStatus))
            .slice()
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((apt) => (
              <div key={apt.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <div className="min-w-[160px]">
                    <div className="font-semibold text-gray-900">
                      {new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                      {new Date(apt.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                    <div className="text-xs text-gray-500">({apt.duration} min)</div>
                  </div>
                  {getStatusBadge(apt.status)}
                  {(new Date(apt.date).getTime() < Date.now() && apt.status !== 'in-progress' && apt.status !== 'completed' && apt.status !== 'cancelled') && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">OVERDUE</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{apt.patient.firstName} {apt.patient.lastName}</span>
                    {apt.type && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                        {apt.type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                    {apt.patient.phone && (
                      <>
                        <a href={`https://wa.me/${apt.patient.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100" aria-label="WhatsApp patient">WhatsApp</a>
                      </>
                    )}
                    <a href={`mailto:${apt.patient.email}`} className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100" aria-label="Email patient">Email</a>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {apt.status === 'scheduled' && (
                    <>
                      <button onClick={() => acceptAppointment(apt.id)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium" aria-label="Accept booking">Accept</button>
                      <button onClick={() => { const reason = window.prompt('Decline reason (optional):') || ''; declineAppointment(apt.id, reason); }} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium" aria-label="Decline booking">Decline</button>
                      <button onClick={() => setRescheduleTarget({ id: apt.id, date: new Date(apt.date).toISOString().slice(0, 16) })} className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium" aria-label="Reschedule booking">Reschedule</button>
                      <button onClick={() => router.push(`/provider/patients/${apt.patient.id}/emr?tab=today`)} className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200" aria-label="Open EMR">Open EMR</button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <>
                      <button onClick={() => handleAppointmentAction(apt.id, 'start')} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium" aria-label="Start consult">Start</button>
                      <button onClick={() => setRescheduleTarget({ id: apt.id, date: new Date(apt.date).toISOString().slice(0, 16) })} className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium" aria-label="Reschedule booking">Reschedule</button>
                      <button onClick={() => router.push(`/provider/patients/${apt.patient.id}/emr?tab=today`)} className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200" aria-label="Open EMR">Open EMR</button>
                    </>
                  )}
                  {apt.status === 'in-progress' && (
                    <>
                      <button onClick={() => handleAppointmentAction(apt.id, 'complete')} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium" aria-label="Complete consult">Complete</button>
                      <button onClick={() => router.push(`/provider/medical-notes/${apt.id}`)} className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200" aria-label="Add order or note">Add Order/Note</button>
                      <button onClick={() => router.push(`/provider/patients/${apt.patient.id}/emr?tab=today`)} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium" aria-label="Open EMR">Open EMR</button>
                    </>
                  )}
                  {apt.status === 'completed' && (
                    <>
                      <button onClick={() => router.push(`/provider/patients/${apt.patient.id}/emr?tab=today`)} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium" aria-label="Open EMR">Open EMR</button>
                      <button onClick={() => router.push(`/provider/appointments/new?page=1&amp;patientId=${apt.patient.id}`)} className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium" aria-label="Create follow-up">Follow‑up</button>
                      <button onClick={() => router.push(`/provider/correspondence`)} className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200" aria-label="Create letter">Letter</button>
                    </>
                  )}
                  {apt.status === 'cancelled' && (
                    <>
                      <button onClick={() => setAppointments(prev => prev.filter(a => a.id !== apt.id))} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium" aria-label="Archive booking">Archive</button>
                      <a href={`mailto:${apt.patient.email}`} className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200" aria-label="Message patient">Message</a>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Today</p>
              <p className="text-3xl font-bold">{next5Days[0]?.appointments.length || 0}</p>
            </div>
            <Calendar className="w-10 h-10 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">This Week</p>
              <p className="text-3xl font-bold">
                {next5Days.reduce((sum, day) => sum + day.appointments.length, 0)}
              </p>
            </div>
            <Clock className="w-10 h-10 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Confirmed</p>
              <p className="text-3xl font-bold">
                {appointments.filter(a => a.status === 'confirmed').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold">
                {appointments.filter(a => a.status === 'scheduled').length}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}