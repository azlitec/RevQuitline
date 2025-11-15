'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { Save, CheckCircle, Trash2, Plus, HelpCircle } from 'lucide-react';

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

interface DoctorProfile {
  // Basic Information
  profilePhoto?: string;
  title: string;
  firstName: string;
  lastName: string;
  specialty: string;
  subSpecialties: string[];
  
  // Professional Credentials
  medicalLicense: string;
  medicalSchool: string;
  residency: string;
  fellowships: string[];
  boardCertifications: string[];
  
  // Experience & Practice
  yearsOfExperience: number;
  patientsServed: number;
  consultationFee: number;
  
  // Location & Contact
  clinicName: string;
  clinicAddress: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  
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
  
  // Settings
  acceptingNewPatients: boolean;
  emergencyAvailable: boolean;
}

export default function ProviderProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<DoctorProfile>({
    title: 'Dr.',
    firstName: '',
    lastName: '',
    specialty: '',
    subSpecialties: [],
    medicalLicense: '',
    medicalSchool: '',
    residency: '',
    fellowships: [],
    boardCertifications: [],
    yearsOfExperience: 0,
    patientsServed: 0,
    consultationFee: 150,
    clinicName: '',
    clinicAddress: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    servicesOffered: [],
    treatmentTypes: [],
    languagesSpoken: [],
    about: '',
    treatmentPhilosophy: '',
    education: [],
    awards: [],
    memberships: [],
    officeHours: {
      monday: '9:00 AM - 5:00 PM',
      tuesday: '9:00 AM - 5:00 PM',
      wednesday: '9:00 AM - 5:00 PM',
      thursday: '9:00 AM - 5:00 PM',
      friday: '9:00 AM - 5:00 PM',
      saturday: 'Closed',
      sunday: 'Closed'
    },
    acceptingNewPatients: true,
    emergencyAvailable: false
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
      const response = await fetch('/api/provider/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({ ...prev, ...data.profile }));
      }
    } catch (err) {
      console.log('Profile API not yet implemented - using default profile');
    }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/provider/profile', {
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

  const updateProfile = (field: keyof DoctorProfile, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addToArray = (field: keyof DoctorProfile, value: string) => {
    if (value.trim()) {
      setProfile(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value.trim()]
      }));
    }
  };

  const removeFromArray = (field: keyof DoctorProfile, index: number) => {
    setProfile(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: 'person', emoji: '👤' },
    { id: 'credentials', label: 'Credentials', icon: 'school', emoji: '🎓' },
    { id: 'services', label: 'Services', icon: 'medical_services', emoji: '🏥' },
    { id: 'availability', label: 'Availability', icon: 'schedule', emoji: '⏰' },
    { id: 'about', label: 'About', icon: 'info', emoji: 'ℹ️' }
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Professional Profile</h2>
          <p className="text-sm md:text-base text-gray-500">Manage your professional information visible to patients</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={saveProfile}
            disabled={loading}
            className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-medium hover:shadow-strong flex items-center justify-center space-x-2 text-sm md:text-base touch-friendly disabled:opacity-50"
          >
            <Save className="text-white" />
            <span>{loading ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* Success Message */}
      {savedMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
          <CheckCircle className="text-green-600" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-3 md:px-6 py-2 md:py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-1 md:space-x-2 text-sm md:text-base whitespace-nowrap touch-friendly ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 active:bg-white/70'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <IconWithFallback
              icon={tab.icon}
              emoji={tab.emoji}
              className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}
            />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Content */}
      <div className="card p-4 md:p-6 shadow-soft">
        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
            
            {/* Profile Photo */}
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Profile Photo</h4>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm">
                  Upload Photo
                </button>
                <p className="text-xs text-gray-500 mt-1">Recommended: 400x400px, JPG or PNG</p>
              </div>
            </div>

            {/* Basic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <select
                  value={profile.title}
                  onChange={(e) => updateProfile('title', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                >
                  <option value="Dr.">Dr.</option>
                  <option value="Prof. Dr.">Prof. Dr.</option>
                  <option value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</option>
                  <option value="Dato' Dr.">Dato' Dr.</option>
                  <option value="Datuk Dr.">Datuk Dr.</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Specialty</label>
                <select
                  value={profile.specialty}
                  onChange={(e) => updateProfile('specialty', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                >
                  <option value="">Select Specialty</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Family Medicine">Family Medicine</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Endocrinology">Endocrinology</option>
                  <option value="Pulmonology">Pulmonology</option>
                  <option value="Smoking Cessation">Smoking Cessation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => updateProfile('firstName', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="Enter your first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => updateProfile('lastName', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="Enter your last name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateProfile('email', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="+60123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                <input
                  type="number"
                  value={profile.yearsOfExperience}
                  onChange={(e) => updateProfile('yearsOfExperience', parseInt(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="10"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Fee (RM)</label>
                <input
                  type="number"
                  value={profile.consultationFee}
                  onChange={(e) => updateProfile('consultationFee', parseInt(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="150"
                  min="0"
                />
              </div>
            </div>

            {/* Clinic Information */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Clinic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Name</label>
                  <input
                    type="text"
                    value={profile.clinicName}
                    onChange={(e) => updateProfile('clinicName', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                    placeholder="Prime Healthcare Clinic"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={profile.clinicAddress}
                    onChange={(e) => updateProfile('clinicAddress', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                    placeholder="123 Medical Centre, Jalan Sehat"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => updateProfile('city', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                    placeholder="Kuala Lumpur"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <select
                    value={profile.state}
                    onChange={(e) => updateProfile('state', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  >
                    <option value="">Select State</option>
                    <option value="Kuala Lumpur">Kuala Lumpur</option>
                    <option value="Selangor">Selangor</option>
                    <option value="Penang">Penang</option>
                    <option value="Johor">Johor</option>
                    <option value="Perak">Perak</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Credentials Tab */}
        {activeTab === 'credentials' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Professional Credentials</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical License Number</label>
                <input
                  type="text"
                  value={profile.medicalLicense}
                  onChange={(e) => updateProfile('medicalLicense', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="MMC12345"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical School</label>
                <input
                  type="text"
                  value={profile.medicalSchool}
                  onChange={(e) => updateProfile('medicalSchool', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="University of Malaya"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Residency</label>
                <input
                  type="text"
                  value={profile.residency}
                  onChange={(e) => updateProfile('residency', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="Internal Medicine - Hospital Kuala Lumpur"
                />
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Services & Expertise</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
              <div className="space-y-2">
                {profile.languagesSpoken.map((lang, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={lang}
                      readOnly
                      className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={() => removeFromArray('languagesSpoken', index)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add language (e.g., English, Bahasa Malaysia)..."
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('languagesSpoken', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addToArray('languagesSpoken', input.value);
                      input.value = '';
                    }}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                  >
                    <Plus />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Schedule & Availability</h3>
            
            <div className="space-y-4">
              {Object.entries(profile.officeHours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-24 font-medium text-gray-700 capitalize">{day}:</div>
                  <input
                    type="text"
                    value={hours}
                    onChange={(e) => updateProfile('officeHours', {
                      ...profile.officeHours,
                      [day]: e.target.value
                    })}
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="9:00 AM - 5:00 PM"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={profile.acceptingNewPatients}
                  onChange={(e) => updateProfile('acceptingNewPatients', e.target.checked)}
                  className="w-5 h-5 text-blue-600"
                />
                <label className="text-gray-700">Accepting New Patients</label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={profile.emergencyAvailable}
                  onChange={(e) => updateProfile('emergencyAvailable', e.target.checked)}
                  className="w-5 h-5 text-blue-600"
                />
                <label className="text-gray-700">Available for Emergency Consultations</label>
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">About You</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">About</label>
              <textarea
                value={profile.about}
                onChange={(e) => updateProfile('about', e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                placeholder="Describe yourself, your approach to healthcare, and what makes you unique as a healthcare provider..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Philosophy</label>
              <textarea
                value={profile.treatmentPhilosophy}
                onChange={(e) => updateProfile('treatmentPhilosophy', e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                placeholder="Describe your approach to patient care and treatment philosophy..."
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}