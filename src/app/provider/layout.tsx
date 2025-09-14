'use client';

import ProviderSidebar from '@/components/provider/Sidebar';
import ProviderHeader from '@/components/provider/Header';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-4 lg:p-8" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#F0F8FF' }}>
      <div className="flex rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#E6F3FF' }}>
        {/* Enhanced Sidebar - Icon Only Design */}
        <ProviderSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Enhanced Header */}
          <ProviderHeader />
          
          {/* Page Content */}
          <div className="mt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}