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
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Patient Analytics</h3>
        <div className="flex space-x-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-blue-600">{currentData.newPatients}</p>
            <p className="text-sm text-gray-600">New Patients</p>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600">{currentData.returningPatients}</p>
            <p className="text-sm text-gray-600">Returning Patients</p>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-purple-600">{currentData.totalConsultations}</p>
            <p className="text-sm text-gray-600">Total Consultations</p>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-orange-600">{currentData.smokingCessationRate}</p>
            <p className="text-sm text-gray-600">Cessation Success Rate</p>
          </div>
        </div>
      </div>

      {/* Progress bars for patient categories */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Smoking Cessation Program</span>
            <span>65%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Nicotine Replacement Therapy</span>
            <span>42%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '42%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Behavioral Counseling</span>
            <span>78%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '78%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Follow-up Sessions</span>
            <span>55%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full" style={{ width: '55%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}