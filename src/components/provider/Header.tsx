'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
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
  title = "Good Morning Dr. Sarah" 
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Get user name and initials
  const userName = session?.user?.name || title;
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase() || 'S';

  return (
    <header className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 gradient-text">{title}</h1>
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
        
        {/* Enhanced Notifications */}
        <button className="text-gray-600 relative p-3 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:shadow-medium group">
          <IconWithFallback 
            icon="notifications_none" 
            emoji="🔔" 
            className="group-hover:text-blue-500"
          />
          <div className="notification-dot absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold shadow-medium">
            5
          </div>
          
          {/* Notification tooltip */}
          <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-lg shadow-strong border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50 p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Recent Notifications</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• New appointment request from Ahmad</p>
              <p>• Prescription ready for Siti</p>
              <p>• Lab results available</p>
            </div>
          </div>
        </button>
        
        {/* Enhanced Refresh Button */}
        <button className="text-gray-600 p-3 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:shadow-medium group hover:rotate-180">
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
            {userInitials}
          </button>
          
          {/* Enhanced Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-strong border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {userInitials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{userName}</p>
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