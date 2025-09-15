'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Enhanced Icon component with fallbacks
const IconWithFallback = ({
  icon,
  emoji,
  className = ''
}: {
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

interface Doctor {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  specialty: string;
  yearsOfExperience: number;
  licenseNumber?: string;
  rating: number;
  reviewsCount: number;
  availability: string[];
  location: string;
  languages: string[];
  treatmentTypes: string[];
  qualifications: string[];
  profileImage?: string;
  phone?: string;
  address?: string;
  isConnected: boolean;
  connectionStatus?: 'pending' | 'approved';
  memberSince: Date;
}

export default function DoctorProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState('');

  useEffect(() => {
    if (session?.user && !session.user.isProvider) {
      fetchDoctorProfile();
    }
  }, [session, doctorId]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/patient/doctors/${doctorId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Doctor not found');
        }
        throw new Error('Failed to fetch doctor profile');
      }

      const data = await response.json();
      setDoctor(data.doctor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching doctor profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectToDoctor = async (treatmentType: string) => {
    try {
      const response = await fetch('/api/patient/doctors/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId,
          treatmentType,
          message: `I would like to connect for ${treatmentType} treatment.`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send connection request');
      }

      // Update local state
      setDoctor(prev => prev ? {
        ...prev,
        isConnected: false,
        connectionStatus: 'pending'
      } : null);

      alert('Connection request sent successfully!');
      setShowTreatmentModal(false);
      setSelectedTreatment('');
    } catch (err) {
      console.error('Error connecting to doctor:', err);
      alert('Failed to send connection request. Please try again.');
    }
  };

  const handleConnect = () => {
    if (selectedTreatment) {
      connectToDoctor(selectedTreatment);
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <IconWithFallback
        key={i}
        icon="star"
        emoji="⭐"
        className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600" />
          </div>
          <span className="text-gray-600 font-medium">Loading doctor profile...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 bg-red-50 text-red-700 rounded-xl shadow-soft max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <IconWithFallback icon="error_outline" emoji="⚠️" className="text-red-600" />
          <h2 className="text-xl font-bold">Error Loading Profile</h2>
        </div>
        <p className="mb-4">{error}</p>
        <div className="flex space-x-3">
          <button
            onClick={fetchDoctorProfile}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/patient/doctors"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Doctors
          </Link>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-700">Doctor not found</h2>
        <Link
          href="/patient/doctors"
          className="text-blue-600 hover:text-blue-800 mt-4 inline-block"
        >
          Back to Doctors
        </Link>
      </div>
    );
  }

  const initials = doctor.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/patient/doctors"
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <IconWithFallback icon="arrow_back" emoji="⬅️" />
          <span>Back to Doctors</span>
        </Link>
        <div className="text-sm text-gray-500">
          Member since {new Date(doctor.memberSince).getFullYear()}
        </div>
      </div>

      {/* Profile Header */}
      <div className="card p-6 md:p-8 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            {doctor.profileImage ? (
              <img
                src={doctor.profileImage}
                alt={doctor.name}
                className="w-32 h-32 rounded-full object-cover shadow-medium"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-medium">
                {initials}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{doctor.name}</h1>
              <p className="text-xl text-blue-600 font-semibold">{doctor.specialty}</p>
              <div className="flex items-center space-x-2 mt-2">
                <div className="flex items-center space-x-1">
                  {getRatingStars(doctor.rating)}
                </div>
                <span className="text-lg font-medium text-gray-700">
                  {doctor.rating} ({doctor.reviewsCount} reviews)
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{doctor.yearsOfExperience}</div>
                <div className="text-sm text-gray-600">Years Experience</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{doctor.languages.length}</div>
                <div className="text-sm text-gray-600">Languages</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{doctor.treatmentTypes.length}</div>
                <div className="text-sm text-gray-600">Specializations</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {doctor.isConnected ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/patient/appointments?doctor=${doctor.id}`}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 shadow-medium hover:shadow-strong transition-all duration-300 text-center font-semibold"
                  >
                    Book Appointment
                  </Link>
                  <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 font-semibold">
                    Send Message
                  </button>
                </div>
              ) : doctor.connectionStatus === 'pending' ? (
                <button disabled className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 px-6 py-3 rounded-lg text-sm font-semibold cursor-not-allowed shadow-sm">
                  Connection Request Pending
                </button>
              ) : (
                <button
                  onClick={() => setShowTreatmentModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 font-semibold"
                >
                  Connect with Doctor
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <div className="card p-6 shadow-soft">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">{doctor.bio}</p>
          </div>

          {/* Specializations */}
          <div className="card p-6 shadow-soft">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Specializations & Treatment Types</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {doctor.treatmentTypes.map((treatment, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <IconWithFallback icon="local_hospital" emoji="🏥" className="text-blue-600" />
                  <span className="text-gray-700 font-medium">{treatment}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Qualifications */}
          <div className="card p-6 shadow-soft">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Qualifications & Certifications</h2>
            <div className="space-y-3">
              {doctor.qualifications.map((qualification, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <IconWithFallback icon="school" emoji="🎓" className="text-green-600" />
                  <span className="text-gray-700 font-medium">{qualification}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="card p-6 shadow-soft">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <IconWithFallback icon="location_on" emoji="📍" className="text-gray-500" />
                <span className="text-gray-700">{doctor.location}</span>
              </div>
              {doctor.phone && (
                <div className="flex items-center space-x-3">
                  <IconWithFallback icon="phone" emoji="📞" className="text-gray-500" />
                  <span className="text-gray-700">{doctor.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <IconWithFallback icon="email" emoji="✉️" className="text-gray-500" />
                <span className="text-gray-700">{doctor.email}</span>
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="card p-6 shadow-soft">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Languages Spoken</h3>
            <div className="flex flex-wrap gap-2">
              {doctor.languages.map((language, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="card p-6 shadow-soft">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Availability</h3>
            <div className="space-y-2">
              {doctor.availability.map((day, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <IconWithFallback icon="schedule" emoji="🕐" className="text-green-600" />
                  <span className="text-gray-700">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Treatment Selection Modal */}
      {showTreatmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Select Treatment Type
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose the type of treatment you need from Dr. {doctor.firstName || doctor.name}:
            </p>
            <div className="space-y-2 mb-6">
              {doctor.treatmentTypes.map((treatment) => (
                <label key={treatment} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="treatment"
                    value={treatment}
                    checked={selectedTreatment === treatment}
                    onChange={(e) => setSelectedTreatment(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{treatment}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowTreatmentModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!selectedTreatment}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}