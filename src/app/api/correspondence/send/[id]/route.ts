import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { auditSend, buildProvenanceMetadata } from '@/lib/audit/audit';
import { requirePermission } from '@/lib/api/guard';
import { validateBody } from '@/lib/api/validate';
import { errorResponse, jsonEntity } from '@/lib/api/response';
import { sanitizeHtml, stripHtml } from '@/lib/security/sanitize';
import { EmailSchema } from '@/lib/validators/common';
import { sendEmail } from '@/lib/email/emailService';

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
      return errorResponse('Unauthorized', 401);
    }

    // RBAC
    try {
      requirePermission(session, 'correspondence.send');
    } catch (err: any) {
      return errorResponse('Permission error', err?.status ?? 403);
    }

    const id = getIdFromUrl(request);
    if (!id) {
      return errorResponse('Invalid URL. Missing id.', 400);
    }

    const parsed = await validateBody(request, SendSchema);
    if ('error' in parsed) return parsed.error;
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
      return errorResponse('Correspondence not found', 404);
    }

    if (existing.direction !== 'outbound') {
      return errorResponse('Only outbound correspondence can be sent', 409);
    }

    if (existing.sentAt) {
      return errorResponse('Correspondence already sent; cannot send again', 409);
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

    // If channel is email, validate recipients, sanitize body, and prevent header injection before sending
    if (body.transmissionChannel === 'email') {
      const recipientsRaw = Array.isArray(updated.recipients) ? (updated.recipients as any as string[]) : [];
      const recipients = recipientsRaw.filter(Boolean).map(r => r.trim());

      // Validate each recipient as a proper email and disallow header injection characters
      const EmailArraySchema = z.array(EmailSchema).nonempty();
      const emailArrayParse = EmailArraySchema.safeParse(recipients);
      if (!emailArrayParse.success) {
        return errorResponse('Invalid recipient email(s)', 400, { errors: emailArrayParse.error.flatten() });
      }
      for (const r of recipients) {
        if (/[\r\n:]/.test(r)) {
          return errorResponse('Invalid recipient email (header injection detected)', 400);
        }
      }

      // Sanitize subject/body; prevent header injection via CRLF
      const subjectClean = stripHtml(updated.subject || '').trim();
      if (/[\r\n]/.test(subjectClean)) {
        return errorResponse('Invalid subject (header injection detected)', 400);
      }
      const sanitizedHtml = sanitizeHtml(updated.body || '');

      // Best-effort send per recipient (non-blocking errors logged, do not leak PHI)
      for (const to of recipients) {
        try {
          await sendEmail(to, subjectClean, sanitizedHtml);
        } catch (sendErr) {
          console.error('[Correspondence SEND] Email delivery failure', { id: updated.id, to, message: (sendErr as any)?.message });
        }
      }
    }

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

    return jsonEntity(request, {
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
    }, 200);
  } catch (err: any) {
    console.error('[Correspondence SEND POST] Error', { message: err?.message });
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return errorResponse('Failed to send correspondence', status);
  }
}