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
 * Investigation Orders REST endpoints
 *
 * - GET /api/investigations/orders
 *   List orders with filters and pagination. Includes last result excerpt and flags.
 *
 * - POST /api/investigations/orders
 *   Create a new investigation order for a patient. Attach to an encounter optionally.
 *
 * RBAC:
 * - GET requires 'investigation.read'
 * - POST requires 'investigation.create'
 *
 * Audit:
 * - All endpoints log view/create/update with provenance (user, IP, timestamp, etc.)
 */

// ===== Zod Schemas =====

const InvestigationOrderStatusEnum = z.enum(['ordered', 'cancelled', 'completed']);

const OrderQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().optional(),
  providerId: z.string().optional(),
  encounterId: z.string().optional(),
  status: InvestigationOrderStatusEnum.optional(),
  dateFrom: z.string().datetime().optional(), // orderedAt From
  dateTo: z.string().datetime().optional(),   // orderedAt To
  keywords: z.string().optional(),            // search over name/code
});

const OrderCreateSchema = z.object({
  patientId: z.string().min(1),
  providerId: z.string().min(1),
  encounterId: z.string().optional(),
  code: z.string().optional(),
  name: z.string().min(1),
  status: InvestigationOrderStatusEnum.default('ordered'),
  orderedAt: z.string().datetime().optional(), // defaults to server time
  notes: z.string().optional(),
  attachments: z.array(AttachmentMetaSchema).optional(),
});

const OrderUpdateSchema = z.object({
  id: z.string().min(1),
  status: InvestigationOrderStatusEnum.optional(),
  notes: z.string().optional(),
  attachments: z.array(AttachmentMetaSchema).optional(),
});

// ===== Helpers =====

function parseQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    patientId: sp.get('patientId') ?? undefined,
    providerId: sp.get('providerId') ?? undefined,
    encounterId: sp.get('encounterId') ?? undefined,
    status: sp.get('status') ?? undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
    keywords: sp.get('keywords') ?? undefined,
  };
  const parsed = OrderQuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), { status: 400, issues: parsed.error.flatten() });
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

    // RBAC
    try {
      requirePermission(session, 'investigation.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const { page, pageSize, patientId, providerId, encounterId, status, dateFrom, dateTo, keywords } =
      parseQuery(request);

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (providerId) where.providerId = providerId;
    if (encounterId) where.encounterId = encounterId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.orderedAt = {};
      if (dateFrom) where.orderedAt.gte = new Date(dateFrom);
      if (dateTo) where.orderedAt.lte = new Date(dateTo);
    }
    if (keywords) {
      where.OR = [
        { name: { contains: keywords, mode: 'insensitive' } },
        { code: { contains: keywords, mode: 'insensitive' } },
        { notes: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.investigationOrder.findMany({
        where,
        orderBy: { orderedAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          patientId: true,
          providerId: true,
          encounterId: true,
          code: true,
          name: true,
          status: true,
          orderedAt: true,
          notes: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          // include last result excerpt and interpretation flags
          results: {
            orderBy: { observedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              name: true,
              value: true,
              units: true,
              interpretation: true,
              observedAt: true,
              reviewed: true,
              reviewedAt: true,
            },
          },
        },
      }),
      prisma.investigationOrder.count({ where }),
    ]);

    await auditView(
      request,
      session,
      'investigation_order',
      'list',
      buildProvenanceMetadata(session, { patientId, providerId, encounterId, page, pageSize, keywords })
    );

    const result = items.map((o) => {
      const last = o.results?.[0];
      return {
        id: o.id,
        patientId: o.patientId,
        providerId: o.providerId,
        encounterId: o.encounterId ?? null,
        code: o.code ?? null,
        name: o.name,
        status: o.status,
        orderedAt: o.orderedAt.toISOString(),
        notes: o.notes ?? null,
        attachments: o.attachments ?? null,
        lastResult: last
          ? {
              id: last.id,
              name: last.name ?? null,
              value: last.value ?? null,
              units: last.units ?? null,
              interpretation: last.interpretation ?? null,
              observedAt: last.observedAt ? last.observedAt.toISOString() : null,
              reviewed: last.reviewed,
              reviewedAt: last.reviewedAt ? last.reviewedAt.toISOString() : null,
            }
          : null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ items: result, total, page, pageSize }, { status: 200 });
  } catch (err: any) {
    console.error('[InvestigationOrders GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to list investigation orders', status }), issues },
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
      requirePermission(session, 'investigation.create');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = OrderCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const created = await prisma.investigationOrder.create({
      data: {
        patientId: body.patientId,
        providerId: body.providerId,
        encounterId: body.encounterId ?? null,
        code: body.code ?? null,
        name: body.name,
        status: body.status as any,
        orderedAt: body.orderedAt ? new Date(body.orderedAt) : new Date(),
        notes: body.notes ?? null,
        attachments: body.attachments ? (body.attachments as any) : undefined,
      },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        encounterId: true,
        code: true,
        name: true,
        status: true,
        orderedAt: true,
        notes: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditCreate(
      request,
      session,
      'investigation_order',
      created.id,
      buildProvenanceMetadata(session, {
        patientId: created.patientId,
        providerId: created.providerId,
        encounterId: created.encounterId,
        code: created.code,
        name: created.name,
      })
    );

    return NextResponse.json(
      {
        order: {
          ...created,
          encounterId: created.encounterId ?? null,
          code: created.code ?? null,
          orderedAt: created.orderedAt.toISOString(),
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[InvestigationOrders POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to create investigation order', status }),
      { status }
    );
  }
}

// ===== PUT (Optional: Update notes/status) =====
// Supports lightweight updates (status/notes/attachments). Not strictly required but useful.

export async function PUT(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      requirePermission(session, 'investigation.update');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = OrderUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const existing = await prisma.investigationOrder.findUnique({
      where: { id: body.id },
      select: { id: true, patientId: true, providerId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updated = await prisma.investigationOrder.update({
      where: { id: body.id },
      data: {
        status: (body.status as any) ?? undefined,
        notes: body.notes ?? undefined,
        attachments: body.attachments ? (body.attachments as any) : undefined,
      },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        encounterId: true,
        code: true,
        name: true,
        status: true,
        orderedAt: true,
        notes: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditUpdate(
      request,
      session,
      'investigation_order',
      updated.id,
      buildProvenanceMetadata(session, {
        patientId: updated.patientId,
        providerId: updated.providerId,
        status: updated.status,
      })
    );

    return NextResponse.json(
      {
        order: {
          ...updated,
          encounterId: updated.encounterId ?? null,
          code: updated.code ?? null,
          orderedAt: updated.orderedAt.toISOString(),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[InvestigationOrders PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to update investigation order', status }),
      { status }
    );
  }
}