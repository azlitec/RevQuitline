'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

import { RefreshCw, HelpCircle } from 'lucide-react';

// Enhanced Icon component with fallbacks
const IconWithFallback = ({ icon, emoji, className = '' }: {
  icon: string;
  emoji: string;
  className?: string;
}) => {
  return (
    <span className={`icon-container ${className}`}>
      <HelpCircle />
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
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    smokingStatus?: string;
  };
}

interface MedicalNote {
  id?: string;
  appointmentId: string;
  patientId: string;
  title: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  medications: string;
  allergies: string;
  socialHistory: string;
  familyHistory: string;
  reviewOfSystems: string;
  physicalExamination: string;
  assessment: string;
  plan: string;
  followUpInstructions: string;
  prescriptions: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function MedicalNotesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.appointmentId as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [medicalNote, setMedicalNote] = useState<MedicalNote | null>(null);
  const [intakeForm, setIntakeForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<MedicalNote>({
    appointmentId,
    patientId: '',
    title: '',
    chiefComplaint: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    medications: '',
    allergies: '',
    socialHistory: '',
    familyHistory: '',
    reviewOfSystems: '',
    physicalExamination: '',
    assessment: '',
    plan: '',
    followUpInstructions: '',
    prescriptions: ''
  });

  useEffect(() => {
    if (session?.user?.isProvider && appointmentId) {
      fetchAppointment();
      fetchMedicalNote();
      fetchIntakeForm();
    }
  }, [session, appointmentId]);

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/provider/appointments/${appointmentId}`);
      if (response.ok) {
        const data = await response.json();
        setAppointment(data.appointment);
        setFormData(prev => ({
          ...prev,
          patientId: data.appointment.patientId
        }));
      }
    } catch (err) {
      console.error('Error fetching appointment:', err);
    }
  };

  const fetchMedicalNote = async () => {
    try {
      const response = await fetch(`/api/provider/medical-notes/${appointmentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.medicalNote) {
          setMedicalNote(data.medicalNote);
          setFormData(data.medicalNote);
        }
      }
    } catch (err) {
      console.error('Error fetching medical note:', err);
    }
  };

  const fetchIntakeForm = async () => {
    try {
      const response = await fetch(`/api/provider/intake-forms/${appointmentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.intakeForm) {
          setIntakeForm(data.intakeForm);
        }
      }
    } catch (err) {
      console.error('Error fetching intake form:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof MedicalNote, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = medicalNote ? 'PUT' : 'POST';
      const response = await fetch('/api/provider/medical-notes', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setMedicalNote(data.medicalNote);
        alert('Patient history saved successfully!');
      } else {
        throw new Error('Failed to save medical note');
      }
    } catch (err) {
      console.error('Error saving medical note:', err);
      alert('Failed to save patient history. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (response.ok) {
        alert('Appointment completed successfully!');
        router.push('/provider/appointments');
      } else {
        throw new Error('Failed to complete appointment');
      }
    } catch (err) {
      console.error('Error completing appointment:', err);
      alert('Failed to complete appointment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <RefreshCw className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading medical notes...</span>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto mt-8">
        <h2 className="text-xl font-bold mb-4">Appointment Not Found</h2>
        <p>Unable to load appointment details.</p>
        <button
          onClick={() => router.push('/provider/appointments')}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Back to Appointments
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Patient History</h1>
          <p className="text-gray-600 flex items-center">
            Document patient consultation
            <span className="ml-2 text-sm text-gray-400">•</span>
            <span className="ml-2 text-sm text-blue-600 font-medium">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </span>
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/provider/appointments')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
          >
            Back to Appointments
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-300"
          >
            {saving ? 'Saving...' : 'Save Patient History'}
          </button>
          <button
            onClick={handleCompleteAppointment}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300"
          >
            Complete Appointment
          </button>
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white rounded-xl p-6 shadow-strong border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-800">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-800">{appointment.patient.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium text-gray-800">{appointment.patient.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Appointment Date</p>
            <p className="font-medium text-gray-800">
              {new Date(appointment.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Intake Form Data (for Quitline Sessions) */}
      {appointment?.type === 'quitline_smoking_cessation' && intakeForm && (
        <div className="bg-white rounded-xl p-6 shadow-strong border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Patient Intake Form Data</h2>

          {intakeForm.formData && (
            <div className="space-y-6">
              {/* Personal Details */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Birth Date</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.birthDate || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ethnicity</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.ethnicity || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Country</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.country || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Smoking History */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Smoking History & Habits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Duration of Smoking</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.smokingDuration || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cigarettes Per Day</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.cigarettesPerDay || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Smoking Triggers</p>
                    <p className="font-medium text-gray-800">
                      {intakeForm.formData.smokingTriggers?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Social Triggers</p>
                    <p className="font-medium text-gray-800">
                      {intakeForm.formData.socialTriggers?.join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Health & Quit Attempts */}
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Health & Past Quit Attempts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Past Quit Attempts</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.pastQuitAttempts || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quit Methods Used</p>
                    <p className="font-medium text-gray-800">
                      {intakeForm.formData.quitMethods?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Health Issues</p>
                    <p className="font-medium text-gray-800">
                      {intakeForm.formData.healthIssues?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Health Risk Awareness</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.healthRiskAwareness || 'N/A'}/10</p>
                  </div>
                </div>
              </div>

              {/* Motivation & Support */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Motivation & Support System</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Quit Reasons</p>
                    <p className="font-medium text-gray-800">
                      {intakeForm.formData.quitReasons?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Motivation Level</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.motivationLevel || 'N/A'}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Smoker Friends/Family</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.smokerFriendsFamily || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Support People</p>
                    <p className="font-medium text-gray-800">
                      {intakeForm.formData.supportPeople?.join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Treatment Preferences */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Treatment Preferences & Goals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nicotine Replacement Interest</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.nicotineReplacementInterest || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pharmacological Interest</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.pharmacologicalInterest || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stress Coping Strategies</p>
                    <p className="font-medium text-gray-800">
                      {intakeForm.formData.stressCopingStrategies?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Follow-up Interest</p>
                    <p className="font-medium text-gray-800">{intakeForm.formData.followUpInterest || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Form Status:</strong> {intakeForm.completed ? 'Completed' : 'In Progress'} |
                  <strong> Completed At:</strong> {intakeForm.completedAt ? new Date(intakeForm.completedAt).toLocaleString() : 'Not completed yet'}
                </p>
              </div>
            </div>
          )}

          {!intakeForm.formData && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="text-gray-400 text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Intake Form Data</h3>
              <p className="text-gray-500">Patient has not completed the intake form yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Medical Notes Form */}
      <div className="bg-white rounded-xl p-6 shadow-strong border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Medical Documentation</h2>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Initial Consultation - Smoking Cessation"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
            <textarea
              rows={3}
              value={formData.chiefComplaint}
              onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
              placeholder="Patient's main reason for visit..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* History of Present Illness */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">History of Present Illness</label>
            <textarea
              rows={4}
              value={formData.historyOfPresentIllness}
              onChange={(e) => handleInputChange('historyOfPresentIllness', e.target.value)}
              placeholder="Detailed history of current condition..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Past Medical History */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Past Medical History</label>
            <textarea
              rows={3}
              value={formData.pastMedicalHistory}
              onChange={(e) => handleInputChange('pastMedicalHistory', e.target.value)}
              placeholder="Previous medical conditions, surgeries, etc..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Current Medications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
            <textarea
              rows={3}
              value={formData.medications}
              onChange={(e) => handleInputChange('medications', e.target.value)}
              placeholder="List current medications with dosages..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
            <textarea
              rows={2}
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              placeholder="Drug allergies, food allergies, etc..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Social History */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Social History</label>
            <textarea
              rows={3}
              value={formData.socialHistory}
              onChange={(e) => handleInputChange('socialHistory', e.target.value)}
              placeholder="Occupation, smoking history, alcohol use, exercise, etc..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Family History */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Family History</label>
            <textarea
              rows={3}
              value={formData.familyHistory}
              onChange={(e) => handleInputChange('familyHistory', e.target.value)}
              placeholder="Family medical history relevant to current condition..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Review of Systems */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Review of Systems</label>
            <textarea
              rows={4}
              value={formData.reviewOfSystems}
              onChange={(e) => handleInputChange('reviewOfSystems', e.target.value)}
              placeholder="Systematic review of body systems..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Physical Examination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
            <textarea
              rows={4}
              value={formData.physicalExamination}
              onChange={(e) => handleInputChange('physicalExamination', e.target.value)}
              placeholder="Findings from physical examination..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Assessment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assessment</label>
            <textarea
              rows={4}
              value={formData.assessment}
              onChange={(e) => handleInputChange('assessment', e.target.value)}
              placeholder="Medical assessment and diagnosis..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
            <textarea
              rows={4}
              value={formData.plan}
              onChange={(e) => handleInputChange('plan', e.target.value)}
              placeholder="Treatment plan, follow-up, referrals, etc..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Prescriptions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prescriptions</label>
            <textarea
              rows={3}
              value={formData.prescriptions}
              onChange={(e) => handleInputChange('prescriptions', e.target.value)}
              placeholder="Medications prescribed during this visit..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>

          {/* Follow-up Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Instructions</label>
            <textarea
              rows={3}
              value={formData.followUpInstructions}
              onChange={(e) => handleInputChange('followUpInstructions', e.target.value)}
              placeholder="Instructions for patient follow-up..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}