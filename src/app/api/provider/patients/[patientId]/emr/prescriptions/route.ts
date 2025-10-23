import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import {
  requirePermission,
  ensureProviderPatientLink,
  parseJson,
} from '@/lib/api/guard';
import { PrescriptionCreateSchema, PrescriptionUpdateSchema } from '@/lib/validators/prescription';
import { PrescriptionStatus } from '@prisma/client';
import { PrescriptionController } from '@/lib/controllers/prescription.controller';
import { jsonList, jsonEntity, jsonError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Provider EMR Prescriptions Route (Medication-backed)
 * /api/provider/patients/{patientId}/emr/prescriptions
 *
 * - GET: list prescriptions (medications) for provider↔patient with pagination/filters
 * - POST: create prescription
 * - PUT: update prescription
 *
 * Guards:
 * - GET: encounter.read + approved provider↔patient link
 * - POST/PUT: provider with draft/update capabilities + approved provider↔patient link
 * Errors:
 * - RFC7807 Problem+JSON via toProblemJson()
 */

function parseListQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const page = Number(sp.get('page') ?? '0');
  const pageSize = Number(sp.get('pageSize') ?? '20');
  const statusParam = sp.get('status') ?? undefined;
  const status = statusParam ? statusParam.toUpperCase() : undefined;
  const dateFrom = sp.get('dateFrom') ?? undefined;
  const dateTo = sp.get('dateTo') ?? undefined;
  const keywords = sp.get('keywords') ?? undefined;
  return { page, pageSize, status, dateFrom, dateTo, keywords };
}

/**
 * GET /api/provider/patients/{patientId}/emr/prescriptions
 * List prescriptions for provider↔patient.
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
      requirePermission(session, 'medication.read');
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

    const { page, pageSize, status, dateFrom, dateTo } = parseListQuery(request);
    const providerId = session.user.id;

    const filters = {
      status: status ? (status as PrescriptionStatus) : undefined,
      dateRange: dateFrom || dateTo ? { from: dateFrom ? new Date(dateFrom) : undefined, to: dateTo ? new Date(dateTo) : undefined } : undefined,
      patientId,
      limit: pageSize,
      offset: page * pageSize,
    };

    const result = await PrescriptionController.handleGetPrescriptions(
      request,
      session,
      providerId,
      'PROVIDER',
      filters
    );

    return jsonList(request, { items: result.items, total: result.total, page, pageSize }, 200);
  } catch (err: any) {
    console.error('[EMR Prescriptions GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to list prescriptions', status });
  }
}

/**
 * POST /api/provider/patients/{patientId}/emr/prescriptions
 * Create prescription for provider↔patient.
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

    // RBAC: granular permission for medication create
    try {
      requirePermission(session, 'medication.create');
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

    // Validate payload
    const body = await parseJson(request as any, PrescriptionCreateSchema);

    // Enforce body.patientId to match path patientId for integrity
    if (body.patientId !== patientId) {
      return jsonError(request, new Error('PatientId in body does not match path'), { title: 'Validation error', status: 400 });
    }

    const providerId = session.user.id;

    const created = await PrescriptionController.handleCreatePrescription(
      request,
      session,
      providerId,
      body
    );

    return jsonEntity(request, created, 201);
  } catch (err: any) {
    console.error('[EMR Prescriptions POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to create prescription', status });
  }
}

/**
 * PUT /api/provider/patients/{patientId}/emr/prescriptions
 * Update prescription for provider↔patient.
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

    // RBAC: granular permission for medication update
    try {
      requirePermission(session, 'medication.update');
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

    // Validate payload
    const body = await parseJson(request as any, PrescriptionUpdateSchema);
    const providerId = session.user.id;
    const prescriptionId = body.id;

    const updated = await PrescriptionController.handleUpdatePrescription(
      request,
      session,
      prescriptionId,
      providerId,
      'PROVIDER',
      body
    );

    return jsonEntity(request, updated, 200);
  } catch (err: any) {
    console.error('[EMR Prescriptions PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to update prescription', status });
  }
}