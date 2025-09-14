'use client';

import { useState } from 'react';

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
  patientName: string;
  patientInitials: string;
  type: string;
  time: string;
}

export default function ProviderConsultationsPage() {
  const [currentSession, setCurrentSession] = useState(null);
  const [nextAppointments] = useState<Appointment[]>([]);

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Active Consultations</h2>
          <p className="text-gray-500">Monitor ongoing and upcoming consultations</p>
        </div>
        <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-medium hover:shadow-strong flex items-center space-x-2">
          <IconWithFallback icon="video_call" emoji="📹" className="text-white" />
          <span>Start Session</span>
        </button>
      </div>

      {/* Live Consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Current Session */}
        <div className="secondary-card p-8 shadow-strong">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Current Session</h3>
              <p className="text-blue-100">No active session</p>
            </div>
          </div>

          <div className="text-center py-8">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white text-2xl mb-4">
              <IconWithFallback icon="play_circle" emoji="▶️" className="text-white" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">No Active Consultation</h4>
            <p className="text-blue-100 text-sm mb-6">Start a consultation from your appointments</p>
            <button className="bg-white bg-opacity-20 text-white py-3 px-6 rounded-lg font-semibold hover:bg-opacity-30 transition-colors">
              Start New Session
            </button>
          </div>
        </div>

        {/* Next Appointments */}
        <div className="card p-8 shadow-soft">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Next Appointments</h3>
          <div className="space-y-4">
            {nextAppointments.length > 0 ? (
              nextAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 patient-avatar rounded-full flex items-center justify-center text-white font-semibold">
                    {appointment.patientInitials}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{appointment.patientName}</h4>
                    <p className="text-sm text-gray-500">{appointment.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{appointment.time.split(',')[0]}</p>
                    <p className="text-sm text-gray-500">{appointment.time.split(',')[1]}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconWithFallback icon="event_note" emoji="📅" className="text-gray-400 text-xl" />
                </div>
                <h4 className="font-medium text-gray-600 mb-2">No upcoming appointments</h4>
                <p className="text-sm text-gray-500">Your next appointments will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 shadow-soft hover-effect">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <IconWithFallback icon="note_add" emoji="📝" className="text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Session Notes</h4>
              <p className="text-sm text-gray-500">Add consultation notes</p>
            </div>
          </div>
          <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Open Notes
          </button>
        </div>

        <div className="card p-6 shadow-soft hover-effect">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <IconWithFallback icon="medication" emoji="💊" className="text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Prescriptions</h4>
              <p className="text-sm text-gray-500">Create prescriptions</p>
            </div>
          </div>
          <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
            New Prescription
          </button>
        </div>

        <div className="card p-6 shadow-soft hover-effect">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <IconWithFallback icon="assessment" emoji="📊" className="text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Assessment</h4>
              <p className="text-sm text-gray-500">Smoking assessment tools</p>
            </div>
          </div>
          <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Start Assessment
          </button>
        </div>
      </div>

      {/* Session History */}
      <div className="card p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Recent Sessions</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconWithFallback icon="history" emoji="📜" className="text-gray-400 text-xl" />
          </div>
          <h4 className="font-medium text-gray-600 mb-2">No recent sessions</h4>
          <p className="text-sm text-gray-500">Your completed consultations will appear here</p>
        </div>
      </div>
    </>
  );
}