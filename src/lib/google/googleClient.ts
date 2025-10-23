import { google } from 'googleapis';
import { prisma } from '@/lib/db';

export const GOOGLE_SCOPES = [
  // Calendar event creation (needed to generate Google Meet links)
  'https://www.googleapis.com/auth/calendar.events',
  // Basic profile to associate Google account with doctor profile
  'openid',
  'email',
  'profile',
];

function getEnvOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export function getRedirectUri(): string {
  // Preferred explicit redirect override; otherwise build from NEXTAUTH_URL
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (explicit) return explicit;

  const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`;
  if (!nextAuthUrl) {
    // Fallback for local dev - adjust port as needed
    return 'http://localhost:3000/api/provider/google/oauth/callback';
  }
  return `${nextAuthUrl}/api/provider/google/oauth/callback`;
}

export function createOAuth2Client() {
  const clientId = getEnvOrThrow('GOOGLE_CLIENT_ID');
  const clientSecret = getEnvOrThrow('GOOGLE_CLIENT_SECRET');
  const redirectUri = getRedirectUri();

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate user consent URL for Google OAuth
 */
export function generateAuthUrl(state?: string) {
  const oauth2Client = createOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
    prompt: 'consent',
    state,
  });
  return url;
}

/**
 * Persist tokens to the provider (doctor) user record
 */
async function persistTokens(userId: string, tokens: { access_token?: string; refresh_token?: string; expiry_date?: number }) {
  const update: any = {};
  if (tokens.access_token) update.googleOAuthAccessToken = tokens.access_token;
  if (tokens.refresh_token) update.googleOAuthRefreshToken = tokens.refresh_token;
  if (tokens.expiry_date) update.googleOAuthExpiry = new Date(tokens.expiry_date);

  if (Object.keys(update).length === 0) return;

  await prisma.user.update({
    where: { id: userId },
    data: update,
  });
}

/**
 * Exchange authorization code for tokens and store on user
 */
export async function exchangeCodeForTokens(userId: string, code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);
  await persistTokens(userId, tokens);

  // Fetch profile email and associate
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const me = await oauth2.userinfo.get();
  const googleEmail = me.data.email || null;

  if (googleEmail) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleEmail,
      },
    });
  }

  return {
    tokens,
    googleEmail,
  };
}

/**
 * Build an OAuth client for a provider (doctor) and attach token refresh handler.
 * It will load and set saved credentials if present.
 */
export async function ensureClientForUser(userId: string) {
  const oauth2Client = createOAuth2Client();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleOAuthAccessToken: true,
      googleOAuthRefreshToken: true,
      googleOAuthExpiry: true,
    },
  });

  if (user?.googleOAuthAccessToken || user?.googleOAuthRefreshToken) {
    oauth2Client.setCredentials({
      access_token: user.googleOAuthAccessToken || undefined,
      refresh_token: user.googleOAuthRefreshToken || undefined,
      expiry_date: user.googleOAuthExpiry ? user.googleOAuthExpiry.getTime() : undefined,
    });
  }

  // Persist refreshed tokens automatically
  oauth2Client.on('tokens', (tokens) => {
    // void promise
    persistTokens(userId, tokens as any).catch((e) => {
      console.error('[Google OAuth] Failed to persist refreshed tokens', e);
    });
  });

  return oauth2Client;
}

/**
 * Verify the provider has connected Google account (refresh token present)
 */
export async function assertProviderHasGoogle(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleOAuthRefreshToken: true, googleEmail: true },
  });

  if (!user || !user.googleOAuthRefreshToken) {
    const url = generateAuthUrl();
    const err = new Error('Google account not connected for this provider');
    (err as any).oauthUrl = url;
    throw err;
  }
  return true;
}