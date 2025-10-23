import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { jsonEntity, jsonError } from '@/lib/api/response';
import { z } from 'zod';

/**
 * POST /api/notifications/push/subscribe
 * Body: { token: string, deviceType: 'web' | 'ios' | 'android', deviceName?: string, browser?: string }
 * Registers (or re-activates) an FCM device token for the authenticated user.
 */
const BodySchema = z.object({
  token: z.string().min(1, 'FCM token is required'),
  deviceType: z.enum(['web', 'ios', 'android']),
  deviceName: z.string().optional(),
  browser: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return jsonError(req, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }
    const userId = session.user.id;

    const json = await req.json().catch(() => ({}));
    const body = BodySchema.parse(json);

    const now = new Date();

    // Upsert by unique token; if token exists, reassign to current user and update metadata.
    const existing = await prisma.pushSubscription.findUnique({
      where: { token: body.token },
      select: { id: true, userId: true },
    });

    let subscriptionId: string;

    if (existing) {
      const updated = await prisma.pushSubscription.update({
        where: { token: body.token },
        data: {
          userId,
          enabled: true,
          lastUsedAt: now,
          deviceType: body.deviceType,
          deviceName: body.deviceName,
          browser: body.browser,
        },
        select: { id: true },
      });
      subscriptionId = updated.id;
    } else {
      const created = await prisma.pushSubscription.create({
        data: {
          userId,
          token: body.token,
          deviceType: body.deviceType,
          deviceName: body.deviceName,
          browser: body.browser,
          enabled: true,
          lastUsedAt: now,
        },
        select: { id: true },
      });
      subscriptionId = created.id;
    }

    // Ensure the user has a NotificationPreference row (defaults apply)
    await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return jsonEntity(req, { ok: true, subscriptionId }, 200);
  } catch (err) {
    return jsonError(req, err, { title: 'Failed to subscribe push token', status: 400 });
  }
}