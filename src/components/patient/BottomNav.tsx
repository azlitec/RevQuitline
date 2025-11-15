'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

import { HelpCircle } from 'lucide-react';

/**
 * Local IconWithFallback to match existing Material Icons usage
 * Avoids external icon dependencies; uses emoji as ultimate fallback.
 */
const IconWithFallback = ({
  icon,
  emoji,
  className = '',
}: {
  icon: string;
  emoji: string;
  className?: string;
}) => {
  return (
    <span className={`icon-container ${className}`}>
      <HelpCircle />
      <span
        className="emoji-fallback"
        style={{
          fontSize: '20px',
          display: 'none',
        }}
      >
        {emoji}
      </span>
    </span>
  );
};

type ItemDef = {
  href: string;
  label: string;
  icon: string;
  emoji: string;
};

function useIsActive(href: string) {
  const pathname = usePathname();
  // Active if exact match or nested under the route
  return pathname === href || pathname.startsWith(href + '/');
}

function NavItem({ item, notificationCount }: { item: ItemDef; notificationCount?: number }) {
  const isActive = useIsActive(item.href);
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 relative ${
        isActive
          ? 'text-blue-600 bg-blue-50'
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
      }`}
    >
      <div className="flex flex-col items-center relative">
        <IconWithFallback
          icon={item.icon}
          emoji={item.emoji}
          className={isActive ? 'text-blue-600' : 'text-gray-500'}
        />
        {notificationCount && notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1 py-0.5 rounded-full min-w-[16px] h-4 flex items-center justify-center">
            {notificationCount}
          </span>
        )}
        <span className={`mt-1 h-1.5 w-1.5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-transparent'}`}></span>
      </div>
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  );
}

/**
 * BottomNav - mobile-only patient navigation bar
 * - Fixed to bottom
 * - Safe-area aware (iOS notch)
 * - Center "Book" action prominently
 */
export default function BottomNav() {
  const { counts } = useNotifications();
  
  // Define left and right items; center is the Book action
  const leftItems: ItemDef[] = [
    { href: '/patient/dashboard', label: 'Home', icon: 'dashboard', emoji: '🏠' },
    { href: '/patient/doctors', label: 'Doctors', icon: 'search', emoji: '🔍' },
  ];
  const rightItems: ItemDef[] = [
    { href: '/patient/messages', label: 'Messages', icon: 'chat', emoji: '💬' },
    { href: '/patient/billing', label: 'Billing', icon: 'payment', emoji: '💰' },
  ];

  const isBookActive = useIsActive('/patient/appointments');
  
  const getNotificationCount = (label: string): number => {
    switch (label) {
      case 'Messages':
        return counts.unreadMessages;
      default:
        return 0;
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Patient bottom navigation"
      className="fixed bottom-0 inset-x-0 lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg shadow-soft z-30"
      // Safe-area support; extra bottom padding for phones with notch/home indicator
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
    >
      <div className="relative max-w-screen-sm mx-auto px-4">
        {/* Layout row for left and right groups; reserve height for central button */}
        <div className="flex items-center justify-between h-16">
          {/* Left group */}
          <div className="flex items-center gap-3">
            {leftItems.map((item) => (
              <NavItem key={item.href} item={item} notificationCount={getNotificationCount(item.label)} />
            ))}
          </div>

          {/* Right group */}
          <div className="flex items-center gap-3">
            {rightItems.map((item) => (
              <NavItem key={item.href} item={item} notificationCount={getNotificationCount(item.label)} />
            ))}
          </div>
        </div>

        {/* Center "Book" floating action */}
        <Link
          href="/patient/appointments"
          aria-label="Book Appointment"
          className="absolute left-1/2 -translate-x-1/2 -top-6"
        >
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-medium ring-4 ${
                isBookActive ? 'ring-blue-300' : 'ring-blue-200'
              } transition-all duration-200 active:scale-95`}
              style={{
                background:
                  'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              }}
            >
              {/* Book icon centered and emphasized */}
              <HelpCircle className="text-white" />
            </div>
            {counts.upcomingAppointments > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg">
                {counts.upcomingAppointments}
              </span>
            )}
          </div>
          <div className="mt-1 text-center text-[10px] font-semibold text-blue-700">
            Book
          </div>
        </Link>
      </div>
    </nav>
  );
}