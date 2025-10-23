'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import NotificationBell from '@/components/ui/NotificationBell';

interface HeaderProps {
  onMenuClick?: () => void;
  customTitle?: string;
  isMobile?: boolean;
}

interface UserData {
  firstName?: string;
  lastName?: string;
  email: string;
}

// Enhanced Icon component with fallbacks
const IconWithFallback = ({ icon, emoji, className = '', onClick }: { 
  icon: string; 
  emoji: string; 
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <span 
      className={`icon-container transition-all duration-300 ${className}`}
      onClick={onClick}
    >
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

export default function Header({
  onMenuClick,
  customTitle,
  isMobile = false
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { data: session } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [doctorName, setDoctorName] = useState<string>('Good Morning Doctor');

  console.log('[Diag] ProviderHeader render', { isMobile, hasSession: !!session });

  useEffect(() => {
    console.log('[Diag] ProviderHeader useEffect session change', { isMobile, hasSession: !!session });
    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  useEffect(() => {
    console.log('[Diag] ProviderHeader mount', { isMobile });
    return () => console.log('[Diag] ProviderHeader unmount', { isMobile });
  }, []);

  const fetchUserData = async () => {
    try {
      console.log('[Diag] fetchUserData start', { isMobile });
      const response = await fetch('/api/user');
      console.log('[Diag] fetchUserData response', { status: response.status, isMobile });
      if (response.ok) {
        const data = await response.json();

        // Ensure data exists and has expected structure
        if (data && typeof data === 'object') {
          setUserData(data);

          // Generate doctor greeting with null checks
          const firstName = data.firstName?.trim();
          const lastName = data.lastName?.trim();

          let displayName = '';
          if (firstName && lastName) {
            displayName = `Dr. ${firstName} ${lastName}`;
          } else if (firstName) {
            displayName = `Dr. ${firstName}`;
          } else if (lastName) {
            displayName = `Dr. ${lastName}`;
          } else if (data.email) {
            const emailName = data.email.split('@')[0];
            const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            displayName = `Dr. ${formattedName}`;
          } else {
            displayName = 'Doctor';
          }

          // Time-based greeting
          const hour = new Date().getHours();
          let greeting = 'Good Morning';
          if (hour >= 12 && hour < 17) {
            greeting = 'Good Afternoon';
          } else if (hour >= 17) {
            greeting = 'Good Evening';
          }

          setDoctorName(`${greeting} ${displayName}`);
          console.log('[Diag] fetchUserData success', { isMobile });
        } else {
          throw new Error('Invalid user data structure');
        }
      } else {
        throw new Error(`API request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('[Diag] Error fetching user data:', error);
      // Fallback to session data if API fails
      if (session?.user?.name) {
        setDoctorName(`Good Morning Dr. ${session.user.name}`);
      } else if (session?.user?.email) {
        const emailName = session.user.email.split('@')[0];
        const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        setDoctorName(`Good Morning Dr. ${formattedName}`);
      } else {
        setDoctorName('Good Morning Doctor');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const getUserInitials = () => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase();
    } else if (userData?.firstName) {
      return userData.firstName.slice(0, 2).toUpperCase();
    } else if (userData?.lastName) {
      return userData.lastName.slice(0, 2).toUpperCase();
    } else if (session?.user?.name) {
      const nameParts = session.user.name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
      }
      return session.user.name.slice(0, 2).toUpperCase();
    } else if (session?.user?.email) {
      const emailName = session.user.email.split('@')[0];
      return emailName.slice(0, 2).toUpperCase();
    } else if (userData?.email) {
      const emailName = userData.email.split('@')[0];
      return emailName.slice(0, 2).toUpperCase();
    }
    return 'DR';
  };

  const getDisplayName = () => {
    if (userData?.firstName && userData?.lastName) {
      return `Dr. ${userData.firstName} ${userData.lastName}`;
    } else if (userData?.firstName) {
      return `Dr. ${userData.firstName}`;
    } else if (userData?.lastName) {
      return `Dr. ${userData.lastName}`;
    } else if (session?.user?.name) {
      return `Dr. ${session.user.name}`;
    } else if (session?.user?.email) {
      const emailName = session.user.email.split('@')[0];
      return `Dr. ${emailName.charAt(0).toUpperCase() + emailName.slice(1)}`;
    } else if (userData?.email) {
      const emailName = userData.email.split('@')[0];
      return `Dr. ${emailName.charAt(0).toUpperCase() + emailName.slice(1)}`;
    }
    return 'Doctor';
  };

  const displayTitle = customTitle || doctorName;

  // Mobile Header
  if (isMobile) {
    return (
      <div className="mb-6">
        {/* Mobile Title */}
        <div className="mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">{displayTitle}</h1>
          <p className="text-gray-500 text-sm">Your healthcare dashboard</p>
        </div>

        {/* Mobile Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <IconWithFallback 
                icon="search" 
                emoji="🔍" 
                className="text-gray-400"
              />
            </div>
            <input 
              className="w-full bg-white rounded-lg py-3 pl-12 pr-4 shadow-soft border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-300" 
              placeholder="Search..." 
              type="text"
            />
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <button 
              onClick={fetchUserData}
              className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <IconWithFallback icon="refresh" emoji="🔄" />
            </button>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-medium"
            >
              {getUserInitials()}
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">{getDisplayName()}</p>
                  <p className="text-xs text-gray-500">{session?.user?.email}</p>
                </div>
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    Profile Settings
                  </button>
                  <button 
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Header (original design)
  return (
    <header className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 gradient-text">{displayTitle}</h1>
        <p className="text-gray-500 flex items-center">
          Your daily healthcare dashboard
          <IconWithFallback 
            icon="expand_more" 
            emoji="🔽" 
            className="ml-1 text-sm text-gray-400 hover:text-blue-500 cursor-pointer" 
          />
        </p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Enhanced Search Input */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            <IconWithFallback 
              icon="search" 
              emoji="🔍" 
              className="text-gray-400 group-focus-within:text-blue-500"
            />
          </div>
          <input 
            className="bg-white rounded-lg py-3 pl-12 pr-4 focus:outline-none w-64 shadow-soft border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-300" 
            placeholder="Search patients, appointments..." 
            type="text"
          />
        </div>
        
        <NotificationBell />
        
        {/* Enhanced Refresh Button */}
        <button 
          onClick={fetchUserData}
          className="text-gray-600 p-3 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:shadow-medium group hover:rotate-180"
        >
          <IconWithFallback 
            icon="refresh" 
            emoji="🔄" 
            className="group-hover:text-blue-500 transition-transform duration-300"
          />
        </button>
        
        {/* Enhanced Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-110 glow-effect"
          >
            {getUserInitials()}
          </button>
          
          {/* Enhanced Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-strong border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {getUserInitials()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{getDisplayName()}</p>
                    <p className="text-xs text-gray-500">{session?.user?.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition-colors flex items-center space-x-3">
                  <IconWithFallback icon="person" emoji="👤" className="text-gray-500" />
                  <span>Profile Settings</span>
                </button>
                <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition-colors flex items-center space-x-3">
                  <IconWithFallback icon="settings" emoji="⚙️" className="text-gray-500" />
                  <span>Account Settings</span>
                </button>
                <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition-colors flex items-center space-x-3">
                  <IconWithFallback icon="help" emoji="❓" className="text-gray-500" />
                  <span>Help & Support</span>
                </button>
              </div>
              
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-3 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center space-x-3"
                >
                  <IconWithFallback icon="logout" emoji="🚪" className="text-red-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}