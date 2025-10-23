import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { requirePermission, ensureProviderPatientLink, parseJson } from '@/lib/api/guard';
import { jsonList, jsonEntity, jsonError } from '@/lib/api/response';
import { PrescriptionController } from '@/lib/controllers/prescription.controller';
import { PrescriptionCreateSchema } from '@/lib/validators/prescription';
import { PrescriptionStatus } from '@prisma/client';
import { NotificationService } from '@/lib/notifications/notificationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Provider Prescriptions Route
 * /api/provider/prescriptions
 *
 * - GET: List all prescriptions authored by the logged-in provider with optional filters
 * - POST: Create a new prescription for a patient
 *
 * Guards:
 * - GET: medication.read
 * - POST: medication.create + approved provider↔patient link
 */

function parseProviderListQuery(req: NextRequest): {
  page: number;
  pageSize: number;
  filters: {
    status?: PrescriptionStatus;
    dateRange?: { from?: Date; to?: Date };
    patientId?: string;
    limit: number;
    offset: number;
  };
} {
  const sp = new URL(req.url).searchParams;

  const rawPage = Number(sp.get('page') ?? '0');
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;
  
  const rawPageSize = Number(sp.get('pageSize') ?? '20');
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(Math.floor(rawPageSize), 100) : 20;
  
  const statusParam = sp.get('status') ?? undefined;
  let status: PrescriptionStatus | undefined = undefined;
  if (statusParam) {
    const up = statusParam.toUpperCase();
    if (['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(up)) {
      status = up as PrescriptionStatus;
    }
  }

  const dateFromStr = sp.get('dateFrom') ?? undefined;
  const dateToStr = sp.get('dateTo') ?? undefined;
  const dateRange: { from?: Date; to?: Date } = {};
  if (dateFromStr) {
    const d = new Date(dateFromStr);
    if (!isNaN(d.getTime())) dateRange.from = d;
  }
  if (dateToStr) {
    const d = new Date(dateToStr);
    if (!isNaN(d.getTime())) dateRange.to = d;
  }

  const patientId = sp.get('patientId') ?? undefined;

  const limit = pageSize;
  const offset = page * pageSize;

  return {
    page,
    pageSize,
    filters: {
      status,
      dateRange: dateRange.from || dateRange.to ? dateRange : undefined,
      patientId,
      limit,
      offset,
    },
  };
}

/**
 * GET /api/provider/prescriptions
 * List prescriptions authored by the provider with optional filters.
 */
export async function GET(request: NextRequest) {
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

    const { page, pageSize, filters } = parseProviderListQuery(request);
    const providerId = session.user.id;

    const result = await PrescriptionController.handleGetPrescriptions(
      request,
      session,
      providerId,
      'PROVIDER',
      filters
    );

    // Map repository pagination (limit/offset) to list envelope
    return jsonList(request, { items: result.items, total: result.total, page, pageSize }, 200);
  } catch (err: any) {
    console.error('[Provider Prescriptions GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to list prescriptions', status });
  }
}

/**
 * POST /api/provider/prescriptions
 * Create a new prescription for a patient.
 */
export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    // RBAC: create
    try {
      requirePermission(session, 'medication.create');
    } catch (err: any) {
      return jsonError(request, err, { title: 'Permission error', status: err?.status ?? 403 });
    }

    // Validate payload
    const body = await parseJson(request as any, PrescriptionCreateSchema);

    // Ensure provider↔patient approved link
    try {
      await ensureProviderPatientLink(session, body.patientId);
    } catch (err: any) {
      return jsonError(request, err, { title: 'Access denied', status: err?.status ?? 403 });
    }

    const providerId = session.user.id;

    const created = await PrescriptionController.handleCreatePrescription(
      request,
      session,
      providerId,
      body
    );

    // Push notify patient about new prescription (non-blocking)
    try {
      await NotificationService.createNotification(
        body.patientId,
        'prescription',
        'New prescription created',
        'Your provider has created a new prescription. Review it in your account.',
        'high',
        '/patient/prescriptions'
      );
    } catch (notifyErr) {
      console.error('[Prescriptions] Failed to push notify patient for new prescription', notifyErr);
    }

    return jsonEntity(request, created, 201);
  } catch (err: any) {
    console.error('[Provider Prescriptions POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to create prescription', status });
  }
}