import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { jsonEntity, jsonError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notificationService';
import { z } from 'zod';

/**
 * Admin Broadcast Notifications
 * /api/admin/notifications/broadcast
 *
 * - POST: Send a broadcast push notification to all users or by role
 *   Body: { title: string, body: string, data?: Record<string,string>, imageUrl?: string, role?: 'ALL'|'USER'|'PROVIDER' }
 *
 * - GET: Delivery stats (last 24h) aggregated from AuditLog metadata channel='push'
 *
 * RBAC:
 * - Requires isAdmin=true
 */

const BroadcastSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  role: z.enum(['ALL', 'USER', 'PROVIDER']).default('ALL'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !session.user.isAdmin) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    // Aggregate last 24 hours push delivery attempts from AuditLog
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: since },
        metadata: { path: ['channel'], equals: 'push' } as any,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    let sent = 0;
    let invalid = 0;
    let failed = 0;
    let total = 0;

    for (const l of logs) {
      const md = l.metadata as any;
      total++;
      if (md?.success) sent++;
      else if (md?.invalid) invalid++;
      else failed++;
    }

    const stats = {
      since: since.toISOString(),
      until: now.toISOString(),
      total,
      sent,
      invalid,
      failed,
      failureRatePercent: total ? Number(((failed / total) * 100).toFixed(2)) : 0,
    };

    return jsonEntity(request, { stats }, 200);
  } catch (err: any) {
    console.error('[Admin Broadcast GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to load broadcast stats', status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !session.user.isAdmin) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = BroadcastSchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(request, new Error('Validation failed'), {
        title: 'Validation failed',
        status: 400,
      });
    }
    const { title, body, data, imageUrl, role } = parsed.data;

    // Resolve user population by role
    let where: any = {};
    if (role === 'USER') where.isProvider = false;
    if (role === 'PROVIDER') where.isProvider = true;
    // If role === 'ALL', no provider filter

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    const summary = await NotificationService.sendPushToMultiple(userIds, {
      title,
      body,
      data: data ?? {},
      imageUrl,
    });

    return jsonEntity(request, { targeted: summary.targeted, sent: summary.sent, invalid: summary.invalid, failed: summary.failed }, 200);
  } catch (err: any) {
    console.error('[Admin Broadcast POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to send broadcast notification', status });
  }
}