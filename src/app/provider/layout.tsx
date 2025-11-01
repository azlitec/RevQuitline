'use client';

import { useState, useEffect, useRef } from 'react';
import ProviderSidebar from '@/components/provider/Sidebar';
import ProviderHeader from '@/components/provider/Header';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[Diag] ProviderLayout mount');
    return () => console.log('[Diag] ProviderLayout unmount');
  }, []);
  
  // Only render one branch (mobile OR desktop) to avoid double mounting children/header
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)'); // Tailwind 'lg' breakpoint
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Validation: log layout rects once viewport branch is known
  useEffect(() => {
    if (isDesktop !== null) {
      const sidebarRect = sidebarRef.current?.getBoundingClientRect();
      const contentRect = contentRef.current?.getBoundingClientRect();
      console.log('[Diag] ProviderLayout layout rects', { isDesktop, sidebarRect, contentRect });
    }
  }, [isDesktop]);

  // Avoid hydration mismatch: render shell until we know viewport
  if (isDesktop === null) {
    return (
      <div className="min-h-screen bg-gray-50" />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isDesktop ? (
        // Desktop Layout
        <div className="flex h-screen bg-gray-50">
          <div className="hidden lg:block" ref={sidebarRef}>
            <ProviderSidebar />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden ml-16" ref={contentRef}>
            <div className="px-6 pt-6">
              <ProviderHeader />
            </div>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
              {children}
            </main>
          </div>
        </div>
      ) : (
        // Mobile Layout
        <div className="">
          {/* Mobile Header */}
          <div className="bg-white p-4 flex items-center justify-between">
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
              <div className="absolute left-0 top-0 h-full w-64 bg-white">
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
      )}
    </div>
  );
}