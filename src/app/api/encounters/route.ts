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
  requirePermission,
  toProblemJson,
} from '@/lib/api/guard';
import { z } from 'zod';

/**
 * Encounters REST endpoints with Zod validation, pagination, RBAC, and audit logging.
 * - GET: list encounters with filters and pagination, includes latest ProgressNote summary excerpt.
 * - POST: create encounter; if status=in_progress, auto-create a draft ProgressNote.
 * - PUT: update encounter; if status transitions to in_progress, auto-create a draft ProgressNote.
 *
 * Today’s Notes workflow integration:
 * - Auto-create a draft ProgressNote when encounter starts (status set to in_progress).
 */

// ===== Zod Schemas =====

const EncounterModeEnum = z.enum(['in_person', 'telemedicine', 'phone', 'messaging']);
const EncounterStatusEnum = z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']);

const EncounterCreateSchema = z.object({
  patientId: z.string().min(1),
  providerId: z.string().min(1),
  appointmentId: z.string().optional(),
  type: z.string().min(1), // consultation, follow_up, emergency...
  mode: EncounterModeEnum.default('in_person'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  renderingProviderId: z.string().optional(),
  status: EncounterStatusEnum.default('scheduled'),
});

const EncounterUpdateSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().optional(),
  providerId: z.string().optional(),
  appointmentId: z.string().optional(),
  type: z.string().optional(),
  mode: EncounterModeEnum.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  renderingProviderId: z.string().optional(),
  status: EncounterStatusEnum.optional(),
});

const EncounterQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().optional(),
  providerId: z.string().optional(),
  status: EncounterStatusEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// ===== Helpers =====

function parseQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    patientId: sp.get('patientId') ?? undefined,
    providerId: sp.get('providerId') ?? undefined,
    status: sp.get('status') ?? undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
  };
  const parsed = EncounterQuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), { status: 400, issues: parsed.error.flatten() });
  }
  return parsed.data;
}

async function autoCreateDraftProgressNote(encounter: { id: string; patientId: string }, authorId: string) {
  const note = await prisma.progressNote.create({
    data: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      authorId,
      status: 'draft' as any,
      summary: null,
      autosavedAt: null,
      
    },
    select: { id: true },
  });
  return note;
}

// ===== GET (List with pagination and filters) =====

export async function GET(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: encounter.read required
    try {
      requirePermission(session, 'encounter.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const { page, pageSize, patientId, providerId, status, dateFrom, dateTo } = parseQuery(request);

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) where.startTime.lte = new Date(dateTo);
    }

    const [items, total] = await Promise.all([
      prisma.encounter.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          patientId: true,
          providerId: true,
          appointmentId: true,
          type: true,
          mode: true,
          startTime: true,
          endTime: true,
          location: true,
          renderingProviderId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          progressNotes: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, summary: true, updatedAt: true },
          },
        },
      }),
      prisma.encounter.count({ where }),
    ]);

    // Audit view event (not per-item to avoid noise)
    await auditView(
      request,
      session,
      'encounter',
      'list', // pseudo entityId for list views
      buildProvenanceMetadata(session, { patientId, providerId, page, pageSize })
    );

    // Shape response
    const result = items.map((e) => {
      const latest = e.progressNotes?.[0];
      return {
        id: e.id,
        patientId: e.patientId,
        providerId: e.providerId,
        appointmentId: e.appointmentId,
        type: e.type,
        mode: e.mode,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime ? e.endTime.toISOString() : null,
        location: e.location ?? null,
        renderingProviderId: e.renderingProviderId ?? null,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        latestNote: latest
          ? {
              id: latest.id,
              status: latest.status,
              summary: latest.summary ?? null,
              updatedAt: latest.updatedAt.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({ items: result, total, page, pageSize }, { status: 200 });
  } catch (err: any) {
    console.error('[Encounters GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to list encounters', status }), issues },
      { status }
    );
  }
}

// ===== POST (Create; auto-create draft ProgressNote if in_progress) =====

export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: encounter.create required
    try {
      requirePermission(session, 'encounter.create');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = EncounterCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const created = await prisma.encounter.create({
      data: {
        patientId: body.patientId,
        providerId: body.providerId,
        appointmentId: body.appointmentId ?? null,
        type: body.type,
        mode: body.mode as any,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        location: body.location ?? null,
        renderingProviderId: body.renderingProviderId ?? null,
        status: body.status as any,
      },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        appointmentId: true,
        type: true,
        mode: true,
        startTime: true,
        endTime: true,
        location: true,
        renderingProviderId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditCreate(
      request,
      session,
      'encounter',
      created.id,
      buildProvenanceMetadata(session, { patientId: created.patientId, providerId: created.providerId })
    );

    // If encounter starts immediately, auto-create a draft ProgressNote
    let draftNoteId: string | null = null;
    if (created.status === 'in_progress') {
      const note = await autoCreateDraftProgressNote(
        { id: created.id, patientId: created.patientId },
        session.user.id
      );
      draftNoteId = note.id;
      await auditCreate(
        request,
        session,
        'progress_note',
        note.id,
        buildProvenanceMetadata(session, { encounterId: created.id, patientId: created.patientId })
      );

      // If appointment exists and still scheduled/confirmed, flip to in-progress
      if (created.appointmentId) {
        const appt = await prisma.appointment.findUnique({ where: { id: created.appointmentId } });
        if (appt && (appt.status === 'scheduled' || appt.status === 'confirmed')) {
          await prisma.appointment.update({
            where: { id: created.appointmentId },
            data: { status: 'in-progress' },
          });
        }
      }
    }

    return NextResponse.json(
      {
        encounter: {
          ...created,
          startTime: created.startTime.toISOString(),
          endTime: created.endTime ? created.endTime.toISOString() : null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          draftNoteId,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Encounters POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to create encounter', status }),
      { status }
    );
  }
}

// ===== PUT (Update; auto-create draft ProgressNote on status transition to in_progress) =====

export async function PUT(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: encounter.update required
    try {
      requirePermission(session, 'encounter.update');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = EncounterUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Load existing encounter for state transition detection
    const existing = await prisma.encounter.findUnique({
      where: { id: body.id },
      select: { id: true, status: true, patientId: true, appointmentId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 });
    }

    const updated = await prisma.encounter.update({
      where: { id: body.id },
      data: {
        patientId: body.patientId ?? undefined,
        providerId: body.providerId ?? undefined,
        appointmentId: body.appointmentId ?? undefined,
        type: body.type ?? undefined,
        mode: (body.mode as any) ?? undefined,
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        location: body.location ?? undefined,
        renderingProviderId: body.renderingProviderId ?? undefined,
        status: (body.status as any) ?? undefined,
      },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        appointmentId: true,
        type: true,
        mode: true,
        startTime: true,
        endTime: true,
        location: true,
        renderingProviderId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditUpdate(
      request,
      session,
      'encounter',
      updated.id,
      buildProvenanceMetadata(session, { patientId: updated.patientId, providerId: updated.providerId })
    );

    // Detect transition to in_progress and auto-create draft ProgressNote
    let draftNoteId: string | null = null;
    const transitionedToInProgress =
      existing.status !== 'in_progress' && updated.status === 'in_progress';
    if (transitionedToInProgress) {
      const note = await autoCreateDraftProgressNote(
        { id: updated.id, patientId: updated.patientId },
        session.user.id
      );
      draftNoteId = note.id;
      await auditCreate(
        request,
        session,
        'progress_note',
        note.id,
        buildProvenanceMetadata(session, { encounterId: updated.id, patientId: updated.patientId })
      );

      // Flip appointment to in-progress if applicable
      if (updated.appointmentId) {
        const appt = await prisma.appointment.findUnique({ where: { id: updated.appointmentId } });
        if (appt && (appt.status === 'scheduled' || appt.status === 'confirmed')) {
          await prisma.appointment.update({
            where: { id: updated.appointmentId },
            data: { status: 'in-progress' },
          });
        }
      }
    }

    return NextResponse.json(
      {
        encounter: {
          ...updated,
          startTime: updated.startTime.toISOString(),
          endTime: updated.endTime ? updated.endTime.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          draftNoteId,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Encounters PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to update encounter', status }),
      { status }
    );
  }
}