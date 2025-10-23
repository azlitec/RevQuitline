import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { jsonEntity, jsonError } from '@/lib/api/response';
import { z } from 'zod';

/**
 * POST /api/notifications/push/unsubscribe
 * Body: { token: string }
 * Unregisters an FCM device token for the authenticated user.
 */
const BodySchema = z.object({
  token: z.string().min(1, 'FCM token is required'),
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

    // Delete the token scoped to the current user only
    const result = await prisma.pushSubscription.deleteMany({
      where: { token: body.token, userId },
    });

    if (result.count === 0) {
      return jsonError(req, new Error('Token not found'), { title: 'Not Found', status: 404 });
    }

    return jsonEntity(req, { ok: true, removed: result.count }, 200);
  } catch (err) {
    return jsonError(req, err, { title: 'Failed to unsubscribe push token', status: 400 });
  }
}