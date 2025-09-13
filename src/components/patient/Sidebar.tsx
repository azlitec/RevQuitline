'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { name: 'Dashboard', href: '/patient/dashboard', icon: '🏠' },
  { name: 'Appointments', href: '/patient/appointments', icon: '📅' },
  { name: 'Health Records', href: '/patient/health-records', icon: '📋' },
  { name: 'Medications', href: '/patient/medications', icon: '💊' },
  { name: 'Health Journal', href: '/patient/journal', icon: '📝' },
  { name: 'Messages', href: '/patient/messages', icon: '💬' },
  { name: 'Billing', href: '/patient/billing', icon: '💰' },
  { name: 'Settings', href: '/patient/settings', icon: '⚙️' },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-gradient-to-b from-blue-900 to-blue-800 border-r border-blue-700/30 shadow-xl transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${!isOpen ? 'hidden' : 'block'}`}>
      {/* Logo and toggle */}
      <div className="flex items-center justify-between p-4 border-b border-blue-700/30">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
              Q
            </div>
            <span className="ml-3 text-lg font-semibold text-white">Quitline Patient</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold mx-auto shadow-lg">
            Q
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-blue-700 text-white/80 hover:text-white"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg border border-blue-500'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white hover:shadow-md'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isCollapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User profile section */}
      {!isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-700/30">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-sm font-medium">PT</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">Patient</p>
              <p className="text-xs text-blue-200">Welcome</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}