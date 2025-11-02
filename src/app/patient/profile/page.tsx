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

interface PatientProfile {
  // Basic Information
  profilePhoto?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  
  // Medical Information
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  emergencyContact: string;
  emergencyPhone: string;
  
  // Smoking Information
  smokingStatus: string;
  smokingHistory: string;
  quitAttempts: number;
  quitDate: string;
  
  // Preferences
  preferredLanguage: string;
  communicationPreferences: string[];
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export default function PatientProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<PatientProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    medicalHistory: '',
    currentMedications: '',
    allergies: '',
    emergencyContact: '',
    emergencyPhone: '',
    smokingStatus: 'unknown',
    smokingHistory: '',
    quitAttempts: 0,
    quitDate: '',
    preferredLanguage: 'English',
    communicationPreferences: [],
    notificationPreferences: {
      email: true,
      sms: false,
      push: true
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (session?.user) {
      // Pre-fill with session data
      setProfile(prev => ({
        ...prev,
        firstName: session.user.name?.split(' ')[0] || '',
        lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
        email: session.user.email || ''
      }));
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/patient/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({ ...prev, ...data.profile }));
      }
    } catch (err) {
      console.log('Patient profile API not yet implemented - using default profile');
    }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patient/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = (errJson && (errJson.error || errJson.message)) || 'Failed to update profile';
        setSavedMessage(`Error: ${errMsg}`);
        return;
      }

      setSavedMessage('Profile updated successfully!');
    } catch (err) {
      setSavedMessage('Error: Failed to update profile');
    } finally {
      setLoading(false);
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const updateProfile = (field: keyof PatientProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: 'person', emoji: '👤' },
    { id: 'medical', label: 'Medical Info', icon: 'medical_services', emoji: '🏥' },
    { id: 'smoking', label: 'Smoking Info', icon: 'smoke_free', emoji: '🚭' },
    { id: 'preferences', label: 'Preferences', icon: 'settings', emoji: '⚙️' }
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Profile</h1>
            <p className="text-gray-600">Manage your personal and medical information</p>
          </div>

          {/* Save Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={saveProfile}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <IconWithFallback icon="save" emoji="💾" />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>

          {/* Success Message */}
          {savedMessage && (
            <div className={`text-center mb-6 p-3 rounded-lg ${
              savedMessage.includes('Error') 
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}>
              {savedMessage}
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-wrap justify-center mb-8 bg-white rounded-lg shadow-lg p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <IconWithFallback icon={tab.icon} emoji={tab.emoji} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => updateProfile('firstName', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => updateProfile('lastName', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => updateProfile('email', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => updateProfile('phone', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => updateProfile('dateOfBirth', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => updateProfile('gender', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => updateProfile('address', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={profile.city}
                      onChange={(e) => updateProfile('city', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={profile.state}
                      onChange={(e) => updateProfile('state', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Medical Info Tab */}
            {activeTab === 'medical' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Medical Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                  <textarea
                    value={profile.medicalHistory}
                    onChange={(e) => updateProfile('medicalHistory', e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your medical history, past surgeries, chronic conditions, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
                  <textarea
                    value={profile.currentMedications}
                    onChange={(e) => updateProfile('currentMedications', e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="List all medications you are currently taking, including dosages"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                  <textarea
                    value={profile.allergies}
                    onChange={(e) => updateProfile('allergies', e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="List any known allergies to medications, foods, or other substances"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={profile.emergencyContact}
                      onChange={(e) => updateProfile('emergencyContact', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={profile.emergencyPhone}
                      onChange={(e) => updateProfile('emergencyPhone', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Smoking Info Tab */}
            {activeTab === 'smoking' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Smoking Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Smoking Status</label>
                  <select
                    value={profile.smokingStatus}
                    onChange={(e) => updateProfile('smokingStatus', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="never">Never smoked</option>
                    <option value="former">Former smoker</option>
                    <option value="current">Current smoker</option>
                    <option value="occasional">Occasional smoker</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Smoking History</label>
                  <textarea
                    value={profile.smokingHistory}
                    onChange={(e) => updateProfile('smokingHistory', e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your smoking history (when started, how much, etc.)"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Quit Attempts</label>
                    <input
                      type="number"
                      min="0"
                      value={profile.quitAttempts}
                      onChange={(e) => updateProfile('quitAttempts', parseInt(e.target.value) || 0)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quit Date (if applicable)</label>
                    <input
                      type="date"
                      value={profile.quitDate}
                      onChange={(e) => updateProfile('quitDate', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Preferences</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
                  <select
                    value={profile.preferredLanguage}
                    onChange={(e) => updateProfile('preferredLanguage', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="English">English</option>
                    <option value="Malay">Bahasa Malaysia</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Tamil">Tamil</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">Notification Preferences</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={profile.notificationPreferences.email}
                        onChange={(e) => updateProfile('notificationPreferences', {
                          ...profile.notificationPreferences,
                          email: e.target.checked
                        })}
                        className="w-5 h-5 text-blue-600"
                      />
                      <label className="text-gray-700">Email notifications</label>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={profile.notificationPreferences.sms}
                        onChange={(e) => updateProfile('notificationPreferences', {
                          ...profile.notificationPreferences,
                          sms: e.target.checked
                        })}
                        className="w-5 h-5 text-blue-600"
                      />
                      <label className="text-gray-700">SMS notifications</label>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={profile.notificationPreferences.push}
                        onChange={(e) => updateProfile('notificationPreferences', {
                          ...profile.notificationPreferences,
                          push: e.target.checked
                        })}
                        className="w-5 h-5 text-blue-600"
                      />
                      <label className="text-gray-700">Push notifications</label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}