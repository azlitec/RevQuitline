'use client';

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Define types for FloatingElement props
interface FloatingElementProps {
  children: ReactNode;
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
    <p className="text-gray-600 text-sm mb-3 text-center">I am logging in as:</p>
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

// Login Form Component
const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('patient');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        userType,
      });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Redirect based on user type
      const dashboardPath = userType === 'doctor' ? '/provider/dashboard' : '/patient/dashboard';
      router.push(dashboardPath);
      
    } catch (error) {
      console.error('Login failed', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center" role="alert">
          <span className="block text-sm">{error}</span>
        </div>
      )}
      
      <UserTypeSelector selectedType={userType} onSelect={setUserType} />
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200"
          placeholder="Enter your email"
          required
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200"
          placeholder="Enter your password"
          required
        />
      </div>
      
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-3 px-4 bg-blue-300 text-white font-semibold rounded-xl hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
      >
        {isLoading ? 'Signing in...' : `Sign In as ${userType === 'doctor' ? 'Doctor' : 'Patient'}`}
      </button>
    </div>
  );
};

export default function QuitlineHomePage() {
  const [showLogin, setShowLogin] = useState(false);

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
        <div className="flex-1 bg-gradient-to-br from-gray-50 via-white to-blue-25 p-8 relative overflow-hidden">
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
                  Your Health,
                  <br />
                  <span className="text-blue-400">Connected</span>
                </h1>
                <p className="text-gray-600 text-xl mb-8 leading-relaxed">
                  Seamless telehealth experience connecting patients with healthcare providers.
                  Secure, accessible, and professional healthcare at your fingertips.
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

        {/* Right side - Auth options */}
        <div className="w-full lg:w-[480px] bg-white p-8 flex items-center justify-center shadow-xl">
          <div className="w-full max-w-md">
            {!showLogin ? (
              <>
                <div className="text-center mb-8">
                  <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Quitline</h2>
                  <p className="text-gray-600">Choose how you'd like to get started</p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="w-full py-4 px-6 bg-blue-300 text-white font-semibold rounded-xl hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Sign In to Your Account
                  </button>

                  <button
                    onClick={() => window.location.href = '/register'}
                    className="w-full py-4 px-6 bg-white text-blue-400 font-semibold rounded-xl border-2 border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Create New Account
                  </button>
                </div>

                <div className="text-center mt-8">
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-center text-gray-500 text-xs leading-relaxed">
                      By using Quitline, you agree to our{" "}
                      <a href="#" className="text-blue-400 hover:underline">Terms of Service</a>{" "}
                      and{" "}
                      <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
                  <p className="text-gray-600">Sign in to access your Telehealth portal</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                  <button
                    onClick={() => setShowLogin(false)}
                    className="mb-4 flex items-center text-sm text-gray-500 hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd"/>
                    </svg>
                    Back to options
                  </button>

                  <LoginForm />

                  <div className="mt-6 text-center">
                    <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-blue-400 transition-colors">
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <div className="text-center mt-6">
                  <p className="text-gray-600 mb-4">
                    New to Quitline?{" "}
                    <Link href="/register" className="text-blue-400 hover:text-blue-500 font-medium transition-colors">
                      Create an account
                    </Link>
                  </p>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-center text-gray-500 text-xs leading-relaxed">
                      By signing in, you agree to our{" "}
                      <a href="#" className="text-blue-400 hover:underline">Terms of Service</a>{" "}
                      and{" "}
                      <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}