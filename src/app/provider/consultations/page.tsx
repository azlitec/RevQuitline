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

export default function ProviderConsultationsPage() {
  const [currentSession, setCurrentSession] = useState({
    id: '1',
    patientName: 'Siti Nurhaliza',
    patientInitials: 'SN',
    type: 'General Consultation',
    startTime: '3:15 PM',
    duration: '18:45',
    fee: 'RM 80',
    status: 'live'
  });

  const [nextAppointments] = useState([
    {
      id: '2',
      patientName: 'Raj Kumar',
      patientInitials: 'RK',
      type: 'Follow-up Session',
      time: 'Tomorrow, 10:00 AM'
    },
    {
      id: '3',
      patientName: 'Lim Wei Ming',
      patientInitials: 'LW',
      type: 'Free-smoking Session',
      time: 'Tomorrow, 2:30 PM'
    },
    {
      id: '4',
      patientName: 'Fatimah Hassan',
      patientInitials: 'FH',
      type: 'General Consultation',
      time: 'Tomorrow, 4:00 PM'
    }
  ]);

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
              <p className="text-blue-100">In Progress</p>
            </div>
            <div className="bg-red-500 px-3 py-1 rounded-full text-white text-sm font-semibold status-badge">LIVE</div>
          </div>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white text-xl font-semibold">
              {currentSession.patientInitials}
            </div>
            <div>
              <h4 className="text-xl font-semibold text-white">{currentSession.patientName}</h4>
              <p className="text-blue-100">{currentSession.type}</p>
              <p className="text-blue-100 text-sm">Started: {currentSession.startTime}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{currentSession.duration}</p>
              <p className="text-blue-100 text-sm">Duration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{currentSession.fee}</p>
              <p className="text-blue-100 text-sm">Fee</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">30 min</p>
              <p className="text-blue-100 text-sm">Planned</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button className="flex-1 bg-white bg-opacity-20 text-white py-3 rounded-lg font-semibold hover:bg-opacity-30 transition-colors flex items-center justify-center space-x-2">
              <IconWithFallback icon="pause" emoji="⏸️" className="text-white" />
              <span>Pause</span>
            </button>
            <button className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2">
              <IconWithFallback icon="stop" emoji="⏹️" className="text-white" />
              <span>End Session</span>
            </button>
          </div>
        </div>

        {/* Next Appointments */}
        <div className="card p-8 shadow-soft">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Next Appointments</h3>
          <div className="space-y-4">
            {nextAppointments.map((appointment) => (
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
            ))}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 patient-avatar rounded-full flex items-center justify-center text-white font-semibold">
                AR
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Ahmad Rahman</h4>
                <p className="text-sm text-gray-500">Free-smoking Session • 45 mins</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Today, 2:30 PM</span>
              <span className="bg-green-100 text-green-700 text-sm font-semibold py-1 px-3 rounded-full">Completed</span>
              <button className="text-blue-600 hover:text-blue-800">
                <IconWithFallback icon="visibility" emoji="👁️" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 patient-avatar rounded-full flex items-center justify-center text-white font-semibold">
                LW
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Lim Wei Ming</h4>
                <p className="text-sm text-gray-500">General Consultation • 30 mins</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Yesterday, 4:00 PM</span>
              <span className="bg-green-100 text-green-700 text-sm font-semibold py-1 px-3 rounded-full">Completed</span>
              <button className="text-blue-600 hover:text-blue-800">
                <IconWithFallback icon="visibility" emoji="👁️" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 patient-avatar rounded-full flex items-center justify-center text-white font-semibold">
                FH
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Fatimah Hassan</h4>
                <p className="text-sm text-gray-500">Follow-up Session • 25 mins</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Jan 12, 3:15 PM</span>
              <span className="bg-green-100 text-green-700 text-sm font-semibold py-1 px-3 rounded-full">Completed</span>
              <button className="text-blue-600 hover:text-blue-800">
                <IconWithFallback icon="visibility" emoji="👁️" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}