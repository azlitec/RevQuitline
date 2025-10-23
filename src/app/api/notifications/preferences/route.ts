import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { jsonEntity, jsonError } from '@/lib/api/response';
import { z } from 'zod';

/**
 * Notification Preferences API
 * GET  /api/notifications/preferences  -> returns current user's preferences (or defaults)
 * PUT  /api/notifications/preferences  -> updates current user's preferences
 */

const PrefSchema = z.object({
  appointments: z.boolean().optional(),
  messages: z.boolean().optional(),
  prescriptions: z.boolean().optional(),
  investigations: z.boolean().optional(),
  marketing: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

function defaultPrefs() {
  return {
    appointments: true,
    messages: true,
    prescriptions: true,
    investigations: true,
    marketing: false,
    emailEnabled: true,
    pushEnabled: true,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return jsonError(req, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }
    const userId = session.user.id;

    const pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      // Return defaults without creating a DB row
      return jsonEntity(req, { userId, ...defaultPrefs(), createdAt: null, updatedAt: null }, 200);
    }

    return jsonEntity(req, pref, 200);
  } catch (err) {
    return jsonError(req, err, { title: 'Failed to fetch notification preferences', status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return jsonError(req, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }
    const userId = session.user.id;

    const json = await req.json().catch(() => ({}));
    const data = PrefSchema.parse(json);

    // Upsert preferences for this user
    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...defaultPrefs(), ...data },
      update: { ...data },
    });

    return jsonEntity(req, updated, 200);
  } catch (err) {
    return jsonError(req, err, { title: 'Failed to update notification preferences', status: 400 });
  }
}