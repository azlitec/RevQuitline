import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import {
  requirePermission,
  requireProviderForDraftOrUpdate,
  ensureProviderPatientLink,
  parseJson,
} from '@/lib/api/guard';
import { EmrNotesListQuerySchema } from '@/lib/validators/emr';
import { NotesController } from '@/lib/controllers/notes.controller';
import { jsonList, jsonEntity, jsonError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Provider EMR Notes Route
 * /api/provider/patients/{patientId}/emr/notes
 *
 * - GET: list progress notes (SOAP) for provider↔patient with pagination/filters
 * - POST: create draft progress note tied to Encounter
 * - PUT: update draft progress note (autosave)
 *
 * Guards:
 * - GET: progress_note.read + approved provider↔patient link
 * - POST/PUT: provider with draft/update capabilities + approved provider↔patient link
 * Errors:
 * - RFC7807 Problem+JSON via toProblemJson()
 */

function parseListQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    encounterId: sp.get('encounterId') ?? undefined,
    status: sp.get('status') ?? undefined,
    keywords: sp.get('keywords') ?? undefined,
  };
  const parsed = EmrNotesListQuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), {
      status: 400,
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

/**
 * GET /api/provider/patients/{patientId}/emr/notes
 * List notes for provider↔patient.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    // RBAC
    try {
      requirePermission(session, 'progress_note.read');
    } catch (err: any) {
      return jsonError(request, err, { title: 'Permission error', status: err?.status ?? 403 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return jsonError(request, new Error('Patient ID is required'), { title: 'Validation error', status: 400 });
    }

    // Approved provider↔patient link
    try {
      await ensureProviderPatientLink(session, patientId);
    } catch (err: any) {
      return jsonError(request, err, { title: 'Access denied', status: err?.status ?? 403 });
    }

    const query = parseListQuery(request);
    const providerId = session.user.id;

    const result = await NotesController.list(
      request,
      session,
      providerId,
      patientId,
      query
    );

    return jsonList(request, result, 200);
  } catch (err: any) {
    console.error('[EMR Notes GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return jsonError(request, err, { title: 'Failed to list notes', status });
  }
}

/**
 * POST /api/provider/patients/{patientId}/emr/notes
 * Create draft progress note tied to Encounter.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    // RBAC provider draft/update capability
    try {
      requireProviderForDraftOrUpdate(session);
    } catch (err: any) {
      return jsonError(request, err, { title: 'Permission error', status: err?.status ?? 403 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return jsonError(request, new Error('Patient ID is required'), { title: 'Validation error', status: 400 });
    }

    // Approved provider↔patient link
    try {
      await ensureProviderPatientLink(session, patientId);
    } catch (err: any) {
      return jsonError(request, err, { title: 'Access denied', status: err?.status ?? 403 });
    }

    // Validate payload using guard DTO
    const body = await parseJson(request as any, (await import('@/lib/api/guard')).ProgressNoteDraftCreateSchema);
    const providerId = session.user.id;

    const created = await NotesController.createDraft(
      request,
      session,
      providerId,
      patientId,
      body
    );

    return jsonEntity(request, created, 201);
  } catch (err: any) {
    console.error('[EMR Notes POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return jsonError(request, err, { title: 'Failed to create progress note', status });
  }
}

/**
 * PUT /api/provider/patients/{patientId}/emr/notes
 * Update draft progress note (autosave).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    // RBAC provider draft/update capability
    try {
      requireProviderForDraftOrUpdate(session);
    } catch (err: any) {
      return jsonError(request, err, { title: 'Permission error', status: err?.status ?? 403 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return jsonError(request, new Error('Patient ID is required'), { title: 'Validation error', status: 400 });
    }

    // Approved provider↔patient link
    try {
      await ensureProviderPatientLink(session, patientId);
    } catch (err: any) {
      return jsonError(request, err, { title: 'Access denied', status: err?.status ?? 403 });
    }

    // Validate payload using guard DTO
    const body = await parseJson(request as any, (await import('@/lib/api/guard')).ProgressNoteUpdateSchema);
    const providerId = session.user.id;

    const updated = await NotesController.updateDraft(
      request,
      session,
      providerId,
      patientId,
      body
    );

    return jsonEntity(request, updated, 200);
  } catch (err: any) {
    console.error('[EMR Notes PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return jsonError(request, err, { title: 'Failed to update progress note', status });
  }
}