'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/contexts/NotificationContext';
import { LayoutDashboard, Search, Calendar, MessageSquare, CreditCard, X } from 'lucide-react';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { name: 'Dashboard', href: '/patient/dashboard', icon: LayoutDashboard },
  { name: 'Find Doctors', href: '/patient/doctors', icon: Search },
  { name: 'Appointments', href: '/patient/appointments', icon: Calendar },
  { name: 'Messages', href: '/patient/messages', icon: MessageSquare },
  { name: 'Billing', href: '/patient/billing', icon: CreditCard },
];

export default function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { counts } = useNotifications();

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const getNotificationCount = (itemName: string): number => {
    switch (itemName) {
      case 'Messages':
        return counts.unreadMessages;
      case 'Appointments':
        return counts.upcomingAppointments;
      default:
        return 0;
    }
  };

  if (isMobile) {
    // Mobile Full Sidebar
    return (
      <div className="h-full bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
              Q
            </div>
            <span className="text-lg font-semibold text-gray-800">Quitline Patient</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
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
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {getNotificationCount(item.name) > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                        {getNotificationCount(item.name)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    );
  }

  // Desktop Icon-Only Sidebar - Clean & Modern
  return (
    <div className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-100 shadow-sm z-40 flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          Q
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
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
                >
                  <item.icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-600'}`} />
                  
                  {/* Notification Badge */}
                  {getNotificationCount(item.name) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg">
                      {getNotificationCount(item.name)}
                    </span>
                  )}
                  
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
    </div>
  );
}