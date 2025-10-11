'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

// Provider navigation (EMR modules removed per request)
const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/provider/dashboard', icon: 'dashboard' },
  { name: 'Appointments', href: '/provider/appointments', icon: 'calendar_today' },
  { name: 'Patients', href: '/provider/patients', icon: 'people' },
  { name: 'Inbox', href: '/provider/inbox', icon: 'chat' },
  { name: 'Profile', href: '/provider/profile', icon: 'person' },
  { name: 'Consultations', href: '/provider/consultations', icon: 'local_hospital' },
  { name: 'Prescriptions', href: '/provider/prescriptions', icon: 'medication' },
  { name: 'Reports', href: '/provider/reports', icon: 'assignment' },
  { name: 'Billing', href: '/provider/billing', icon: 'receipt' },
];

export default function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();

  // EMR counters removed per requirement


  if (isMobile) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="text-blue-500 font-bold text-2xl">L</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">LumeLife Portal</h2>
              <p className="text-sm text-gray-500">Healthcare Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-4" aria-label="Provider navigation">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-md'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`material-icons ${isActive ? 'text-blue-500' : 'text-gray-500'}`} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile Settings */}
        <div className="p-4 border-t border-gray-200">
          <button
            className="flex items-center space-x-4 w-full p-4 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
            aria-label="Settings"
          >
            <span className="material-icons text-gray-500">settings</span>
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </div>
    );
  }

  // Desktop sidebar (original design) with status chips
  return (
    <aside
      className="w-20 flex flex-col items-center py-6 space-y-6 relative z-10"
      style={{ backgroundColor: '#FFFFFF' }}
      aria-label="Provider sidebar"
    >
      {/* Logo */}
      <div className="text-blue-500 font-bold text-2xl mb-4" aria-label="LumeLife logo">L</div>

      {/* Navigation */}
      <nav className="flex flex-col items-center space-y-6 flex-grow" aria-label="Provider navigation">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative nav-item p-3 transition-all duration-300 rounded-xl ${
                isActive ? 'bg-blue-50 shadow-md' : 'hover:bg-blue-50 hover:shadow-md'
              }`}
              title={item.name}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`material-icons ${isActive ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div
        className="text-gray-500 p-3 nav-item hover:bg-blue-50 hover:shadow-md rounded-xl transition-all duration-300 cursor-pointer"
        title="Settings"
        role="button"
        aria-label="Settings"
      >
        <span className="material-icons hover:text-blue-500" aria-hidden="true">settings</span>
      </div>
    </aside>
  );
}