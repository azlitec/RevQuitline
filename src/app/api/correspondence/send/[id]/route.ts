import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { auditSend, buildProvenanceMetadata } from '@/lib/audit/audit';
import { requirePermission, toProblemJson } from '@/lib/api/guard';

/**
 * Send/Record Correspondence
 * POST /api/correspondence/send/[id]
 *
 * Sets transmission metadata (sentBy, sentAt, channel) for outbound correspondence.
 * - Enforces RBAC 'correspondence.send'
 * - Prevents re-sending once sentAt is set (immutable finalization of send metadata)
 * - Writes audit 'send' event with provenance
 *
 * Note: Actual delivery (email/fax/portal) can be integrated here; this endpoint records send.
 */

const TransmissionChannelEnum = z.enum(['email', 'fax', 'portal', 'print', 'other']);

const SendSchema = z.object({
  transmissionChannel: TransmissionChannelEnum,
  sentAt: z.string().datetime().optional(), // ISO timestamp; defaults to server time
});

function getIdFromUrl(req: NextRequest): string | null {
  try {
    const url = new URL(req.url);
    const m = url.pathname.match(/\/api\/correspondence\/send\/([^/]+)\/?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    try {
      requirePermission(session, 'correspondence.send');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const id = getIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Invalid URL. Missing id.' }, { status: 400 });
    }

    const json = await request.json().catch(() => null);
    const parsed = SendSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Load correspondence
    const existing = await prisma.correspondence.findUnique({
      where: { id },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        senderId: true,
        direction: true,
        category: true,
        recipients: true,
        subject: true,
        sentAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Correspondence not found' }, { status: 404 });
    }

    if (existing.direction !== 'outbound') {
      return NextResponse.json(
        { error: 'Only outbound correspondence can be sent' },
        { status: 409 }
      );
    }

    if (existing.sentAt) {
      return NextResponse.json(
        { error: 'Correspondence already sent; cannot send again' },
        { status: 409 }
      );
    }

    const sentAtDate = body.sentAt ? new Date(body.sentAt) : new Date();

    const updated = await prisma.correspondence.update({
      where: { id },
      data: {
        transmissionChannel: body.transmissionChannel as any,
        sentById: session.user.id,
        sentAt: sentAtDate,
      },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        senderId: true,
        recipients: true,
        subject: true,
        body: true,
        mergeFields: true,
        attachments: true,
        direction: true,
        category: true,
        transmissionChannel: true,
        sentById: true,
        sentAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditSend(
      request as any,
      session,
      'correspondence',
      updated.id,
      buildProvenanceMetadata(session, {
        patientId: updated.patientId,
        encounterId: updated.encounterId,
        transmissionChannel: updated.transmissionChannel,
        sentById: updated.sentById,
        sentAt: updated.sentAt ? updated.sentAt.toISOString() : null,
        recipientsCount: Array.isArray(updated.recipients) ? (updated.recipients as any[]).length : 0,
      })
    );

    return NextResponse.json(
      {
        correspondence: {
          ...updated,
          encounterId: updated.encounterId ?? null,
          senderId: updated.senderId ?? null,
          transmissionChannel: updated.transmissionChannel ?? null,
          sentById: updated.sentById ?? null,
          sentAt: updated.sentAt ? updated.sentAt.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Correspondence SEND POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to send correspondence', status }), issues },
      { status }
    );
  }
}