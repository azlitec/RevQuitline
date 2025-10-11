import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  auditView,
  auditCreate,
  auditUpdate,
  buildProvenanceMetadata,
} from '@/lib/audit/audit';
import {
  requirePermission,
  toProblemJson,
  AttachmentMetaSchema,
} from '@/lib/api/guard';

/**
 * Correspondence In/Out
 * - GET /api/correspondence
 *   List correspondence with filters (direction/category/sent status/date ranges) and pagination;
 *   search by subject/body keywords (case-insensitive).
 *
 * - POST /api/correspondence
 *   Create new correspondence (inbound or outbound) with recipients, rich-text body, merge fields, and attachments.
 *
 * - PUT /api/correspondence
 *   Update an existing correspondence (only if not sent/finalized).
 *
 * RBAC:
 * - GET requires 'correspondence.read'
 * - POST requires 'correspondence.create'
 * - PUT requires 'correspondence.update'
 *
 * Audit:
 * - All endpoints log view/create/update with provenance.
 *
 * Note:
 * - Sending is handled separately by POST /api/correspondence/send/[id] (sets sentBy, sentAt, channel).
 */

// ===== Zod Schemas =====

const CorrespondenceDirectionEnum = z.enum(['inbound', 'outbound']);
const CorrespondenceCategoryEnum = z.enum(['referral', 'reply', 'discharge', 'memo']);
const TransmissionChannelEnum = z.enum(['email', 'fax', 'portal', 'print', 'other']);

const RecipientSchema = z.object({
  type: z.enum(['organization', 'provider', 'contact']).optional(),
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  contact: z.string().optional(), // phone/email/fax
  email: z.string().email().optional(),
  fax: z.string().optional(),
  externalId: z.string().optional(),
});

const CorrespondenceCreateSchema = z.object({
  encounterId: z.string().optional(),
  patientId: z.string().min(1),
  // For outbound, senderId defaults to current session.user.id; for inbound, senderId may be null or provided
  direction: CorrespondenceDirectionEnum,
  category: CorrespondenceCategoryEnum,
  recipients: z.array(RecipientSchema).min(0).default([]),
  subject: z.string().min(1),
  body: z.string().min(1), // rich text (HTML)
  mergeFields: z.record(z.any()).optional(),
  attachments: z.array(AttachmentMetaSchema).optional(),
  // Optional transmission fields (if already sent via backfill)
  transmissionChannel: TransmissionChannelEnum.optional(),
  sentAt: z.string().datetime().optional(),
});

const CorrespondenceUpdateSchema = z.object({
  id: z.string().min(1),
  encounterId: z.string().optional(),
  patientId: z.string().optional(),
  direction: CorrespondenceDirectionEnum.optional(),
  category: CorrespondenceCategoryEnum.optional(),
  recipients: z.array(RecipientSchema).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  mergeFields: z.record(z.any()).optional(),
  attachments: z.array(AttachmentMetaSchema).optional(),
});

// List query schema
const CorrespondenceQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().optional(),
  encounterId: z.string().optional(),
  direction: CorrespondenceDirectionEnum.optional(),
  category: CorrespondenceCategoryEnum.optional(),
  sent: z.coerce.boolean().optional(), // filter records with sentAt IS/IS NOT NULL
  dateFrom: z.string().datetime().optional(), // used against sentAt if sent=true else createdAt
  dateTo: z.string().datetime().optional(),
  keywords: z.string().optional(), // subject/body search
  senderId: z.string().optional(), // created by (for outbound primarily)
  sentById: z.string().optional(),
  transmissionChannel: TransmissionChannelEnum.optional(),
});

// ===== Helpers =====

function parseQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    patientId: sp.get('patientId') ?? undefined,
    encounterId: sp.get('encounterId') ?? undefined,
    direction: sp.get('direction') ?? undefined,
    category: sp.get('category') ?? undefined,
    sent: sp.get('sent') ?? undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
    keywords: sp.get('keywords') ?? undefined,
    senderId: sp.get('senderId') ?? undefined,
    sentById: sp.get('sentById') ?? undefined,
    transmissionChannel: sp.get('transmissionChannel') ?? undefined,
  };
  const parsed = CorrespondenceQuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), {
      status: 400,
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

// ===== GET (List) =====

export async function GET(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      requirePermission(session, 'correspondence.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const {
      page,
      pageSize,
      patientId,
      encounterId,
      direction,
      category,
      sent,
      dateFrom,
      dateTo,
      keywords,
      senderId,
      sentById,
      transmissionChannel,
    } = parseQuery(request);

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (encounterId) where.encounterId = encounterId;
    if (direction) where.direction = direction;
    if (category) where.category = category;
    if (typeof sent === 'boolean') {
      where.sentAt = sent ? { not: null } : null;
    }
    if (senderId) where.senderId = senderId;
    if (sentById) where.sentById = sentById;
    if (transmissionChannel) where.transmissionChannel = transmissionChannel;

    // Date range
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : undefined;
      const to = dateTo ? new Date(dateTo) : undefined;
      if (typeof sent === 'boolean' && sent) {
        where.sentAt = where.sentAt ?? {};
        if (from) where.sentAt.gte = from;
        if (to) where.sentAt.lte = to;
      } else {
        where.createdAt = {};
        if (from) where.createdAt.gte = from;
        if (to) where.createdAt.lte = to;
      }
    }

    // Keywords search: subject/body
    if (keywords) {
      where.OR = [
        { subject: { contains: keywords, mode: 'insensitive' } },
        { body: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.correspondence.findMany({
        where,
        orderBy: [
          // prioritize sentAt when available
          { sentAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: page * pageSize,
        take: pageSize,
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
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true, specialty: true },
          },
        },
      }),
      prisma.correspondence.count({ where }),
    ]);

    await auditView(
      request,
      session,
      'correspondence',
      'list',
      buildProvenanceMetadata(session, {
        patientId,
        encounterId,
        direction,
        category,
        sent,
        page,
        pageSize,
        keywords,
      })
    );

    const result = items.map((c) => ({
      id: c.id,
      encounterId: c.encounterId ?? null,
      patientId: c.patientId,
      senderId: c.senderId ?? null,
      sender: c.sender
        ? {
            id: c.sender.id,
            name: `${c.sender.firstName ?? ''} ${c.sender.lastName ?? ''}`.trim() || null,
            email: c.sender.email ?? null,
            specialty: c.sender.specialty ?? null,
          }
        : null,
      recipients: c.recipients ?? [],
      subject: c.subject,
      body: c.body,
      mergeFields: c.mergeFields ?? null,
      attachments: c.attachments ?? null,
      direction: c.direction,
      category: c.category,
      transmissionChannel: c.transmissionChannel ?? null,
      sentById: c.sentById ?? null,
      sentAt: c.sentAt ? c.sentAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ items: result, total, page, pageSize }, { status: 200 });
  } catch (err: any) {
    console.error('[Correspondence GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to list correspondence', status }), issues },
      { status }
    );
  }
}

// ===== POST (Create) =====

export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      requirePermission(session, 'correspondence.create');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = CorrespondenceCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const created = await prisma.correspondence.create({
      data: {
        encounterId: body.encounterId ?? null,
        patientId: body.patientId,
        senderId: body.direction === 'outbound' ? session.user.id : null,
        recipients: (body.recipients as any) ?? [],
        subject: body.subject,
        body: body.body,
        mergeFields: body.mergeFields ? (body.mergeFields as any) : undefined,
        attachments: body.attachments ? (body.attachments as any) : undefined,
        direction: body.direction as any,
        category: body.category as any,
        transmissionChannel: body.transmissionChannel ? (body.transmissionChannel as any) : undefined,
        sentById: null,
        sentAt: body.sentAt ? new Date(body.sentAt) : null,
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

    await auditCreate(
      request,
      session,
      'correspondence',
      created.id,
      buildProvenanceMetadata(session, {
        patientId: created.patientId,
        encounterId: created.encounterId,
        direction: created.direction,
        category: created.category,
      })
    );

    return NextResponse.json(
      {
        correspondence: {
          ...created,
          encounterId: created.encounterId ?? null,
          senderId: created.senderId ?? null,
          transmissionChannel: created.transmissionChannel ?? null,
          sentById: created.sentById ?? null,
          sentAt: created.sentAt ? created.sentAt.toISOString() : null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Correspondence POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to create correspondence', status }),
      { status }
    );
  }
}

// ===== PUT (Update - only when unsent) =====

export async function PUT(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      requirePermission(session, 'correspondence.update');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = CorrespondenceUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const existing = await prisma.correspondence.findUnique({
      where: { id: body.id },
      select: { id: true, sentAt: true, patientId: true, direction: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Correspondence not found' }, { status: 404 });
    }
    if (existing.sentAt) {
      return NextResponse.json(
        { error: 'Correspondence already sent; updates are not permitted' },
        { status: 409 }
      );
    }

    const updated = await prisma.correspondence.update({
      where: { id: body.id },
      data: {
        encounterId: body.encounterId ?? undefined,
        patientId: body.patientId ?? undefined,
        direction: (body.direction as any) ?? undefined,
        category: (body.category as any) ?? undefined,
        recipients: body.recipients ? (body.recipients as any) : undefined,
        subject: body.subject ?? undefined,
        body: body.body ?? undefined,
        mergeFields: body.mergeFields ? (body.mergeFields as any) : undefined,
        attachments: body.attachments ? (body.attachments as any) : undefined,
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

    await auditUpdate(
      request,
      session,
      'correspondence',
      updated.id,
      buildProvenanceMetadata(session, {
        patientId: updated.patientId,
        direction: updated.direction,
        category: updated.category,
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
    console.error('[Correspondence PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to update correspondence', status }),
      { status }
    );
  }
}