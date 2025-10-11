import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('=== ADMIN SIGNOUT ROUTE CALLED ===');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (session) {
      console.log('User signing out:', session.user?.email, 'Role:', (session as any).role);
      console.log('Session details:', JSON.stringify(session, null, 2));
    } else {
      console.log('No session found during signout');
    }
    
    // Clear the session by returning a response that clears the cookie
    const response = NextResponse.json({
      message: 'Successfully signed out',
      success: true,
      timestamp: new Date().toISOString()
    });
    
    // Clear all NextAuth related cookies
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('next-auth.callback-url');
    
    // Set session to expire immediately
    response.cookies.set('next-auth.session-token', '', {
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
      httpOnly: true
    });
    
    console.log('=== ADMIN SIGNOUT COMPLETED ===');
    return response;
  } catch (error) {
    console.error('Admin signout error:', error);
    return NextResponse.json(
      { error: 'Signout failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}