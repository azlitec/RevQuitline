import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { jsonList, jsonError } from '@/lib/api/response';
import { PrescriptionController } from '@/lib/controllers/prescription.controller';
import { PrescriptionStatus } from '@prisma/client';

/**
 * Patient Prescriptions Route
 * /api/patient/prescriptions
 *
 * - GET: Patient views their own prescriptions
 *
 * Guards:
 * - Requires authenticated session with patient role (USER)
 * - Providers/Staff should not access this route; they have provider/staff routes
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parsePatientListQuery(req: NextRequest): {
  page: number;
  pageSize: number;
  status?: PrescriptionStatus;
  limit: number;
  offset: number;
} {
  const sp = new URL(req.url).searchParams;

  const page = Number(sp.get('page') ?? '0');
  const pageSize = Number(sp.get('pageSize') ?? '20');

  const statusParam = sp.get('status') ?? undefined;
  let status: PrescriptionStatus | undefined = undefined;
  if (statusParam) {
    const up = statusParam.toUpperCase();
    if (['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(up)) {
      status = up as PrescriptionStatus;
    }
  }

  const limit = pageSize;
  const offset = page * pageSize;

  return { page, pageSize, status, limit, offset };
}

/**
 * GET /api/patient/prescriptions
 * Patient views their own prescriptions with optional status filter and pagination.
 */
export async function GET(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    // Enforce patient role (USER). Providers/staff should use their scoped routes.
    const role = session.user.role;
    const isProvider = session.user.isProvider === true;
    if (isProvider || (role && role !== 'USER')) {
      return jsonError(request, new Error('Forbidden'), { title: 'Forbidden', status: 403 });
    }

    const { page, pageSize, status, limit, offset } = parsePatientListQuery(request);
    const patientId = session.user.id;

    const result = await PrescriptionController.handleGetPrescriptions(
      request,
      session,
      patientId,
      'USER',
      { status, limit, offset }
    );

    return jsonList(request, { items: result.items, total: result.total, page, pageSize }, 200);
  } catch (err: any) {
    console.error('[Patient Prescriptions GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to list prescriptions', status });
  }
}