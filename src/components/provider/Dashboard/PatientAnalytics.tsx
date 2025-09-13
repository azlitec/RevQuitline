'use client';

import { useState } from 'react';

export default function PatientAnalytics() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const patientData = {
    week: {
      newPatients: 12,
      returningPatients: 45,
      totalConsultations: 57,
      smokingCessationRate: '68%'
    },
    month: {
      newPatients: 48,
      returningPatients: 192,
      totalConsultations: 240,
      smokingCessationRate: '72%'
    },
    year: {
      newPatients: 576,
      returningPatients: 2304,
      totalConsultations: 2880,
      smokingCessationRate: '75%'
    }
  };

  const currentData = patientData[timeRange];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-blue-900">Patient Analytics</h3>
        <div className="flex space-x-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700 font-medium shadow-sm'
                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="text-center">
          <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-100 shadow-sm">
            <p className="text-2xl font-bold text-blue-700">{currentData.newPatients}</p>
            <p className="text-sm text-blue-600">New Patients</p>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-green-50/80 rounded-xl p-4 border border-green-100 shadow-sm">
            <p className="text-2xl font-bold text-green-700">{currentData.returningPatients}</p>
            <p className="text-sm text-green-600">Returning Patients</p>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-purple-50/80 rounded-xl p-4 border border-purple-100 shadow-sm">
            <p className="text-2xl font-bold text-purple-700">{currentData.totalConsultations}</p>
            <p className="text-sm text-purple-600">Total Consultations</p>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-orange-50/80 rounded-xl p-4 border border-orange-100 shadow-sm">
            <p className="text-2xl font-bold text-orange-700">{currentData.smokingCessationRate}</p>
            <p className="text-sm text-orange-600">Cessation Success Rate</p>
          </div>
        </div>
      </div>

      {/* Progress bars for patient categories */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-blue-700 mb-1">
            <span>Smoking Cessation Program</span>
            <span>65%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 h-2 rounded-full" style={{ width: '65%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-green-700 mb-1">
            <span>Nicotine Replacement Therapy</span>
            <span>42%</span>
          </div>
          <div className="w-full bg-green-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-600 to-green-800 h-2 rounded-full" style={{ width: '42%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-purple-700 mb-1">
            <span>Behavioral Counseling</span>
            <span>78%</span>
          </div>
          <div className="w-full bg-purple-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 h-2 rounded-full" style={{ width: '78%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-orange-700 mb-1">
            <span>Follow-up Sessions</span>
            <span>55%</span>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-orange-600 to-orange-800 h-2 rounded-full" style={{ width: '55%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}