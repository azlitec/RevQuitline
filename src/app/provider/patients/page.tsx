'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { RefreshCw, HelpCircle, Clock, Star, Search, Eye, X } from 'lucide-react';

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

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  smokingStatus?: string;
  quitDate?: string;
  lastVisit?: string;
  totalVisits: number;
  status: string;
  createdAt: string;
}

export default function ProviderPatientsPage() {
  const { data: session } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [smokingStatusFilter, setSmokingStatusFilter] = useState('all');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minVisits, setMinVisits] = useState('');
  const [maxVisits, setMaxVisits] = useState('');
  const [lastVisitDays, setLastVisitDays] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  useEffect(() => {
    if (session?.user?.isProvider) {
      fetchPatients();
    }
  }, [session]);

  useEffect(() => {
    // Refetch when search or filter changes
    const timeoutId = setTimeout(() => {
      if (session?.user?.isProvider) {
        fetchPatients();
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, smokingStatusFilter, minAge, maxAge, minVisits, maxVisits, lastVisitDays, session]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (smokingStatusFilter !== 'all') params.append('smokingStatus', smokingStatusFilter);
      if (minAge) params.append('minAge', minAge);
      if (maxAge) params.append('maxAge', maxAge);
      if (minVisits) params.append('minVisits', minVisits);
      if (maxVisits) params.append('maxVisits', maxVisits);
      if (lastVisitDays) params.append('lastVisitDays', lastVisitDays);

      const response = await fetch(`/api/provider/patients?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      
      const data = await response.json();
      setPatients(data.patients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'vip': return 'bg-purple-100 text-purple-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSmokingStatusColor = (status?: string) => {
    switch (status) {
      case 'Former Smoker': return 'bg-green-100 text-green-700';
      case 'Current Smoker': return 'bg-red-100 text-red-700';
      case 'Never Smoked': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'Unknown';

    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSmokingStatusFilter('all');
    setMinAge('');
    setMaxAge('');
    setMinVisits('');
    setMaxVisits('');
    setLastVisitDays('');
  };

  // Calculate statistics from real data
  const stats = {
    total: patients.length,
    newThisMonth: patients.filter(p => {
      const createdAt = new Date(p.createdAt);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length,
    activeToday: patients.filter(p => {
      if (!p.lastVisit) return false;
      const lastVisit = new Date(p.lastVisit);
      const today = new Date();
      return lastVisit.toDateString() === today.toDateString();
    }).length,
    vip: patients.filter(p => p.status === 'vip').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <RefreshCw className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading patients...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-xl shadow-soft max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <HelpCircle className="text-red-600" />
          <h2 className="text-xl font-bold">Error Loading Patients</h2>
        </div>
        <p className="mb-4">{error}</p>
        <button 
          onClick={fetchPatients}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Patient Management</h2>
          <p className="text-sm md:text-base text-gray-500">View and manage all registered patients</p>
        </div>
        <button
          onClick={() => setShowNewPatientModal(true)}
          className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly"
        >
          <HelpCircle className="text-white" />
          <span className="hidden sm:inline">Add Patient</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Patient Stats - Real Data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="card p-3 md:p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-blue-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <HelpCircle className="text-blue-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Total Patients</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-green-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <HelpCircle className="text-green-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">New This Month</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.newThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-yellow-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <Clock className="text-yellow-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Active Today</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.activeToday}</p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 hover-effect shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-purple-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <Star className="text-purple-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">VIP Patients</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.vip}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card p-4 md:p-6 mb-6 md:mb-8 shadow-soft">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <h3 className="text-base md:text-lg font-semibold text-gray-800">All Patients</h3>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
            >
              <HelpCircle className="text-sm" />
              <span>{showAdvancedFilters ? 'Hide' : 'Show'} Filters</span>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Search className="text-gray-400 text-sm" />
              </div>
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 w-full sm:w-56 md:w-64 touch-friendly"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 md:px-4 py-2 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="vip">VIP</option>
            </select>
            <button
              onClick={clearAllFilters}
              className="px-3 md:px-4 py-2 text-sm md:text-base text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors touch-friendly"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Smoking Status</label>
                <select
                  value={smokingStatusFilter}
                  onChange={(e) => setSmokingStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                >
                  <option value="all">All</option>
                  <option value="Current Smoker">Current Smoker</option>
                  <option value="Former Smoker">Former Smoker</option>
                  <option value="Never Smoked">Never Smoked</option>
                </select>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Age Range</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    min="0"
                    max="120"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    min="0"
                    max="120"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Visit Count</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minVisits}
                    onChange={(e) => setMinVisits(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxVisits}
                    onChange={(e) => setMaxVisits(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Last Visit (Days)</label>
                <select
                  value={lastVisitDays}
                  onChange={(e) => setLastVisitDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly"
                >
                  <option value="">Any time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 3 months</option>
                  <option value="180">Last 6 months</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Patients Grid - Real Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {patients.length > 0 ? (
            patients.map((patient) => (
              <div key={patient.id} className="border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-200">
                <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 patient-avatar rounded-full flex items-center justify-center text-white text-base md:text-xl font-semibold shadow-soft">
                    {getPatientInitials(patient.firstName, patient.lastName)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm md:text-base">
                      {patient.firstName} {patient.lastName}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500">Patient ID: #{patient.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs md:text-sm text-gray-500">{patient.phone || 'No phone'}</p>
                  </div>
                </div>
                
                <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-500">Age:</span>
                    <span className="text-gray-800 font-medium">{calculateAge(patient.dateOfBirth)} years</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-500">Last Visit:</span>
                    <span className="text-gray-800 font-medium">
                      {patient.lastVisit
                        ? new Date(patient.lastVisit).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-500">Total Visits:</span>
                    <span className="text-gray-800 font-medium">{patient.totalVisits} times</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm items-center">
                    <span className="text-gray-500">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(patient.status)}`}>
                      {patient.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm items-center">
                    <span className="text-gray-500">Smoking:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSmokingStatusColor(patient.smokingStatus)}`}>
                      {patient.smokingStatus || 'Unknown'}
                    </span>
                  </div>
                  {patient.quitDate && (
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-500">Quit Date:</span>
                      <span className="text-green-600 font-medium">
                        {new Date(patient.quitDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Link
                    href={`/provider/patients/${patient.id}/emr`}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 md:px-4 rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center space-x-1 touch-friendly"
                    aria-label="Open patient EMR"
                  >
                    <Eye className="text-white text-sm" />
                    <span className="hidden sm:inline">Open EMR</span>
                    <span className="sm:hidden">EMR</span>
                  </Link>
                  <button className="px-2 md:px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-friendly">
                    <HelpCircle className="text-gray-600" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 md:py-12">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <HelpCircle className="text-gray-400 text-lg md:text-2xl" />
              </div>
              <h3 className="text-base md:text-lg font-medium text-gray-600 mb-2">No patients found</h3>
              <p className="text-sm md:text-base text-gray-500">
                {searchTerm || statusFilter !== 'all' || smokingStatusFilter !== 'all' || minAge || maxAge || minVisits || maxVisits || lastVisitDays
                  ? 'Try adjusting your search or filter criteria'
                  : 'No patients assigned to you yet'
                }
              </p>
              {(searchTerm || statusFilter !== 'all' || smokingStatusFilter !== 'all' || minAge || maxAge || minVisits || maxVisits || lastVisitDays) && (
                <button
                  onClick={clearAllFilters}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-strong w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">Add New Patient</h3>
                <button
                  onClick={() => setShowNewPatientModal(false)}
                  className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
                >
                  <X />
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">First Name</label>
                    <input type="text" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Last Name</label>
                    <input type="text" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Email</label>
                    <input type="email" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Phone</label>
                    <input type="tel" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Date of Birth</label>
                    <input type="date" className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Smoking Status</label>
                    <select className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly">
                      <option>Current Smoker</option>
                      <option>Former Smoker</option>
                      <option>Never Smoked</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Medical History</label>
                  <textarea rows={3} className="w-full p-2 md:p-3 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 touch-friendly" placeholder="Brief medical history..."></textarea>
                </div>
              </form>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="px-4 md:px-6 py-2 text-sm md:text-base text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors touch-friendly"
              >
                Cancel
              </button>
              <button className="px-4 md:px-6 py-2 text-sm md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong touch-friendly">
                Add Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}