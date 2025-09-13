'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { name: 'Dashboard', href: '/provider/dashboard', icon: '🏠' },
  { name: 'Appointments', href: '/provider/appointments', icon: '📅' },
  { name: 'Patients', href: '/provider/patients', icon: '👥' },
  { name: 'Consultations', href: '/provider/consultations', icon: '💬' },
  { name: 'Prescriptions', href: '/provider/prescriptions', icon: '💊' },
  { name: 'Reports', href: '/provider/reports', icon: '📊' },
  { name: 'Billing', href: '/provider/billing', icon: '💰' },
  { name: 'Settings', href: '/provider/settings', icon: '⚙️' },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-white border-r border-blue-100/50 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${!isOpen ? 'hidden' : 'block'} shadow-lg`}>
      {/* Logo and toggle */}
      <div className="flex items-center justify-between p-4 border-b border-blue-100/50">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
              Q
            </div>
            <span className="ml-3 text-lg font-semibold text-blue-900">Quitline Portal</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold mx-auto shadow-md">
            Q
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-blue-50 text-blue-600"
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
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-100/50 bg-white">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
              <span className="text-sm font-medium">DR</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Dr. Smith</p>
              <p className="text-xs text-blue-600">Provider</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}