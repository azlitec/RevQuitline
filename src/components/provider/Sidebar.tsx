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

  // Desktop sidebar - Clean & Modern
  return (
    <aside
      className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-100 shadow-sm z-40 flex flex-col"
      aria-label="Provider sidebar"
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          L
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4" aria-label="Provider navigation">
        <ul className="space-y-2 px-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 relative mx-auto ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title={item.name}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={`material-icons text-xl ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-600'}`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  
                  {/* Tooltip */}
                  <span className="absolute left-full ml-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings */}
      <div className="p-2 border-t border-gray-100">
        <button
          className="group flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 mx-auto text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          title="Settings"
          aria-label="Settings"
        >
          <span className="material-icons text-xl group-hover:text-gray-600" aria-hidden="true">
            settings
          </span>
        </button>
      </div>
    </aside>
  );
}