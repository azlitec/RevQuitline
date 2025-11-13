'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

// Separate component that uses useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/login';
  const error = searchParams?.get('error');
  const successMessage = searchParams?.get('success');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setErrorMessage(result.error);
        setLoading(false);
        return;
      }

      // Success - redirect to root, middleware will handle role-based redirection
      // This prevents redirect loops and allows middleware to route based on user role
      router.push('/');
      router.refresh();
      
    } catch (error) {
      setErrorMessage('An error occurred during login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-center" role="alert">
          <span className="block text-sm">{decodeURIComponent(successMessage).replace(/\+/g, ' ')}</span>
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center" role="alert">
          <span className="block text-sm">{errorMessage}</span>
        </div>
      )}
    
      <div>
        <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email-address"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200"
          placeholder="you@example.com"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all duration-200"
          placeholder="Enter your password"
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-blue-300 focus:ring-blue-300 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
            Remember me
          </label>
        </div>

        <div className="text-sm">
          <Link href="/forgot-password" className="font-medium text-blue-400 hover:text-blue-500 transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-300 text-white font-semibold rounded-xl hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </form>
  );
}

// Loading fallback for Suspense
function LoginFormFallback() {
  return (
    <div className="space-y-5">
      <div className="h-10 bg-gray-200 rounded animate-pulse mb-6"></div>
      <div>
        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div>
        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="mt-6">
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
}

// Main LoginPage component
export default function LoginPage() {
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
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-0a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.75 2.524 9.026 9.026 0 01-1 .001z"/>
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
                  Welcome Back to
                  <br />
                  <span className="text-blue-400">Healthcare Community</span>
                </h1>
                <p className="text-gray-600 text-xl mb-8 leading-relaxed">
                  Sign in to access seamless telehealth services.
                  Connect with healthcare professionals or manage your patient care digitally.
                </p>
              </div>
              
              {/* Features */}
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
                  <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Secure Access</h3>
                  <p className="text-gray-600 text-sm">Your medical data is protected with enterprise-grade security measures.</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
                  <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">24/7 Availability</h3>
                  <p className="text-gray-600 text-sm">Access your healthcare portal anytime, anywhere with our digital platform.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-gray-500 text-sm">
              <p>© 2025 Lumelife Sdn Bhd 1513521-H • Trusted healthcare</p>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-[480px] bg-white p-8 flex items-center justify-center shadow-xl">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your telehealth account</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <Suspense fallback={<LoginFormFallback />}>
                <LoginForm />
              </Suspense>
              
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-blue-400 hover:text-blue-500 font-medium transition-colors">
                    Create account
                  </Link>
                </p>
              </div>
            </div>

            <div className="text-center mt-6">
              <div className="pt-4 border-t border-gray-100">
                <p className="text-center text-gray-500 text-xs leading-relaxed">
                  By signing in, you agree to our{" "}
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