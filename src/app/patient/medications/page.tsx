'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  prescribedDate: string;
  startDate: string;
  endDate?: string;
  instructions: string;
  status: 'active' | 'completed' | 'discontinued';
  sideEffects?: string;
  notes?: string;
}

export default function PatientMedicationsPage() {
  const { data: session } = useSession();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'active' | 'all' | 'history'>('active');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchMedications();
    }
  }, [session, selectedTab]);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedTab !== 'all') {
        params.append('status', selectedTab === 'active' ? 'active' : 'completed,discontinued');
      }

      const response = await fetch(`/api/patient/medications?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setMedications(data.medications || []);
      } else {
        // Show empty state - no medications yet
        setMedications([]);
      }
    } catch (err) {
      // Show empty state instead of error - API not yet implemented
      console.log('Medications API not yet implemented - showing empty state');
      setMedications([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'discontinued': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return { icon: 'medication', emoji: '💊' };
      case 'completed': return { icon: 'check_circle', emoji: '✅' };
      case 'discontinued': return { icon: 'cancel', emoji: '❌' };
      default: return { icon: 'help', emoji: '❓' };
    }
  };

  const filteredMedications = medications.filter(med => {
    if (selectedTab === 'active') return med.status === 'active';
    if (selectedTab === 'history') return med.status === 'completed' || med.status === 'discontinued';
    return true; // all
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading medications...</span>
        </div>
      </div>
    );
  }


  return (
    <>
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold gradient-text">Medication Management</h2>
          <p className="text-sm md:text-base text-gray-500 flex items-center">
            Track and manage your medications
            <span className="ml-2 text-sm text-gray-400">•</span>
            <span className="ml-2 text-sm text-blue-600 font-medium">{medications.filter(m => m.status === 'active').length} active</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly"
        >
          <IconWithFallback icon="add" emoji="➕" className="text-white" />
          <span className="hidden sm:inline">Add Medication</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Enhanced Medication Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="card p-3 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-gradient-to-r from-green-100 to-green-200 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
              <IconWithFallback icon="medication" emoji="💊" className="text-green-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Active</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">
                {medications.filter(m => m.status === 'active').length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Currently taking</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
              <IconWithFallback icon="check_circle" emoji="✅" className="text-blue-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Completed</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">
                {medications.filter(m => m.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Successfully finished</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
              <IconWithFallback icon="schedule" emoji="⏰" className="text-yellow-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Due Today</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">
                {medications.filter(m => m.status === 'active').length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Need attention</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-2 md:p-3 rounded-lg md:rounded-xl shadow-sm">
              <IconWithFallback icon="medical_services" emoji="🏥" className="text-purple-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Total</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{medications.length}</p>
              <p className="text-xs text-gray-400 mt-1">All medications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4 md:mb-6 w-full md:w-fit overflow-x-auto">
        {[
          { key: 'active', label: 'Active Medications', shortLabel: 'Active', icon: 'medication', emoji: '💊' },
          { key: 'all', label: 'All Medications', shortLabel: 'All', icon: 'list', emoji: '📋' },
          { key: 'history', label: 'History', shortLabel: 'History', icon: 'history', emoji: '📜' }
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-3 md:px-6 py-2 md:py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-1 md:space-x-2 text-sm md:text-base whitespace-nowrap touch-friendly ${
              selectedTab === tab.key
                ? 'bg-white text-blue-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 active:bg-white/70'
            }`}
            onClick={() => setSelectedTab(tab.key as any)}
          >
            <IconWithFallback
              icon={tab.icon}
              emoji={tab.emoji}
              className={selectedTab === tab.key ? 'text-blue-600' : 'text-gray-500'}
            />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Enhanced Medications List */}
      <div className="card p-4 md:p-6 shadow-strong hover:shadow-xl transition-all duration-300">
        {filteredMedications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredMedications.map((medication) => {
              const statusIcon = getStatusIcon(medication.status);
              return (
                <div key={medication.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-strong bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:border-blue-300 hover:scale-102">
                  {/* Enhanced Medication Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 text-sm md:text-base mb-1">
                        {medication.name}
                      </h4>
                      <p className="text-xs md:text-sm text-gray-600 font-medium">
                        {medication.dosage} • {medication.frequency}
                      </p>
                    </div>
                    <span className={`inline-flex items-center space-x-1 px-3 py-2 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(medication.status)}`}>
                      <IconWithFallback
                        icon={statusIcon.icon}
                        emoji={statusIcon.emoji}
                        className="text-xs"
                      />
                      <span>{medication.status.charAt(0).toUpperCase() + medication.status.slice(1)}</span>
                    </span>
                  </div>

                  {/* Enhanced Medication Details */}
                  <div className="space-y-3 mb-4 text-xs md:text-sm bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Prescribed by:</span>
                      <span className="text-gray-800 font-bold">{medication.prescribedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Start Date:</span>
                      <span className="text-gray-800 font-bold">
                        {new Date(medication.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    {medication.endDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">End Date:</span>
                        <span className="text-gray-800 font-bold">
                          {new Date(medication.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Instructions */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 font-medium mb-2">Instructions:</p>
                    <p className="text-xs md:text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      {medication.instructions}
                    </p>
                  </div>

                  {/* Enhanced Action Buttons */}
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-3 rounded-lg text-xs font-semibold hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 touch-friendly hover:scale-105">
                      <IconWithFallback icon="visibility" emoji="👁️" className="text-white text-sm mr-1" />
                      View Details
                    </button>
                    <button className="px-3 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-blue-400 active:bg-gray-100 transition-all duration-300 touch-friendly hover:scale-110">
                      <IconWithFallback icon="edit" emoji="✏️" className="text-gray-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
              <IconWithFallback icon="medication" emoji="💊" className="text-gray-400 text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-3">
              {selectedTab === 'active' ? 'No active medications' :
              selectedTab === 'history' ? 'No medication history' : 'No medications found'}
            </h3>
            <p className="text-base text-gray-500 mb-6">
              {selectedTab === 'active'
                ? 'You have no active medications at the moment'
                : selectedTab === 'history'
                ? 'Your medication history will appear here'
                : 'Start by adding your medications'
              }
            </p>
            {selectedTab === 'active' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105"
              >
                Add Your First Medication
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-strong w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">Add Medication</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
                >
                  <IconWithFallback icon="close" emoji="❌" />
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Medication Name</label>
                    <input type="text" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" placeholder="Enter medication name" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Dosage</label>
                    <input type="text" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" placeholder="e.g., 10mg" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Frequency</label>
                    <select className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly">
                      <option>Once daily</option>
                      <option>Twice daily</option>
                      <option>Three times daily</option>
                      <option>Four times daily</option>
                      <option>As needed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Prescribed By</label>
                    <input type="text" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" placeholder="Doctor name" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Start Date</label>
                    <input type="date" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">End Date (Optional)</label>
                    <input type="date" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Instructions</label>
                  <textarea rows={3} className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" placeholder="Instructions for taking this medication..."></textarea>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Notes (Optional)</label>
                  <textarea rows={2} className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" placeholder="Additional notes..."></textarea>
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 md:px-6 py-2 text-sm md:text-base text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors touch-friendly"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 md:px-6 py-2 text-sm md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong touch-friendly"
                  >
                    Add Medication
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}