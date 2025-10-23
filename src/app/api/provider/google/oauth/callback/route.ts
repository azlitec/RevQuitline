import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { exchangeCodeForTokens } from '@/lib/google/googleClient';

/**
 * Google OAuth callback for providers (doctors).
 * Persists tokens on the authenticated provider user and redirects back.
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.DISABLE_GOOGLE === 'true') {
      return NextResponse.json({ error: 'Google integration disabled' }, { status: 503 });
    }
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    // Exchange code and persist tokens on user
    await exchangeCodeForTokens(session.user.id, code);

    // Determine redirect target
    let redirectPath = '/provider/appointments';
    if (state) {
      try {
        const parsed = JSON.parse(state);
        if (parsed?.redirect && typeof parsed.redirect === 'string') {
          redirectPath = parsed.redirect;
        }
      } catch {
        // ignore malformed state
      }
    }

    // Redirect back to app
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const target =
      baseUrl && redirectPath.startsWith('/') ? `${baseUrl}${redirectPath}` : redirectPath;

    return NextResponse.redirect(target);
  } catch (error) {
    console.error('[Google OAuth Callback] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}