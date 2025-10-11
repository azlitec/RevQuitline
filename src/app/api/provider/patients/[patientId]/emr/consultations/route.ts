import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { requirePermission, ensureProviderPatientLink, toProblemJson, parseJson } from '@/lib/api/guard';
import {
  EmrConsultationListQuerySchema,
  EmrConsultationCreateSchema,
  EmrConsultationUpdateSchema,
} from '@/lib/validators/emr';
import { ConsultationController } from '@/lib/controllers/consultation.controller';

/**
 * Provider EMR Consultations Route
 * /api/provider/patients/{patientId}/emr/consultations
 *
 * - GET: list encounters (consultations) for provider↔patient with pagination/filters
 * - POST: create encounter; auto-create draft ProgressNote when status=in_progress
 * - PUT: update encounter; detect transition to in_progress and auto-create draft note
 *
 * Cross-cutting:
 * - RBAC via requirePermission (encounter.read/create/update)
 * - Provider↔patient link enforced via ensureProviderPatientLink
 * - RFC7807 Problem+JSON errors via toProblemJson
 * - Auditing handled in ConsultationController
 */

function parseListQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    status: sp.get('status') ?? undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
  };
  const parsed = EmrConsultationListQuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), {
      status: 400,
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

/**
 * GET /api/provider/patients/{patientId}/emr/consultations
 * List encounters for provider↔patient.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    try {
      requirePermission(session, 'encounter.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Link guard
    try {
      await ensureProviderPatientLink(session, patientId);
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Access denied', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const query = parseListQuery(request);
    const providerId = session.user.id;

    const result = await ConsultationController.list(
      request,
      session,
      providerId,
      patientId,
      query
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[EMR Consultations GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to list consultations', status }), issues },
      { status }
    );
  }
}

/**
 * POST /api/provider/patients/{patientId}/emr/consultations
 * Create encounter for provider↔patient (status=in_progress auto-creates draft ProgressNote).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    try {
      requirePermission(session, 'encounter.create');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Link guard
    try {
      await ensureProviderPatientLink(session, patientId);
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Access denied', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const body = await parseJson(request as any, EmrConsultationCreateSchema);
    const providerId = session.user.id;

    const created = await ConsultationController.create(
      request,
      session,
      providerId,
      patientId,
      body
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('[EMR Consultations POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to create consultation', status }), issues },
      { status }
    );
  }
}

/**
 * PUT /api/provider/patients/{patientId}/emr/consultations
 * Update encounter; detect transition to in_progress and auto-create draft note.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    try {
      requirePermission(session, 'encounter.update');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Link guard
    try {
      await ensureProviderPatientLink(session, patientId);
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Access denied', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const body = await parseJson(request as any, EmrConsultationUpdateSchema);
    const providerId = session.user.id;

    const updated = await ConsultationController.update(
      request,
      session,
      providerId,
      patientId,
      body
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error('[EMR Consultations PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to update consultation', status }), issues },
      { status }
    );
  }
}