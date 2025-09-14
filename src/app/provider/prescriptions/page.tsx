'use client';

import { useState, useEffect } from 'react';

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

interface Prescription {
  id: string;
  patientName: string;
  patientInitials: string;
  medication: string;
  dosage: string;
  duration: string;
  date: string;
  status: 'pending' | 'dispensed' | 'completed';
}

export default function ProviderPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPrescriptionModal, setShowNewPrescriptionModal] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockPrescriptions: Prescription[] = [
        {
          id: '1',
          patientName: 'Ahmad Rahman',
          patientInitials: 'AR',
          medication: 'Nicotine Patch',
          dosage: '21mg/24hr, 1 patch daily',
          duration: '4 weeks',
          date: 'Sept 9, 2025',
          status: 'dispensed'
        },
        {
          id: '2',
          patientName: 'Siti Nurhaliza',
          patientInitials: 'SN',
          medication: 'Paracetamol',
          dosage: '500mg tablets, 2 tablets TID',
          duration: '7 days',
          date: 'Sept 9, 2025',
          status: 'pending'
        },
        {
          id: '3',
          patientName: 'Raj Kumar',
          patientInitials: 'RK',
          medication: 'Bupropion',
          dosage: '150mg tablets, 1 tablet daily',
          duration: '12 weeks',
          date: 'Sept 8, 2025',
          status: 'dispensed'
        }
      ];
      
      setPrescriptions(mockPrescriptions);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'dispensed': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading prescriptions...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Prescription Management</h2>
          <p className="text-gray-500">Create and manage patient prescriptions</p>
        </div>
        <button 
          onClick={() => setShowNewPrescriptionModal(true)}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-medium hover:shadow-strong flex items-center space-x-2"
        >
          <IconWithFallback icon="add" emoji="➕" className="text-white" />
          <span>New Prescription</span>
        </button>
      </div>

      {/* Prescription Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-4 rounded-xl">
              <IconWithFallback icon="medication" emoji="💊" className="text-purple-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-3xl font-bold text-gray-800">89</p>
              <p className="text-sm text-green-600">+12% from last week</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-100 p-4 rounded-xl">
              <IconWithFallback icon="pending" emoji="⏳" className="text-yellow-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-gray-800">12</p>
              <p className="text-sm text-yellow-600">Awaiting approval</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-4 rounded-xl">
              <IconWithFallback icon="check_circle" emoji="✅" className="text-green-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dispensed</p>
              <p className="text-3xl font-bold text-gray-800">77</p>
              <p className="text-sm text-green-600">Successfully delivered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Prescriptions */}
      <div className="card p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Recent Prescriptions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Medication</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Dosage</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((prescription) => (
                <tr key={prescription.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 patient-avatar rounded-full flex items-center justify-center text-white font-semibold">
                        {prescription.patientInitials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{prescription.patientName}</p>
                        <p className="text-sm text-gray-500">#P{prescription.id.padStart(3, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-800">{prescription.medication}</p>
                    <p className="text-sm text-gray-500">{prescription.medication.includes('Patch') ? 'Transdermal' : 'Oral'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-800">{prescription.dosage}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-800">{prescription.duration}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-800">{prescription.date}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(prescription.status)}`}>
                      {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Print">
                        <IconWithFallback icon="print" emoji="🖨️" className="text-sm" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-50 rounded-lg transition-colors" title="Edit">
                        <IconWithFallback icon="edit" emoji="✏️" className="text-sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Prescription Modal */}
      {showNewPrescriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-strong w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">New Prescription</h3>
                <button 
                  onClick={() => setShowNewPrescriptionModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                    <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300">
                      <option>Select Patient</option>
                      <option>Ahmad Rahman</option>
                      <option>Siti Nurhaliza</option>
                      <option>Raj Kumar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Medication</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300" placeholder="Medication name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300" placeholder="e.g., 500mg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300">
                      <option>Once daily</option>
                      <option>Twice daily</option>
                      <option>Three times daily</option>
                      <option>As needed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300" placeholder="e.g., 7 days" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input type="number" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300" placeholder="30" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                  <textarea rows={3} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300" placeholder="Special instructions for patient..."></textarea>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowNewPrescriptionModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-medium hover:shadow-strong">
                Create Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}