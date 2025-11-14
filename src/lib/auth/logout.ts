/**
 * Logout Utility for Vercel Deployment
 * 
 * This utility ensures proper logout functionality on Vercel by:
 * 1. Clearing all NextAuth cookies
 * 2. Invalidating the session
 * 3. Redirecting to login page
 * 4. Handling edge cases with Vercel's serverless environment
 */

import { signOut as nextAuthSignOut } from 'next-auth/react';

export interface LogoutOptions {
  callbackUrl?: string;
  redirect?: boolean;
}

/**
 * Enhanced logout function that works reliably on Vercel
 * 
 * @param options - Logout configuration options
 * @returns Promise that resolves when logout is complete
 */
export async function logout(options: LogoutOptions = {}) {
  const {
    callbackUrl = '/login',
    redirect = true,
  } = options;

  try {
    console.log('[Logout] Starting logout process:', {
      callbackUrl,
      redirect,
      timestamp: new Date().toISOString(),
    });

    // Clear any local storage auth data
    if (typeof window !== 'undefined') {
      // Clear any cached auth data
      localStorage.removeItem('auth-token');
      sessionStorage.removeItem('auth-token');
      
      console.log('[Logout] Cleared local storage');
    }

    // Use NextAuth signOut with proper configuration
    await nextAuthSignOut({
      callbackUrl,
      redirect,
    });

    console.log('[Logout] Logout successful');

    // If not redirecting, manually clear cookies as backup
    if (!redirect && typeof window !== 'undefined') {
      // Clear all NextAuth cookies
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name] = cookie.split('=');
        if (name.trim().includes('next-auth')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      }
      
      console.log('[Logout] Cleared cookies manually');
    }

  } catch (error) {
    console.error('[Logout] Error during logout:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    
    // Fallback: force redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = callbackUrl;
    }
  }
}

/**
 * Quick logout function for use in components
 * Uses default settings optimized for Vercel
 */
export async function quickLogout() {
  return logout({
    callbackUrl: '/login',
    redirect: true,
  });
}
