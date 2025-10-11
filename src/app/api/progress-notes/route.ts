import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import {
  auditView,
  auditCreate,
  auditUpdate,
  buildProvenanceMetadata,
} from '@/lib/audit/audit';
import {
  ProgressNoteDraftCreateSchema,
  ProgressNoteUpdateSchema,
  parseJson,
  toProblemJson,
  requirePermission,
  requireProviderForDraftOrUpdate,
} from '@/lib/api/guard';
import { z } from 'zod';

/**
 * Progress Notes (SOAP) REST endpoints
 *
 * - GET /api/progress-notes
 *   List notes with filters (patientId, authorId, status) and pagination; keyword search across SOAP fields and summary.
 *
 * - POST /api/progress-notes
 *   Create a new draft progress note (SOAP) tied to Encounter or legacy Appointment.
 *
 * - PUT /api/progress-notes
 *   Update a draft progress note (autosave); immutable if finalized; amendments handled in a separate endpoint.
 *
 * RBAC:
 * - GET requires 'progress_note.read'
 * - POST requires provider with draft/update capability
 * - PUT requires provider with draft/update capability and ownership checks
 */

const QuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().optional(),
  authorId: z.string().optional(),
  encounterId: z.string().optional(),
  status: z.enum(['draft', 'finalized', 'amended']).optional(),
  keywords: z.string().optional(),
});

function parseQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    patientId: sp.get('patientId') ?? undefined,
    authorId: sp.get('authorId') ?? undefined,
    encounterId: sp.get('encounterId') ?? undefined,
    status: sp.get('status') ?? undefined,
    keywords: sp.get('keywords') ?? undefined,
  };
  const parsed = QuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), {
      status: 400,
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

async function isAuthorOrEncounterProviderOrAdmin(
  noteId: string,
  session: any
): Promise<boolean> {
  const note = await prisma.progressNote.findUnique({
    where: { id: noteId },
    select: {
      authorId: true,
      encounter: { select: { providerId: true } },
    },
  });
  if (!note) return false;
  const userId = session.user.id;
  const isAdmin = session.user.isAdmin === true;
  const isAuthor = note.authorId === userId;
  const isEncounterProvider = note.encounter?.providerId === userId;
  return isAdmin || isAuthor || isEncounterProvider;
}

// GET list
export async function GET(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: progress_note.read
    try {
      requirePermission(session, 'progress_note.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const { page, pageSize, patientId, authorId, encounterId, status, keywords } = parseQuery(
      request
    );

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (authorId) where.authorId = authorId;
    if (encounterId) where.encounterId = encounterId;
    if (status) where.status = status;

    if (keywords && keywords.trim().length > 0) {
      const kw = keywords.trim();
      where.OR = [
        { subjective: { contains: kw, mode: 'insensitive' } },
        { objective: { contains: kw, mode: 'insensitive' } },
        { assessment: { contains: kw, mode: 'insensitive' } },
        { plan: { contains: kw, mode: 'insensitive' } },
        { summary: { contains: kw, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.progressNote.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          encounterId: true,
          patientId: true,
          authorId: true,
          status: true,
          subjective: true,
          objective: true,
          assessment: true,
          plan: true,
          summary: true,
          autosavedAt: true,
          finalizedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.progressNote.count({ where }),
    ]);

    await auditView(
      request,
      session,
      'progress_note',
      'list',
      buildProvenanceMetadata(session, {
        patientId,
        authorId,
        encounterId,
        status,
        page,
        pageSize,
      })
    );

    const result = items.map((n) => ({
      ...n,
      autosavedAt: n.autosavedAt ? n.autosavedAt.toISOString() : null,
      finalizedAt: n.finalizedAt ? n.finalizedAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return NextResponse.json({ items: result, total, page, pageSize }, { status: 200 });
  } catch (err: any) {
    console.error('[ProgressNotes GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to list progress notes', status }), issues },
      { status }
    );
  }
}

// POST create draft
export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC provider draft/update capability
    try {
      requireProviderForDraftOrUpdate(session);
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const body = await parseJson(request as any, ProgressNoteDraftCreateSchema);

    // If encounterId provided, verify encounter exists and belongs to provider or authoring user
    if (body.encounterId) {
      const enc = await prisma.encounter.findUnique({
        where: { id: body.encounterId },
        select: { id: true, providerId: true, patientId: true },
      });
      if (!enc || (enc.providerId !== session.user.id && !session.user.isAdmin)) {
        return NextResponse.json(
          { error: 'Encounter not found or access denied' },
          { status: 404 }
        );
      }
      if (enc.patientId !== body.patientId) {
        return NextResponse.json(
          { error: 'Patient mismatch for encounter' },
          { status: 409 }
        );
      }
    }

    const created = await prisma.progressNote.create({
      data: {
        encounterId: body.encounterId ?? (undefined as any),
        patientId: body.patientId,
        authorId: session.user.id,
        status: 'draft' as any,
        subjective: body.subjective ?? null,
        objective: body.objective ?? null,
        assessment: body.assessment ?? null,
        plan: body.plan ?? null,
        summary: body.summary ?? null,
        attachments: body.attachments ? (body.attachments as any) : null,
      },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        authorId: true,
        status: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        summary: true,
        autosavedAt: true,
        finalizedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditCreate(
      request,
      session,
      'progress_note',
      created.id,
      buildProvenanceMetadata(session, { encounterId: created.encounterId, patientId: created.patientId })
    );

    return NextResponse.json(
      {
        note: {
          ...created,
          autosavedAt: created.autosavedAt ? created.autosavedAt.toISOString() : null,
          finalizedAt: created.finalizedAt ? created.finalizedAt.toISOString() : null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[ProgressNotes POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to create progress note', status }), issues },
      { status }
    );
  }
}

// PUT update draft (autosave)
export async function PUT(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC provider draft/update capability
    try {
      requireProviderForDraftOrUpdate(session);
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const body = await parseJson(request as any, ProgressNoteUpdateSchema);

    const existing = await prisma.progressNote.findUnique({
      where: { id: body.id },
      select: {
        id: true,
        status: true,
        authorId: true,
        patientId: true,
        encounter: { select: { id: true, providerId: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Progress note not found' }, { status: 404 });
    }

    if (existing.status === 'finalized') {
      return NextResponse.json(
        { error: 'Finalized notes are immutable; use amendment flow' },
        { status: 409 }
      );
    }

    const allowed = await isAuthorOrEncounterProviderOrAdmin(body.id, session);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Forbidden: not author or encounter provider' },
        { status: 403 }
      );
    }

    const updated = await prisma.progressNote.update({
      where: { id: body.id },
      data: {
        // Title is not part of ProgressNote; ignore if provided in legacy payload
        subjective: body.subjective ?? undefined,
        objective: body.objective ?? undefined,
        assessment: body.assessment ?? undefined,
        plan: body.plan ?? undefined,
        summary: body.summary ?? undefined,
        attachments: body.attachments ? (body.attachments as any) : undefined,
        autosavedAt: new Date(),
      },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        authorId: true,
        status: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        summary: true,
        autosavedAt: true,
        finalizedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditUpdate(
      request,
      session,
      'progress_note',
      updated.id,
      buildProvenanceMetadata(session, { encounterId: updated.encounterId, patientId: updated.patientId })
    );

    return NextResponse.json(
      {
        note: {
          ...updated,
          autosavedAt: updated.autosavedAt ? updated.autosavedAt.toISOString() : null,
          finalizedAt: updated.finalizedAt ? updated.finalizedAt.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[ProgressNotes PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to update progress note', status }), issues },
      { status }
    );
  }
}