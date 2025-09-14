'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/provider/dashboard', 
    icon: 'dashboard',
    emoji: '🏠',
    svg: '⚡'
  },
  { 
    name: 'Appointments', 
    href: '/provider/appointments', 
    icon: 'calendar_today',
    emoji: '📅',
    svg: '📋'
  },
  { 
    name: 'Patients', 
    href: '/provider/patients', 
    icon: 'people',
    emoji: '👥',
    svg: '👤'
  },
  { 
    name: 'Consultations', 
    href: '/provider/consultations', 
    icon: 'local_hospital',
    emoji: '🏥',
    svg: '💬'
  },
  { 
    name: 'Prescriptions', 
    href: '/provider/prescriptions', 
    icon: 'medication',
    emoji: '💊',
    svg: '💉'
  },
  { 
    name: 'Reports', 
    href: '/provider/reports', 
    icon: 'assignment',
    emoji: '📊',
    svg: '📈'
  },
  { 
    name: 'Billing', 
    href: '/provider/billing', 
    icon: 'receipt',
    emoji: '💰',
    svg: '🧾'
  },
];

// Enhanced Icon component with multiple fallbacks
const IconWithFallback = ({ icon, emoji, svg, className = '', isActive = false }: { 
  icon: string; 
  emoji: string; 
  svg: string; 
  className?: string; 
  isActive?: boolean;
}) => {
  const iconClass = isActive ? 'text-blue-500' : 'text-gray-500 group-hover:text-blue-500';
  
  return (
    <div className={`icon-container relative ${className}`}>
      {/* Primary Material Icon */}
      <span 
        className={`material-icons transition-all duration-300 ${iconClass}`} 
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
      
      {/* Emoji Fallback */}
      <span 
        className={`emoji-fallback absolute inset-0 flex items-center justify-center transition-all duration-300 ${iconClass}`}
        style={{ 
          fontSize: '20px',
          display: 'none'
        }}
      >
        {emoji}
      </span>
    </div>
  );
};

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-20 flex flex-col items-center py-6 space-y-6 shadow-soft" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Enhanced Logo */}
      <div className="text-blue-500 font-bold text-2xl mb-4 p-2 rounded-xl hover:bg-blue-50 transition-all duration-300 cursor-pointer glow-effect">
        L
      </div>
      
      {/* Enhanced Navigation */}
      <nav className="flex flex-col items-center space-y-6 flex-grow">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group nav-item p-3 transition-all duration-300 rounded-xl relative ${
                isActive 
                  ? 'bg-blue-50 shadow-medium scale-110' 
                  : 'hover:bg-blue-50 hover:shadow-medium hover:scale-110'
              }`}
              title={item.name}
            >
              <IconWithFallback 
                icon={item.icon}
                emoji={item.emoji}
                svg={item.svg}
                isActive={isActive}
                className="transition-all duration-300"
              />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* Enhanced Settings */}
      <div className="group nav-item p-3 hover:bg-blue-50 hover:shadow-medium hover:scale-110 rounded-xl transition-all duration-300 cursor-pointer relative" title="Settings">
        <IconWithFallback 
          icon="settings"
          emoji="⚙️"
          svg="🔧"
          className="text-gray-500 group-hover:text-blue-500 transition-all duration-300"
        />
        
        {/* Tooltip */}
        <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
          Settings
        </div>
      </div>
    </aside>
  );
}