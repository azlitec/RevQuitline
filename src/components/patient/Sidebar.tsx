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
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${!isOpen ? 'hidden' : 'block'}`}>
      {/* Logo and toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              Q
            </div>
            <span className="ml-3 text-lg font-semibold text-gray-800">Quitline Patient</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold mx-auto">
            Q
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-100"
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
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-600 border border-green-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">PT</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800">Patient</p>
              <p className="text-xs text-gray-500">Welcome</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}