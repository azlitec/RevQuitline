'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

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
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {icon}
      </span>
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

function NavItem({ item }: { item: ItemDef }) {
  const isActive = useIsActive(item.href);
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
        isActive
          ? 'text-blue-600 bg-blue-50'
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
      }`}
    >
      <div className="flex flex-col items-center">
        <IconWithFallback
          icon={item.icon}
          emoji={item.emoji}
          className={isActive ? 'text-blue-600' : 'text-gray-500'}
        />
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
              <NavItem key={item.href} item={item} />
            ))}
          </div>

          {/* Right group */}
          <div className="flex items-center gap-3">
            {rightItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Center "Book" floating action */}
        <Link
          href="/patient/appointments"
          aria-label="Book Appointment"
          className="absolute left-1/2 -translate-x-1/2 -top-6"
        >
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
            <IconWithFallback
              icon="calendar_today"
              emoji="📅"
              className="text-white"
            />
          </div>
          <div className="mt-1 text-center text-[10px] font-semibold text-blue-700">
            Book
          </div>
        </Link>
      </div>
    </nav>
  );
}