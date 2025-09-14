'use client';

import { useState } from 'react';
import ProviderSidebar from '@/components/provider/Sidebar';
import ProviderHeader from '@/components/provider/Header';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#F0F8FF' }}>
      {/* Mobile Layout */}
      <div className="block lg:hidden">
        {/* Mobile Header */}
        <div className="bg-white shadow-lg p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-blue-600 text-white"
          >
            <span className="material-icons">menu</span>
          </button>
          <div className="text-blue-500 font-bold text-xl">L</div>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            DR
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50">
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-2xl">
              <ProviderSidebar isMobile={true} onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <main className="p-4">
          <ProviderHeader isMobile={true} onMenuClick={() => setSidebarOpen(true)} />
          <div className="mt-4">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block p-4 lg:p-8">
        <div className="flex rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#E6F3FF' }}>
          <ProviderSidebar />
          <main className="flex-1 p-8">
            <ProviderHeader />
            <div className="mt-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}