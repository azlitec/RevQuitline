
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

interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  yearsOfExperience: number;
  licenseNumber?: string;
  bio?: string;
  rating: number;
  reviewsCount: number;
  consultationFee: number;
  availability: string[];
  location: string;
  languages: string[];
  treatmentTypes: string[];
  qualifications: string[];
  isConnected: boolean;
  connectionStatus?: 'pending' | 'approved' | 'rejected';
}

interface Filters {
  specialty: string;
  treatmentType: string;
  location: string;
  experience: string;
  rating: string;
  priceRange: string;
  availability: string;
  language: string;
}

export default function FindDoctorsPage() {
  const { data: session } = useSession();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('rating');
  
  const [filters, setFilters] = useState<Filters>({
    specialty: '',
    treatmentType: '',
    location: '',
    experience: '',
    rating: '',
    priceRange: '',
    availability: '',
    language: ''
  });

  // Available filter options
  const filterOptions = {
    specialties: [
      'General Medicine', 'Cardiology', 'Dermatology', 'Endocrinology',
      'Gastroenterology', 'Neurology', 'Oncology', 'Orthopedics',
      'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology'
    ],
    treatmentTypes: [
      'Smoking Cessation', 'Weight Management', 'Diabetes Care',
      'Heart Disease', 'Mental Health', 'Cancer Treatment',
      'Physical Therapy', 'Addiction Recovery', 'Chronic Pain',
      'Preventive Care', 'Emergency Care', 'Telemedicine'
    ],
    locations: [
      'Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Perak',
      'Sabah', 'Sarawak', 'Kelantan', 'Terengganu', 'Pahang'
    ],
    languages: [
      'English', 'Bahasa Malaysia', 'Mandarin', 'Tamil',
      'Cantonese', 'Hindi', 'Arabic', 'Thai'
    ]
  };

  useEffect(() => {
    if (session?.user && !session.user.isProvider) {
      fetchDoctors();
    }
  }, [session]);

  useEffect(() => {
    applyFilters();
  }, [doctors, searchTerm, filters, sortBy]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/patient/doctors');
      
      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }
      
      const data = await response.json();
      setDoctors(data.doctors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...doctors];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doctor => 
        doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.treatmentTypes.some(type => 
          type.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply all filters
    if (filters.specialty) {
      filtered = filtered.filter(doctor => doctor.specialty === filters.specialty);
    }
    
    if (filters.treatmentType) {
      filtered = filtered.filter(doctor => 
        doctor.treatmentTypes.includes(filters.treatmentType)
      );
    }
    
    if (filters.location) {
      filtered = filtered.filter(doctor => doctor.location === filters.location);
    }
    
    if (filters.experience) {
      const expValue = parseInt(filters.experience);
      filtered = filtered.filter(doctor => doctor.yearsOfExperience >= expValue);
    }
    
    if (filters.rating) {
      const ratingValue = parseFloat(filters.rating);
      filtered = filtered.filter(doctor => doctor.rating >= ratingValue);
    }
    
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(doctor => 
        doctor.consultationFee >= min && doctor.consultationFee <= max
      );
    }
    
    if (filters.language) {
      filtered = filtered.filter(doctor => 
        doctor.languages.includes(filters.language)
      );
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'experience':
          return b.yearsOfExperience - a.yearsOfExperience;
        case 'price-low':
          return a.consultationFee - b.consultationFee;
        case 'price-high':
          return b.consultationFee - a.consultationFee;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.rating - a.rating;
      }
    });

    setFilteredDoctors(filtered);
  };

  const connectToDoctor = async (doctorId: string, treatmentType: string) => {
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
      setDoctors(prevDoctors => 
        prevDoctors.map(doctor => 
          doctor.id === doctorId 
            ? { ...doctor, isConnected: false, connectionStatus: 'pending' }
            : doctor
        )
      );

      alert('Connection request sent successfully!');
    } catch (err) {
      console.error('Error connecting to doctor:', err);
      alert('Failed to send connection request. Please try again.');
    }
  };

  const clearFilters = () => {
    setFilters({
      specialty: '',
      treatmentType: '',
      location: '',
      experience: '',
      rating: '',
      priceRange: '',
      availability: '',
      language: ''
    });
    setSearchTerm('');
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
          <span className="text-gray-600 font-medium">Finding doctors...</span>
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
          onClick={fetchDoctors}
          className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-6 py-2 rounded-lg font-medium transition-colors touch-friendly"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Find Healthcare Providers</h1>
          <p className="text-sm md:text-base text-gray-500 flex items-center">
            Discover and connect with qualified doctors for your healthcare needs
            <span className="ml-2 text-sm text-gray-400">•</span>
            <span className="ml-2 text-sm text-blue-600 font-medium">{filteredDoctors.length} available</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">
            {filteredDoctors.length} of {doctors.length} doctors
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="card p-4 md:p-6 mb-6 md:mb-8 shadow-strong hover:shadow-xl transition-all duration-300">
        {/* Enhanced Search Bar */}
        <div className="mb-4 md:mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by doctor name, specialty, location, or treatment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm md:text-base bg-gray-50 hover:bg-white touch-friendly"
            />
            <IconWithFallback
              icon="search"
              emoji="🔍"
              className="text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
            />
          </div>
        </div>

        {/* Enhanced Filter Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-4">
          <select
            value={filters.specialty}
            onChange={(e) => setFilters({...filters, specialty: e.target.value})}
            className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm bg-gray-50 hover:bg-white touch-friendly"
          >
            <option value="">All Specialties</option>
            {filterOptions.specialties.map(specialty => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>

          <select
            value={filters.treatmentType}
            onChange={(e) => setFilters({...filters, treatmentType: e.target.value})}
            className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm bg-gray-50 hover:bg-white touch-friendly"
          >
            <option value="">Treatment Type</option>
            {filterOptions.treatmentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filters.location}
            onChange={(e) => setFilters({...filters, location: e.target.value})}
            className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm bg-gray-50 hover:bg-white touch-friendly"
          >
            <option value="">All Locations</option>
            {filterOptions.locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>

          <select
            value={filters.experience}
            onChange={(e) => setFilters({...filters, experience: e.target.value})}
            className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm bg-gray-50 hover:bg-white touch-friendly"
          >
            <option value="">Experience</option>
            <option value="1">1+ Years</option>
            <option value="5">5+ Years</option>
            <option value="10">10+ Years</option>
            <option value="15">15+ Years</option>
          </select>

          <select
            value={filters.rating}
            onChange={(e) => setFilters({...filters, rating: e.target.value})}
            className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm bg-gray-50 hover:bg-white touch-friendly"
          >
            <option value="">All Ratings</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4.8">4.8+ Stars</option>
          </select>

          <select
            value={filters.priceRange}
            onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
            className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm bg-gray-50 hover:bg-white touch-friendly"
          >
            <option value="">Price Range</option>
            <option value="0-100">RM 0-100</option>
            <option value="100-200">RM 100-200</option>
            <option value="200-300">RM 200-300</option>
            <option value="300-500">RM 300+</option>
          </select>
        </div>

        {/* Enhanced Sort and View Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm bg-gray-50 hover:bg-white touch-friendly"
            >
              <option value="rating">Sort by Rating</option>
              <option value="experience">Sort by Experience</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Sort by Name</option>
            </select>

            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 text-sm font-semibold px-4 py-2 hover:bg-blue-50 rounded-lg transition-all duration-300 touch-friendly hover:scale-105"
            >
              Clear Filters
            </button>
          </div>

          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-md transition-all duration-300 touch-friendly hover:scale-110 ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-medium' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <IconWithFallback icon="grid_view" emoji="⊞" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-md transition-all duration-300 touch-friendly hover:scale-110 ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-medium' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <IconWithFallback icon="list" emoji="☰" />
            </button>
          </div>
        </div>
      </div>

      {/* Doctors Grid/List */}
      {filteredDoctors.length > 0 ? (
        <div className={`grid gap-4 md:gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {filteredDoctors.map((doctor) => (
            <DoctorCard 
              key={doctor.id} 
              doctor={doctor} 
              viewMode={viewMode}
              onConnect={connectToDoctor}
              getRatingStars={getRatingStars}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 md:py-20">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
            <IconWithFallback icon="search_off" emoji="🔍❌" className="text-gray-400 text-3xl md:text-4xl" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-3">No doctors found</h3>
          <p className="text-base md:text-lg text-gray-500 mb-8">
            Try adjusting your search criteria or filters to find more healthcare providers
          </p>
          <button
            onClick={clearFilters}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-lg hover:shadow-strong transition-all duration-300 font-semibold touch-friendly hover:scale-105"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </>
  );
}

// Doctor Card Component
interface DoctorCardProps {
  doctor: Doctor;
  viewMode: 'grid' | 'list';
  onConnect: (doctorId: string, treatmentType: string) => void;
  getRatingStars: (rating: number) => React.ReactElement[];
}

function DoctorCard({ doctor, viewMode, onConnect, getRatingStars }: DoctorCardProps) {
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState('');

  const handleConnect = () => {
    if (selectedTreatment) {
      onConnect(doctor.id, selectedTreatment);
      setShowTreatmentModal(false);
      setSelectedTreatment('');
    }
  };

  const initials = doctor.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);

  if (viewMode === 'list') {
    return (
      <div className="card p-4 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-102">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
          {/* Enhanced Doctor Info */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-medium hover:shadow-strong transition-all duration-300">
              {initials}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800">{doctor.name}</h3>
              <p className="text-blue-600 font-semibold">{doctor.specialty}</p>
              <div className="flex items-center space-x-2 mt-2">
                <div className="flex items-center space-x-1">
                  {getRatingStars(doctor.rating)}
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {doctor.rating} ({doctor.reviewsCount} reviews)
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2 flex items-center">
                <IconWithFallback icon="location_on" emoji="📍" className="text-gray-400 text-xs mr-2" />
                {doctor.location} • {doctor.yearsOfExperience} years experience
              </p>
            </div>
          </div>

          {/* Enhanced Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            {doctor.isConnected && (
              <div className="text-right bg-gray-50 p-3 rounded-lg">
                <p className="text-lg font-bold text-gray-800">RM {doctor.consultationFee}</p>
                <p className="text-xs text-gray-500">per consultation</p>
              </div>
            )}

            {doctor.isConnected ? (
              <div className="flex space-x-2">
                <Link
                  href={`/patient/appointments?doctor=${doctor.id}`}
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 shadow-medium hover:shadow-strong transition-all duration-300 text-sm font-semibold touch-friendly hover:scale-105"
                >
                  Book Appointment
                </Link>
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 text-sm font-semibold touch-friendly hover:scale-105">
                  Message
                </button>
              </div>
            ) : doctor.connectionStatus === 'pending' ? (
              <button disabled className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 px-6 py-3 rounded-lg text-sm font-semibold cursor-not-allowed shadow-sm">
                Request Pending
              </button>
            ) : (
              <button
                onClick={() => setShowTreatmentModal(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 text-sm font-semibold touch-friendly hover:scale-105"
              >
                Connect
              </button>
            )}
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
                Choose the type of treatment you need from Dr. {doctor.name}:
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
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-friendly"
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

  // Enhanced Grid view card
  return (
    <div className="card p-4 md:p-6 shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
      {/* Enhanced Grid view implementation */}
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-medium hover:shadow-strong transition-all duration-300 mx-auto mb-3">
          {initials}
        </div>
        <h3 className="text-lg font-bold text-gray-800">{doctor.name}</h3>
        <p className="text-blue-600 font-semibold text-sm">{doctor.specialty}</p>
        <div className="flex items-center justify-center space-x-1 mt-2">
          {getRatingStars(doctor.rating)}
          <span className="text-sm text-gray-600 font-medium ml-1">
            ({doctor.reviewsCount})
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4 text-sm bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 font-medium">Experience:</span>
          <span className="font-bold text-gray-800">{doctor.yearsOfExperience} years</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 font-medium">Location:</span>
          <span className="font-bold text-gray-800">{doctor.location}</span>
        </div>
        {doctor.isConnected && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">Fee:</span>
            <span className="font-bold text-green-600">RM {doctor.consultationFee}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {doctor.isConnected ? (
          <div className="space-y-2">
            <Link
              href={`/patient/appointments?doctor=${doctor.id}`}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 shadow-medium hover:shadow-strong transition-all duration-300 text-sm font-semibold text-center block touch-friendly hover:scale-105"
            >
              Book Appointment
            </Link>
            <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 text-sm font-semibold touch-friendly hover:scale-105">
              Message Doctor
            </button>
          </div>
        ) : doctor.connectionStatus === 'pending' ? (
          <button disabled className="w-full bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 py-3 px-4 rounded-lg text-sm font-semibold cursor-not-allowed shadow-sm">
            Connection Pending
          </button>
        ) : (
          <button
            onClick={() => setShowTreatmentModal(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-medium hover:shadow-strong transition-all duration-300 text-sm font-semibold touch-friendly hover:scale-105"
          >
            Connect with Doctor
          </button>
        )}
      </div>

      {/* Treatment Selection Modal */}
      {showTreatmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Select Treatment Type
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose the type of treatment you need from Dr. {doctor.name}:
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
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-friendly"
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
                