'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

// Define types for FloatingElement props
interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

// Smooth floating animation
const FloatingElement = ({ children, className, delay = 0 }: FloatingElementProps) => (
  <div
    className={`animate-float ${className}`}
    style={{
      animation: `float 8s ease-in-out infinite ${delay}s`,
    }}
  >
    {children}
  </div>
);

// User Type Selection Component
const UserTypeSelector = ({ selectedType, onSelect }: { selectedType: string; onSelect: (type: string) => void }) => (
  <div className="mb-6">
    <p className="text-gray-600 text-sm mb-3 text-center">I am registering as:</p>
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onSelect('patient')}
        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
          selectedType === 'patient'
            ? 'border-blue-300 bg-blue-50 shadow-md'
            : 'border-gray-300 bg-gray-50 hover:border-blue-200 hover:bg-blue-25'
        }`}
      >
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center ${
            selectedType === 'patient' ? 'bg-blue-300' : 'bg-gray-100'
          }`}>
            <svg className={`w-5 h-5 ${selectedType === 'patient' ? 'text-white' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
          </div>
          <span className={`text-sm font-medium ${selectedType === 'patient' ? 'text-blue-700' : 'text-gray-600'}`}>
            Patient
          </span>
        </div>
      </button>
      
      <button
        type="button"
        onClick={() => onSelect('doctor')}
        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
          selectedType === 'doctor'
            ? 'border-blue-300 bg-blue-50 shadow-md'
            : 'border-gray-300 bg-gray-50 hover:border-blue-200 hover:bg-blue-25'
        }`}
      >
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center ${
            selectedType === 'doctor' ? 'bg-blue-300' : 'bg-gray-100'
          }`}>
            <svg className={`w-5 h-5 ${selectedType === 'doctor' ? 'text-white' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span className={`text-sm font-medium ${selectedType === 'doctor' ? 'text-blue-700' : 'text-gray-600'}`}>
            Doctor
          </span>
        </div>
      </button>
    </div>
  </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'patient',
    licenseNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    // Enhanced password validation to match backend requirements
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordErrors = [];
      if (formData.password.length < 8) passwordErrors.push('at least 8 characters');
      if (!/[A-Z]/.test(formData.password)) passwordErrors.push('an uppercase letter');
      if (!/\d/.test(formData.password)) passwordErrors.push('a number');
      if (!/[!@#$%^&*()_\-+=\[{\]}\\|;:'",.<>/?`~]/.test(formData.password)) passwordErrors.push('a special character');
      
      if (passwordErrors.length > 0) {
        newErrors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }

    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    // Enhanced phone validation to match backend requirements
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^\+60\d{8,10}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = 'Phone must be in Malaysian format (+60123456789) or leave empty';
      }
    }

    // Validate medical registration number for doctors
    if (formData.userType === 'doctor' && !formData.licenseNumber) {
      newErrors.licenseNumber = 'Medical registration number is required for doctors';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          userType: formData.userType,
          licenseNumber: formData.userType === 'doctor' ? formData.licenseNumber : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors: Record<string, string> = {};
          data.errors.forEach((error: any) => {
            if (error.path && error.path.length > 0) {
              const field = error.path[0];
              backendErrors[field] = error.message;
            }
          });
          setErrors(backendErrors);
          throw new Error('Please fix the validation errors above');
        }
        throw new Error(data.message || data.detail || 'An error occurred during registration');
      }

      // Automatically log the user in after successful registration
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (signInResult?.error) {
        throw new Error('Failed to log in after registration');
      }

      // Redirect after successful registration
      // Doctors go to pending approval page, patients go to dashboard
      const dashboardPath = formData.userType === 'doctor' ? '/provider/pending' : '/patient/dashboard';
      router.push(dashboardPath);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
      
      <div className="flex flex-col lg:flex-row min-h-screen bg-white">
        {/* Left side - Hero Content */}
        <div className="flex-1 bg-gradient-to-br from-gray-50 via-white to-blue-25 p-8 relative overflow-hidden order-2 lg:order-1">
          {/* Floating medical icons */}
          <FloatingElement className="absolute top-20 right-20 opacity-10">
            <div className="w-20 h-20 rounded-full bg-blue-200 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.75 2.524 9.026 9.026 0 01-1 .001z"/>
              </svg>
            </div>
          </FloatingElement>
          
          <FloatingElement className="absolute bottom-28 left-16 opacity-10" delay={2}>
            <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
              </svg>
            </div>
          </FloatingElement>
          
          <FloatingElement className="absolute top-40 left-32 opacity-10" delay={4}>
            <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </FloatingElement>
          
          <div className="relative z-10 h-full flex flex-col justify-between max-w-2xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <div className="bg-white p-3 rounded-xl shadow-lg mr-4">
                  <div className="w-8 h-8 bg-blue-300 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Quitline</h2>
                  <p className="text-blue-400 text-sm font-medium">Telehealth Portal</p>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
                  Join Our
                  <br />
                  <span className="text-blue-400">Healthcare Community</span>
                </h1>
                <p className="text-gray-600 text-xl mb-8 leading-relaxed">
                  Create your account to access seamless telehealth services.
                  Connect with healthcare professionals or manage your patient care digitally.
                </p>
              </div>
              
              {/* Features for both user types */}
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
                  <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">For Patients</h3>
                  <p className="text-gray-600 text-sm">Book appointments, access medical records, and consult with healthcare providers remotely.</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
                  <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">For Doctors</h3>
                  <p className="text-gray-600 text-sm">Manage patient consultations, access health records, and provide quality care digitally.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-gray-500 text-sm">
              <p>© 2025 Lumelife Sdn Bhd 1513521-H • Trusted healthcare</p>
            </div>
          </div>
        </div>

        {/* Right side - Registration form */}
        <div className="w-full lg:w-[480px] bg-white p-8 flex items-center justify-center shadow-xl order-1 lg:order-2">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 0.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h2>
              <p className="text-gray-600">Join our telehealth community</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              {/* Back button */}
              <button
                onClick={() => router.push('/')}
                className="mb-6 flex items-center text-sm text-gray-500 hover:text-blue-400 transition-colors"
                aria-label="Back to homepage"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                </svg>
                Back to homepage
              </button>

              {serverError && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center" role="alert">
                  <span className="block text-sm">{serverError}</span>
                </div>
              )}
              
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* User type selector */}
                <UserTypeSelector
                  selectedType={formData.userType}
                  onSelect={(type) => setFormData(prev => ({ ...prev, userType: type }))}
                />
                
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200 ${
                      errors.firstName ? 'border-red-300 ring-1 ring-red-300' : ''
                    }`}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200 ${
                      errors.lastName ? 'border-red-300 ring-1 ring-red-300' : ''
                    }`}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200 ${
                      errors.email ? 'border-red-300 ring-1 ring-red-300' : ''
                    }`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200 ${
                      errors.phone ? 'border-red-300 ring-1 ring-red-300' : ''
                    }`}
                    placeholder="+60123456789"
                  />
                  <p className="mt-1 text-xs text-gray-500">Malaysian format: +60123456789 or leave empty</p>
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                {/* Medical Registration Number Field (Only for Doctors) */}
                {formData.userType === 'doctor' && (
                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200 ${
                        errors.licenseNumber ? 'border-red-300 ring-1 ring-red-300' : ''
                      }`}
                      placeholder="Enter your medical registration number"
                    />
                    {errors.licenseNumber && <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>}
                  </div>
                )}
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200 ${
                      errors.password ? 'border-red-300 ring-1 ring-red-300' : ''
                    }`}
                    placeholder="Create a strong password"
                  />
                  <p className="mt-1 text-xs text-gray-500">Must contain: 8+ characters, uppercase, number, special character</p>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200 ${
                      errors.confirmPassword ? 'border-red-300 ring-1 ring-red-300' : ''
                    }`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-300 text-white font-semibold rounded-xl hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-400 hover:text-blue-500 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>

            <div className="text-center mt-6">
              <div className="pt-4 border-t border-gray-100">
                <p className="text-center text-gray-500 text-xs leading-relaxed">
                  By creating an account, you agree to our{" "}
                  <a href="#" className="text-blue-400 hover:underline">Terms of Service</a>{" "}
                  and{" "}
                  <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}