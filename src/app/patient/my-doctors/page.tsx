'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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

interface DoctorConnection {
  id: string;
  doctor: {
    id: string;
    title: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    specialty: string;
    subSpecialties: string[];
    yearsOfExperience: number;
    rating: number;
    reviewsCount: number;
    patientsServed: number;
    consultationFee: number;
    // Professional Credentials
    medicalLicense: string;
    medicalSchool: string;
    residency: string;
    fellowships: string[];
    boardCertifications: string[];
    // Location & Practice
    clinicName: string;
    clinicAddress: string;
    city: string;
    state: string;
    // Services & Expertise
    servicesOffered: string[];
    treatmentTypes: string[];
    languagesSpoken: string[];
    // Professional Information
    about: string;
    treatmentPhilosophy: string;
    education: string[];
    awards: string[];
    memberships: string[];
    // Availability
    officeHours: {
      monday: string;
      tuesday: string;
      wednesday: string;
      thursday: string;
      friday: string;
      saturday: string;
      sunday: string;
    };
    acceptingNewPatients: boolean;
    emergencyAvailable: boolean;
  };
  treatmentType: string;
  status: 'pending' | 'approved' | 'rejected' | 'disconnected';
  connectedAt?: string;
  outstandingBalance: number;
  canDisconnect: boolean;
  totalAppointments: number;
  lastAppointment?: string;
  nextAppointment?: string;
}

export default function MyDoctorsPage() {
  const { data: session } = useSession();
  const [connections, setConnections] = useState<DoctorConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'approved' | 'pending'>('approved');
  const [showDisconnectModal, setShowDisconnectModal] = useState<string | null>(null);
  const [disconnectReason, setDisconnectReason] = useState('');

  useEffect(() => {
    if (session?.user && !session.user.isProvider) {
      fetchConnections();
    }
  }, [session]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/patient/my-doctors');
      
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/patient/my-doctors/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          connectionId, 
          reason: disconnectReason 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect from doctor');
      }

      // Refresh connections
      fetchConnections();
      setShowDisconnectModal(null);
      setDisconnectReason('');
      
      alert('Disconnection request sent successfully!');
    } catch (err) {
      console.error('Error disconnecting from doctor:', err);
      alert(err instanceof Error ? err.message : 'Failed to disconnect. Please try again.');
    }
  };

  const filteredConnections = connections.filter(connection => {
    if (selectedTab === 'all') return true;
    return connection.status === selectedTab;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
      disconnected: 'bg-gray-100 text-gray-700'
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      approved: { icon: 'check_circle', emoji: '✅' },
      pending: { icon: 'schedule', emoji: '⏰' },
      rejected: { icon: 'cancel', emoji: '❌' },
      disconnected: { icon: 'link_off', emoji: '🔗❌' }
    };
    return icons[status as keyof typeof icons] || icons.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading your doctors...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 bg-red-50 text-red-700 rounded-xl shadow-soft max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <IconWithFallback icon="error_outline" emoji="⚠️" className="text-red-600" />
          <h2 className="text-xl font-bold">Error Loading Doctors</h2>
        </div>
        <p className="mb-4">{error}</p>
        <button 
          onClick={fetchConnections}
          className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-6 py-2 rounded-lg font-medium transition-colors touch-friendly"
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Healthcare Providers</h1>
          <p className="text-sm md:text-base text-gray-500">
            Manage your connections with healthcare providers
          </p>
        </div>
        <Link
          href="/patient/doctors"
          className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly"
        >
          <IconWithFallback icon="search" emoji="🔍" className="text-white" />
          <span>Find More Doctors</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="card p-3 md:p-6 shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-green-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="check_circle" emoji="✅" className="text-green-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Connected</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">
                {connections.filter(c => c.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-yellow-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="schedule" emoji="⏰" className="text-yellow-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Pending</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">
                {connections.filter(c => c.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-blue-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="event" emoji="📅" className="text-blue-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Appointments</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">
                {connections.reduce((sum, c) => sum + c.totalAppointments, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-3 md:p-6 shadow-soft">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="bg-orange-100 p-2 md:p-3 rounded-lg md:rounded-xl">
              <IconWithFallback icon="payment" emoji="💰" className="text-orange-600 text-sm md:text-base" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Outstanding</p>
              <p className="text-lg md:text-2xl font-bold text-gray-800">
                RM {connections.reduce((sum, c) => sum + c.outstandingBalance, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 md:mb-8 w-full md:w-fit overflow-x-auto">
        {[
          { key: 'approved', label: 'Connected Doctors', icon: 'check_circle', emoji: '✅' },
          { key: 'pending', label: 'Pending Requests', icon: 'schedule', emoji: '⏰' },
          { key: 'all', label: 'All Connections', icon: 'list', emoji: '📋' }
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
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Doctors List */}
      {filteredConnections.length > 0 ? (
        <div className="space-y-4 md:space-y-6">
          {filteredConnections.map((connection) => {
            const doctor = connection.doctor;
            const initials = `${doctor.firstName?.charAt(0) || ''}${doctor.lastName?.charAt(0) || ''}`.toUpperCase() || doctor.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
            const statusIcon = getStatusIcon(connection.status);
            
            return (
              <div key={connection.id} className="card p-4 md:p-6 shadow-soft hover:shadow-medium transition-all duration-300">
                {/* Professional Header */}
                <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                  {/* Doctor Profile Section */}
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Professional Title & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">
                            {doctor.title} {doctor.firstName} {doctor.lastName}
                          </h3>
                          <p className="text-blue-600 font-semibold text-lg">{doctor.specialty}</p>
                          {doctor.subSpecialties && doctor.subSpecialties.length > 0 && (
                            <p className="text-sm text-gray-600">
                              Subspecialties: {doctor.subSpecialties.join(', ')}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold w-fit ${getStatusBadge(connection.status)}`}>
                          <IconWithFallback
                            icon={statusIcon.icon}
                            emoji={statusIcon.emoji}
                            className="text-xs"
                          />
                          <span>{connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}</span>
                        </span>
                      </div>

                      {/* Professional Credentials */}
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                          <IconWithFallback icon="school" emoji="🎓" className="text-blue-600 mr-2" />
                          Professional Credentials
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {doctor.medicalLicense && (
                            <div>
                              <span className="text-gray-600">License:</span>
                              <span className="font-medium ml-2">{doctor.medicalLicense}</span>
                            </div>
                          )}
                          {doctor.medicalSchool && (
                            <div>
                              <span className="text-gray-600">Medical School:</span>
                              <span className="font-medium ml-2">{doctor.medicalSchool}</span>
                            </div>
                          )}
                          {doctor.residency && (
                            <div className="md:col-span-2">
                              <span className="text-gray-600">Residency:</span>
                              <span className="font-medium ml-2">{doctor.residency}</span>
                            </div>
                          )}
                        </div>
                        {doctor.boardCertifications && doctor.boardCertifications.length > 0 && (
                          <div className="mt-2">
                            <span className="text-gray-600 text-sm">Board Certifications:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doctor.boardCertifications.map((cert, index) => (
                                <span key={index} className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                  {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Practice Information */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                          <IconWithFallback icon="local_hospital" emoji="🏥" className="text-gray-600 mr-2" />
                          Practice Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {doctor.clinicName && (
                            <div>
                              <span className="text-gray-600">Clinic:</span>
                              <p className="font-medium">{doctor.clinicName}</p>
                            </div>
                          )}
                          {doctor.city && doctor.state && (
                            <div>
                              <span className="text-gray-600">Location:</span>
                              <p className="font-medium">{doctor.city}, {doctor.state}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Experience:</span>
                            <p className="font-medium">{doctor.yearsOfExperience} years</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Patients Served:</span>
                            <p className="font-medium">{doctor.patientsServed || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Consultation Fee:</span>
                            <p className="font-medium text-green-600">RM {doctor.consultationFee}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Rating:</span>
                            <p className="font-medium">{doctor.rating} ⭐ ({doctor.reviewsCount} reviews)</p>
                          </div>
                        </div>
                      </div>

                      {/* Languages & Services */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {doctor.languagesSpoken && doctor.languagesSpoken.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-800 mb-2 text-sm flex items-center">
                              <IconWithFallback icon="language" emoji="🌐" className="text-gray-600 mr-1 text-sm" />
                              Languages
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {doctor.languagesSpoken.map((lang, index) => (
                                <span key={index} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {doctor.servicesOffered && doctor.servicesOffered.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-800 mb-2 text-sm flex items-center">
                              <IconWithFallback icon="medical_services" emoji="🩺" className="text-gray-600 mr-1 text-sm" />
                              Services
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {doctor.servicesOffered.slice(0, 3).map((service, index) => (
                                <span key={index} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                                  {service}
                                </span>
                              ))}
                              {doctor.servicesOffered.length > 3 && (
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                                  +{doctor.servicesOffered.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Your Connection Details */}
                      <div className="border-t pt-4">
                        <h5 className="font-medium text-gray-800 mb-2 text-sm">Your Connection</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Treatment:</span>
                            <p className="font-medium text-blue-600">{connection.treatmentType}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Appointments:</span>
                            <p className="font-medium">{connection.totalAppointments}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Outstanding:</span>
                            <p className={`font-medium ${connection.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              RM {connection.outstandingBalance}
                            </p>
                          </div>
                          {connection.connectedAt && (
                            <div>
                              <span className="text-gray-500">Connected:</span>
                              <p className="font-medium">{new Date(connection.connectedAt).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 lg:w-48">
                    {connection.status === 'approved' ? (
                      <>
                        <Link
                          href={`/patient/appointments?doctor=${doctor.id}`}
                          className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-sm font-medium text-center touch-friendly flex items-center justify-center space-x-2"
                        >
                          <IconWithFallback icon="calendar_today" emoji="📅" className="text-white" />
                          <span>Book Appointment</span>
                        </Link>
                        <Link
                          href="/patient/messages"
                          className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium text-center touch-friendly flex items-center justify-center space-x-2"
                        >
                          <IconWithFallback icon="chat" emoji="💬" className="text-white" />
                          <span>Message</span>
                        </Link>
                        <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors text-sm font-medium touch-friendly flex items-center justify-center space-x-2">
                          <IconWithFallback icon="visibility" emoji="👁️" className="text-gray-600" />
                          <span>View Profile</span>
                        </button>
                        {connection.canDisconnect && connection.outstandingBalance === 0 && (
                          <button
                            onClick={() => setShowDisconnectModal(connection.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors text-sm font-medium touch-friendly flex items-center justify-center space-x-2"
                          >
                            <IconWithFallback icon="link_off" emoji="🔗❌" className="text-white" />
                            <span>Disconnect</span>
                          </button>
                        )}
                        {connection.outstandingBalance > 0 && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                            <div className="flex items-center space-x-2">
                              <IconWithFallback icon="payment" emoji="💰" className="text-red-600" />
                              <span className="font-medium">Outstanding Balance</span>
                            </div>
                            <p className="text-xs mt-1">Pay RM {connection.outstandingBalance} to disconnect</p>
                          </div>
                        )}
                      </>
                    ) : connection.status === 'pending' ? (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-center">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <IconWithFallback icon="schedule" emoji="⏰" className="text-yellow-600" />
                          <span className="font-medium">Waiting for Approval</span>
                        </div>
                        <p className="text-xs">You'll be notified once approved</p>
                      </div>
                    ) : connection.status === 'rejected' ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <IconWithFallback icon="cancel" emoji="❌" className="text-red-600" />
                          <span className="font-medium">Request Declined</span>
                        </div>
                        <Link
                          href="/patient/doctors"
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                        >
                          Find Other Doctors
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 md:py-16">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconWithFallback 
              icon={selectedTab === 'pending' ? 'schedule' : selectedTab === 'approved' ? 'people' : 'search'} 
              emoji={selectedTab === 'pending' ? '⏰' : selectedTab === 'approved' ? '👥' : '🔍'} 
              className="text-gray-400 text-2xl md:text-3xl" 
            />
          </div>
          <h3 className="text-lg md:text-xl font-medium text-gray-600 mb-2">
            {selectedTab === 'pending' ? 'No pending requests' : 
             selectedTab === 'approved' ? 'No connected doctors yet' : 'No doctor connections'}
          </h3>
          <p className="text-sm md:text-base text-gray-500 mb-6">
            {selectedTab === 'pending' ? 'Your connection requests will appear here' :
             selectedTab === 'approved' ? 'Start by connecting with healthcare providers' :
             'All your doctor connections will appear here'}
          </p>
          <Link
            href="/patient/doctors"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium touch-friendly"
          >
            Find Healthcare Providers
          </Link>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Confirm Disconnection
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to disconnect from this doctor? This action will require approval.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for disconnection (optional):
              </label>
              <textarea
                value={disconnectReason}
                onChange={(e) => setDisconnectReason(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Please provide a reason..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDisconnectModal(null);
                  setDisconnectReason('');
                }}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisconnect(showDisconnectModal)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors text-sm font-medium touch-friendly"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}