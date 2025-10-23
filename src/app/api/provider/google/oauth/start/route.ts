import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { generateAuthUrl, GOOGLE_SCOPES } from '@/lib/google/googleClient';

/**
 * Start Google OAuth for a provider (doctor).
 * Returns an oauthUrl the client should navigate to.
 *
 * Optional query:
 * - redirect: where to return after callback (client-side navigation)
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.DISABLE_GOOGLE === 'true') {
      return NextResponse.json({ error: 'Google integration disabled' }, { status: 503 });
    }
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get('redirect') || '/provider/appointments';

    // Encode state with minimal info to restore on callback if needed
    const statePayload = JSON.stringify({
      redirect,
      userId: session.user.id,
      ts: Date.now(),
    });

    const oauthUrl = generateAuthUrl(statePayload);

    return NextResponse.json({
      oauthUrl,
      scopes: GOOGLE_SCOPES,
    });
  } catch (error) {
    console.error('[Google OAuth Start] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}