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
 * Investigation Results REST endpoints
 *
 * - GET /api/investigations/results
 *   List results with filters, pagination, and flags. Supports keyword search.
 *
 * - POST /api/investigations/results
 *   Create a structured or textual result linked to an InvestigationOrder.
 *
 * - PUT /api/investigations/results
 *   Update result properties (value, units, ranges, interpretation, performer, observedAt, fhirObservation, attachments).
 *   Review workflow (reviewed, reviewerId, reviewedAt) is handled in a dedicated review endpoint.
 *
 * RBAC:
 * - GET requires 'investigation.read'
 * - POST requires 'investigation.create'
 * - PUT requires 'investigation.update'
 *
 * Audit:
 * - All endpoints log view/create/update with provenance (user, IP, timestamp, etc.)
 */

// ===== Zod Schemas =====

const ObservationInterpretationEnum = z.enum(['normal', 'abnormal', 'critical']);

const ResultQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  orderId: z.string().optional(),
  patientId: z.string().optional(), // via order.patientId
  providerId: z.string().optional(), // via order.providerId
  interpretation: ObservationInterpretationEnum.optional(),
  reviewed: z.coerce.boolean().optional(),
  dateFrom: z.string().datetime().optional(), // observedAt From
  dateTo: z.string().datetime().optional(), // observedAt To
  keywords: z.string().optional(), // search over name/code/value/referenceRangeText
});

const ResultCreateSchema = z
  .object({
    orderId: z.string().min(1),
    code: z.string().optional(),
    name: z.string().optional(),
    value: z.string().optional(), // textual values supported
    units: z.string().optional(),
    referenceRangeLow: z.number().optional(),
    referenceRangeHigh: z.number().optional(),
    referenceRangeText: z.string().optional(),
    interpretation: ObservationInterpretationEnum.optional(),
    performer: z.string().optional(),
    observedAt: z.string().datetime().optional(),
    fhirObservation: z.any().optional(), // structured FHIR Observation JSON
    attachments: z.array(AttachmentMetaSchema).optional(), // PDFs/images fallback
  })
  .refine((data) => !!data.name || !!data.code, {
    message: 'Either name or code must be provided',
    path: ['name'],
  });

const ResultUpdateSchema = z.object({
  id: z.string().min(1),
  code: z.string().optional(),
  name: z.string().optional(),
  value: z.string().optional(),
  units: z.string().optional(),
  referenceRangeLow: z.number().optional(),
  referenceRangeHigh: z.number().optional(),
  referenceRangeText: z.string().optional(),
  interpretation: ObservationInterpretationEnum.optional(),
  performer: z.string().optional(),
  observedAt: z.string().datetime().optional(),
  fhirObservation: z.any().optional(),
  attachments: z.array(AttachmentMetaSchema).optional(),
});

// ===== Helpers =====

function parseQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    orderId: sp.get('orderId') ?? undefined,
    patientId: sp.get('patientId') ?? undefined,
    providerId: sp.get('providerId') ?? undefined,
    interpretation: sp.get('interpretation') ?? undefined,
    reviewed: sp.get('reviewed') ?? undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
    keywords: sp.get('keywords') ?? undefined,
  };
  const parsed = ResultQuerySchema.safeParse(obj);
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

    // RBAC
    try {
      requirePermission(session, 'investigation.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const {
      page,
      pageSize,
      orderId,
      patientId,
      providerId,
      interpretation,
      reviewed,
      dateFrom,
      dateTo,
      keywords,
    } = parseQuery(request);

    const where: any = {};
    if (orderId) where.orderId = orderId;
    if (interpretation) where.interpretation = interpretation;
    if (typeof reviewed === 'boolean') where.reviewed = reviewed;
    if (dateFrom || dateTo) {
      where.observedAt = {};
      if (dateFrom) where.observedAt.gte = new Date(dateFrom);
      if (dateTo) where.observedAt.lte = new Date(dateTo);
    }
    if (keywords) {
      where.OR = [
        { name: { contains: keywords, mode: 'insensitive' } },
        { code: { contains: keywords, mode: 'insensitive' } },
        { value: { contains: keywords, mode: 'insensitive' } },
        { referenceRangeText: { contains: keywords, mode: 'insensitive' } },
      ];
    }
    // Relational filters via order
    if (patientId || providerId) {
      where.order = {};
      if (patientId) where.order.patientId = patientId;
      if (providerId) where.order.providerId = providerId;
    }

    const [items, total] = await Promise.all([
      prisma.investigationResult.findMany({
        where,
        orderBy: [{ observedAt: 'desc' }, { createdAt: 'desc' }],
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          orderId: true,
          code: true,
          name: true,
          value: true,
          units: true,
          referenceRangeLow: true,
          referenceRangeHigh: true,
          referenceRangeText: true,
          interpretation: true,
          performer: true,
          observedAt: true,
          reviewed: true,
          reviewerId: true,
          reviewedAt: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          order: {
            select: {
              id: true,
              patientId: true,
              providerId: true,
              encounterId: true,
              name: true,
              status: true,
              orderedAt: true,
            },
          },
        },
      }),
      prisma.investigationResult.count({ where }),
    ]);

    await auditView(
      request,
      session,
      'investigation_result',
      'list',
      buildProvenanceMetadata(session, {
        orderId,
        patientId,
        providerId,
        interpretation,
        reviewed,
        page,
        pageSize,
        keywords,
      })
    );

    const result = items.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      code: r.code ?? null,
      name: r.name ?? null,
      value: r.value ?? null,
      units: r.units ?? null,
      referenceRangeLow: r.referenceRangeLow ?? null,
      referenceRangeHigh: r.referenceRangeHigh ?? null,
      referenceRangeText: r.referenceRangeText ?? null,
      interpretation: r.interpretation ?? null,
      performer: r.performer ?? null,
      observedAt: r.observedAt ? r.observedAt.toISOString() : null,
      reviewed: r.reviewed,
      reviewerId: r.reviewerId ?? null,
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      attachments: r.attachments ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      order: r.order
        ? {
            id: r.order.id,
            patientId: r.order.patientId,
            providerId: r.order.providerId,
            encounterId: r.order.encounterId ?? null,
            name: r.order.name,
            status: r.order.status,
            orderedAt: r.order.orderedAt.toISOString(),
          }
        : null,
    }));

    return NextResponse.json({ items: result, total, page, pageSize }, { status: 200 });
  } catch (err: any) {
    console.error('[InvestigationResults GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to list investigation results', status }), issues },
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
    const parsed = ResultCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Ensure order exists
    const order = await prisma.investigationOrder.findUnique({
      where: { id: body.orderId },
      select: { id: true, patientId: true, providerId: true, encounterId: true, name: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Investigation order not found' }, { status: 404 });
    }

    const created = await prisma.investigationResult.create({
      data: {
        orderId: body.orderId,
        code: body.code ?? null,
        name: body.name ?? null,
        value: body.value ?? null,
        units: body.units ?? null,
        referenceRangeLow: body.referenceRangeLow ?? null,
        referenceRangeHigh: body.referenceRangeHigh ?? null,
        referenceRangeText: body.referenceRangeText ?? null,
        interpretation: (body.interpretation as any) ?? null,
        performer: body.performer ?? null,
        observedAt: body.observedAt ? new Date(body.observedAt) : new Date(),
        fhirObservation: body.fhirObservation ? (body.fhirObservation as any) : undefined,
        attachments: body.attachments ? (body.attachments as any) : undefined,
      },
      select: {
        id: true,
        orderId: true,
        code: true,
        name: true,
        value: true,
        units: true,
        referenceRangeLow: true,
        referenceRangeHigh: true,
        referenceRangeText: true,
        interpretation: true,
        performer: true,
        observedAt: true,
        reviewed: true,
        reviewerId: true,
        reviewedAt: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditCreate(
      request,
      session,
      'investigation_result',
      created.id,
      buildProvenanceMetadata(session, {
        orderId: created.orderId,
        code: created.code,
        name: created.name,
        interpretation: created.interpretation,
      })
    );

    return NextResponse.json(
      {
        result: {
          ...created,
          code: created.code ?? null,
          name: created.name ?? null,
          referenceRangeLow: created.referenceRangeLow ?? null,
          referenceRangeHigh: created.referenceRangeHigh ?? null,
          referenceRangeText: created.referenceRangeText ?? null,
          interpretation: created.interpretation ?? null,
          performer: created.performer ?? null,
          observedAt: created.observedAt ? created.observedAt.toISOString() : null,
          reviewerId: created.reviewerId ?? null,
          reviewedAt: created.reviewedAt ? created.reviewedAt.toISOString() : null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[InvestigationResults POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to create investigation result', status }),
      { status }
    );
  }
}

// ===== PUT (Update) =====

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
    const parsed = ResultUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const existing = await prisma.investigationResult.findUnique({
      where: { id: body.id },
      select: { id: true, orderId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Investigation result not found' }, { status: 404 });
    }

    const updated = await prisma.investigationResult.update({
      where: { id: body.id },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        value: body.value ?? undefined,
        units: body.units ?? undefined,
        referenceRangeLow: body.referenceRangeLow ?? undefined,
        referenceRangeHigh: body.referenceRangeHigh ?? undefined,
        referenceRangeText: body.referenceRangeText ?? undefined,
        interpretation: (body.interpretation as any) ?? undefined,
        performer: body.performer ?? undefined,
        observedAt: body.observedAt ? new Date(body.observedAt) : undefined,
        fhirObservation: body.fhirObservation ? (body.fhirObservation as any) : undefined,
        attachments: body.attachments ? (body.attachments as any) : undefined,
      },
      select: {
        id: true,
        orderId: true,
        code: true,
        name: true,
        value: true,
        units: true,
        referenceRangeLow: true,
        referenceRangeHigh: true,
        referenceRangeText: true,
        interpretation: true,
        performer: true,
        observedAt: true,
        reviewed: true,
        reviewerId: true,
        reviewedAt: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditUpdate(
      request,
      session,
      'investigation_result',
      updated.id,
      buildProvenanceMetadata(session, { orderId: updated.orderId, interpretation: updated.interpretation })
    );

    return NextResponse.json(
      {
        result: {
          ...updated,
          code: updated.code ?? null,
          name: updated.name ?? null,
          referenceRangeLow: updated.referenceRangeLow ?? null,
          referenceRangeHigh: updated.referenceRangeHigh ?? null,
          referenceRangeText: updated.referenceRangeText ?? null,
          interpretation: updated.interpretation ?? null,
          performer: updated.performer ?? null,
          observedAt: updated.observedAt ? updated.observedAt.toISOString() : null,
          reviewerId: updated.reviewerId ?? null,
          reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[InvestigationResults PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to update investigation result', status }),
      { status }
    );
  }
}