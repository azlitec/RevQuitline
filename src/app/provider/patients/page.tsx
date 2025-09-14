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

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  lastVisit: string;
  totalVisits: number;
  status: 'active' | 'inactive' | 'vip';
  smokingStatus: string;
  quitDate?: string;
}

export default function ProviderPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockPatients: Patient[] = [
        {
          id: '1',
          firstName: 'Ahmad',
          lastName: 'Rahman',
          email: 'ahmad@example.com',
          phone: '+60123456789',
          dateOfBirth: '1985-06-15',
          lastVisit: '2025-01-14',
          totalVisits: 12,
          status: 'active',
          smokingStatus: 'Former Smoker',
          quitDate: '2024-12-01'
        },
        {
          id: '2',
          firstName: 'Siti',
          lastName: 'Nurhaliza',
          email: 'siti@example.com',
          phone: '+60198765432',
          dateOfBirth: '1979-01-11',
          lastVisit: '2025-01-14',
          totalVisits: 8,
          status: 'active',
          smokingStatus: 'Current Smoker'
        },
        {
          id: '3',
          firstName: 'Raj',
          lastName: 'Kumar',
          email: 'raj@example.com',
          phone: '+60176543210',
          dateOfBirth: '1975-09-23',
          lastVisit: '2025-01-10',
          totalVisits: 15,
          status: 'vip',
          smokingStatus: 'Former Smoker',
          quitDate: '2024-08-15'
        },
        {
          id: '4',
          firstName: 'Lim',
          lastName: 'Wei Ming',
          email: 'lim@example.com',
          phone: '+60187654321',
          dateOfBirth: '1990-03-20',
          lastVisit: '2025-01-12',
          totalVisits: 5,
          status: 'active',
          smokingStatus: 'Current Smoker'
        },
        {
          id: '5',
          firstName: 'Fatimah',
          lastName: 'Hassan',
          email: 'fatimah@example.com',
          phone: '+60165432109',
          dateOfBirth: '1988-11-08',
          lastVisit: '2025-01-08',
          totalVisits: 3,
          status: 'inactive',
          smokingStatus: 'Never Smoked'
        }
      ];
      
      setPatients(mockPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'vip': return 'bg-purple-100 text-purple-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSmokingStatusColor = (status: string) => {
    switch (status) {
      case 'Former Smoker': return 'bg-green-100 text-green-700';
      case 'Current Smoker': return 'bg-red-100 text-red-700';
      case 'Never Smoked': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading patients...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Management</h2>
          <p className="text-gray-500">View and manage all registered patients</p>
        </div>
        <button 
          onClick={() => setShowNewPatientModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-medium hover:shadow-strong flex items-center space-x-2"
        >
          <IconWithFallback icon="person_add" emoji="👤➕" className="text-white" />
          <span>Add Patient</span>
        </button>
      </div>

      {/* Patient Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <IconWithFallback icon="people" emoji="👥" className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-2xl font-bold text-gray-800">1,247</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <IconWithFallback icon="trending_up" emoji="📈" className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">New This Month</p>
              <p className="text-2xl font-bold text-gray-800">89</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <IconWithFallback icon="schedule" emoji="⏰" className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Today</p>
              <p className="text-2xl font-bold text-gray-800">24</p>
            </div>
          </div>
        </div>
        <div className="card p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <IconWithFallback icon="star" emoji="⭐" className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">VIP Patients</p>
              <p className="text-2xl font-bold text-gray-800">47</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card p-6 mb-8 shadow-soft">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">All Patients</h3>
          <div className="flex space-x-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <IconWithFallback icon="search" emoji="🔍" className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search patients..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 w-64"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            >
              <option value="all">All Patients</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="vip">VIP</option>
            </select>
          </div>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 patient-avatar rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-soft">
                  {getPatientInitials(patient.firstName, patient.lastName)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{patient.firstName} {patient.lastName}</h4>
                  <p className="text-sm text-gray-500">Patient ID: #{patient.id.padStart(3, '0')}</p>
                  <p className="text-sm text-gray-500">{patient.phone}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Age:</span>
                  <span className="text-gray-800">{calculateAge(patient.dateOfBirth)} years</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Visit:</span>
                  <span className="text-gray-800">{new Date(patient.lastVisit).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Visits:</span>
                  <span className="text-gray-800">{patient.totalVisits} times</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(patient.status)}`}>
                    {patient.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">Smoking:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSmokingStatusColor(patient.smokingStatus)}`}>
                    {patient.smokingStatus}
                  </span>
                </div>
                {patient.quitDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quit Date:</span>
                    <span className="text-green-600 font-medium">{new Date(patient.quitDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1">
                  <IconWithFallback icon="visibility" emoji="👁️" className="text-white text-sm" />
                  <span>View Profile</span>
                </button>
                <button className="px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  <IconWithFallback icon="more_vert" emoji="⋮" className="text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconWithFallback icon="search_off" emoji="🔍❌" className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No patients found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-strong w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Add New Patient</h3>
                <button 
                  onClick={() => setShowNewPatientModal(false)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input type="tel" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input type="date" className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Smoking Status</label>
                    <select className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300">
                      <option>Current Smoker</option>
                      <option>Former Smoker</option>
                      <option>Never Smoked</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                  <textarea rows={3} className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" placeholder="Brief medical history..."></textarea>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowNewPatientModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-medium hover:shadow-strong">
                Add Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}