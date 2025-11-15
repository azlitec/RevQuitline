'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { logout } from '@/lib/auth/logout';
import Link from 'next/link';
import NotificationBell from '@/components/ui/NotificationBell';
import { Clock, ChevronDown, LogOut, User, Settings, Menu, Search, Heart, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [patientName, setPatientName] = useState('Patient');

  // Avoid SSR/client hydration mismatch by rendering time only after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) {
        setPatientName(session.user.name);
      } else if (session.user.email) {
        setPatientName(session.user.email.split('@')[0]);
      }
    }
  }, [session]);

  const handleSignOut = async () => {
    await logout({ callbackUrl: '/login', redirect: true });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and greeting */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden transition-colors touch-friendly"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-gray-800">
              {currentTime ? `Good ${currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening'}` : 'Welcome'}, {patientName}
            </h1>
            <p className="text-sm text-gray-500" suppressHydrationWarning>{formatDate(currentTime)}</p>
          </div>
          
          <div className="md:hidden">
            <h1 className="text-lg font-bold text-gray-800">Hi, {patientName.split(' ')[0]}</h1>
          </div>
        </div>

        {/* Right side - Search, time, notifications, profile */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Current time */}
          <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4 text-gray-400" />
            <span suppressHydrationWarning>{formatTime(currentTime)}</span>
          </div>

          {/* Search input */}
          <div className="hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search doctors, appointments..."
                className="w-48 lg:w-64 px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          {/* Mobile search button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors touch-friendly">
            <Search className="w-5 h-5 text-gray-600" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Profile menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors touch-friendly"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
                {getInitials(patientName)}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700 max-w-24 truncate">
                {patientName.split(' ')[0]}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
                      {getInitials(patientName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{patientName}</p>
                      <p className="text-xs text-gray-500">Patient Portal</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <Link 
                    href="/patient/profile"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-3"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Profile Settings</span>
                  </Link>
                  <Link 
                    href="/patient/profile"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-3"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Heart className="w-4 h-4 text-gray-500" />
                    <span>Health Preferences</span>
                  </Link>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-3">
                    <HelpCircle className="w-4 h-4 text-gray-500" />
                    <span>Help & Support</span>
                  </button>
                </div>
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-3"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}