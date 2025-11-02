'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, CheckCircle } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export default function NewAppointmentPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [patientId, setPatientId] = useState('');
  const [type, setType] = useState('consultation');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/provider/patients');
        if (!res.ok) throw new Error('Failed to load patients');
        const data = await res.json();
        setPatients(data.patients || []);
      } catch (e) {
        console.error('Error fetching patients:', e);
        setError('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };
    if (session?.user?.isProvider) {
      fetchPatients();
    } else {
      setLoading(false);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!patientId || !date || !time) {
        setError('Please select patient, date and time');
        setSubmitting(false);
        return;
      }

      const payload = {
        patientId,
        date: new Date(`${date}T${time}`).toISOString(),
        duration: parseInt(duration, 10) || 30,
        type,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/provider/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create appointment');
      }

      router.push('/provider/appointments');
    } catch (e) {
      console.error('Create appointment error:', e);
      setError(e instanceof Error ? e.message : 'Failed to create appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session?.user?.isProvider) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto bg-red-50 text-red-700 rounded-xl border border-red-200 p-4">
          <p className="font-semibold">Unauthorized</p>
          <p className="text-sm">You must be a provider to create appointments.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto flex items-center gap-3 text-gray-600">
          <div className="animate-spin">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <span>Loading patients...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">New Appointment</h1>
          </div>
          <button
            onClick={() => router.push('/provider/appointments')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} {p.phone ? `• ${p.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Service type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="emergency">Emergency</option>
                <option value="quitline_smoking_cessation">Quitline Smoking Cessation</option>
                <option value="psychiatrist_session">Psychiatrist Session</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
                <option value="60">60</option>
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., persistent cough"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional notes for this appointment..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/provider/appointments')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}