import { Providers } from './providers';
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RevQuitline - Healthcare Management System',
  description: 'Comprehensive healthcare management system for providers and patients',
  viewport: 'width=device-width, initial-scale=1.0',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Optimized font loading with preconnect and display=swap */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        {/* Load only essential Material Icons with display=swap */}
        <link 
          href="https://fonts.googleapis.com/icon?family=Material+Icons&display=swap" 
          rel="stylesheet" 
        />
        {/* Preload critical resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}