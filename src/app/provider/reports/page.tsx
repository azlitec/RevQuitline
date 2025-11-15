'use client';

import { useState } from 'react';

import { Download, HelpCircle, Clock, Pill, Receipt } from 'lucide-react';

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

export default function ProviderReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Analytics & Reports</h2>
          <p className="text-gray-500">Comprehensive healthcare analytics and insights</p>
        </div>
        <div className="flex space-x-3">
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-quarter">This Quarter</option>
            <option value="this-year">This Year</option>
          </select>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-medium hover:shadow-strong flex items-center space-x-2">
            <Download className="text-white" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="accent-card p-8 shadow-strong">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Monthly Revenue</h3>
              <p className="text-purple-100">September 2025</p>
            </div>
            <div className="bg-green-500 px-3 py-1 rounded-full text-white text-sm font-semibold">+24%</div>
          </div>
          
          <div className="text-center mb-8">
            <p className="text-4xl font-bold text-white mb-2">RM 18,450</p>
            <p className="text-purple-100">+RM 3,200 from last month</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">156</p>
              <p className="text-purple-100 text-sm">Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">RM 118</p>
              <p className="text-purple-100 text-sm">Avg/Session</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">89</p>
              <p className="text-purple-100 text-sm">New Patients</p>
            </div>
          </div>
        </div>

        <div className="card p-8 shadow-soft">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Service Performance</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Free-smoking Sessions</span>
                <span className="text-gray-800 font-semibold">156 (65%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{width: '65%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">General Consultation</span>
                <span className="text-gray-800 font-semibold">78 (32%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-purple-500 h-3 rounded-full transition-all duration-1000" style={{width: '32%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Follow-up Sessions</span>
                <span className="text-gray-800 font-semibold">45 (18%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all duration-1000" style={{width: '18%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Emergency Consultation</span>
                <span className="text-gray-800 font-semibold">12 (5%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-red-500 h-3 rounded-full transition-all duration-1000" style={{width: '5%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="card p-6 shadow-soft mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Detailed Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg hover-effect">
            <div className="text-3xl font-bold text-blue-600 mb-2">1,247</div>
            <div className="text-gray-600">Total Patients</div>
            <div className="text-sm text-green-600 mt-1">+89 this month</div>
          </div>
          <div className="text-center p-6 bg-green-50 rounded-lg hover-effect">
            <div className="text-3xl font-bold text-green-600 mb-2">94.2%</div>
            <div className="text-gray-600">Success Rate</div>
            <div className="text-sm text-green-600 mt-1">+2.1% improvement</div>
          </div>
          <div className="text-center p-6 bg-purple-50 rounded-lg hover-effect">
            <div className="text-3xl font-bold text-purple-600 mb-2">4.8</div>
            <div className="text-gray-600">Avg Rating</div>
            <div className="text-sm text-green-600 mt-1">+0.2 this month</div>
          </div>
          <div className="text-center p-6 bg-yellow-50 rounded-lg hover-effect">
            <div className="text-3xl font-bold text-yellow-600 mb-2">2.1%</div>
            <div className="text-gray-600">Cancel Rate</div>
            <div className="text-sm text-red-600 mt-1">-0.3% improvement</div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="card p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Available Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-200">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <HelpCircle className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Patient Progress</h4>
                <p className="text-sm text-gray-500">Smoking cessation progress</p>
              </div>
            </div>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Generate Report
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-green-200">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <HelpCircle className="text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Monthly Summary</h4>
                <p className="text-sm text-gray-500">Monthly performance metrics</p>
              </div>
            </div>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
              Generate Report
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-purple-100 p-3 rounded-xl">
                <HelpCircle className="text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Demographics</h4>
                <p className="text-sm text-gray-500">Patient demographics analysis</p>
              </div>
            </div>
            <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">
              Generate Report
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-orange-200">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-orange-100 p-3 rounded-xl">
                <Clock className="text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Appointment Analytics</h4>
                <p className="text-sm text-gray-500">Appointment patterns & trends</p>
              </div>
            </div>
            <button className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors">
              Generate Report
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-red-200">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-red-100 p-3 rounded-xl">
                <Pill className="text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Prescription Report</h4>
                <p className="text-sm text-gray-500">Medication prescriptions</p>
              </div>
            </div>
            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors">
              Generate Report
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-gray-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-gray-100 p-3 rounded-xl">
                <Receipt className="text-gray-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Financial Report</h4>
                <p className="text-sm text-gray-500">Revenue & billing summary</p>
              </div>
            </div>
            <button className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </>
  );
}