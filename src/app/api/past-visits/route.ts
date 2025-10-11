import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { auditView, buildProvenanceMetadata } from '@/lib/audit/audit';
import { requirePermission, toProblemJson } from '@/lib/api/guard';
import { z } from 'zod';

/**
 * Past Visits Timeline
 * GET /api/past-visits
 *
 * Returns a chronological timeline of Encounters for continuity-of-care review, with key excerpts:
 * - diagnoses (ProgressNote.assessment)
 * - medications (active Medication names)
 * - plans (ProgressNote.plan)
 *
 * Filters:
 * - patientId (required)
 * - date range (dateFrom/dateTo) on Encounter.startTime
 * - clinician filter (providerId) and specialty filter (User.specialty)
 * - keyword search over ProgressNote.summary/assessment/plan (case-insensitive)
 *
 * Pagination:
 * - page (0-based), pageSize (max 100)
 *
 * RBAC:
 * - Requires encounter.read permission
 *
 * Audit:
 * - Logs a view event with provenance metadata
 */

// Zod schema for query params
const PastVisitsQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().min(1),
  providerId: z.string().optional(),
  specialty: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  keywords: z.string().optional(),
});

function parseQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    patientId: sp.get('patientId') ?? undefined,
    providerId: sp.get('providerId') ?? undefined,
    specialty: sp.get('specialty') ?? undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
    keywords: sp.get('keywords') ?? undefined,
  };
  const parsed = PastVisitsQuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), { status: 400, issues: parsed.error.flatten() });
  }
  return parsed.data;
}

export async function GET(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // RBAC: encounter.read
    try {
      requirePermission(session, 'encounter.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const { page, pageSize, patientId, providerId, specialty, dateFrom, dateTo, keywords } = parseQuery(request);

    const whereEncounter: any = {
      patientId,
    };
    if (providerId) whereEncounter.providerId = providerId;
    if (dateFrom || dateTo) {
      whereEncounter.startTime = {};
      if (dateFrom) whereEncounter.startTime.gte = new Date(dateFrom);
      if (dateTo) whereEncounter.startTime.lte = new Date(dateTo);
    }
    // Keyword search via ProgressNote fields
    const progressNoteKeywordFilter = keywords
      ? {
          progressNotes: {
            some: {
              OR: [
                { summary: { contains: keywords, mode: 'insensitive' } },
                { assessment: { contains: keywords, mode: 'insensitive' } },
                { plan: { contains: keywords, mode: 'insensitive' } },
              ],
            },
          },
        }
      : {};

    // Specialty filter via provider relation
    const providerSpecialtyFilter = specialty
      ? {
          provider: {
            specialty: {
              equals: specialty,
              mode: 'insensitive' as any,
            },
          },
        }
      : {};

    // Query encounters with latest note and provider info
    const [encounters, total] = await Promise.all([
      prisma.encounter.findMany({
        where: {
          ...whereEncounter,
          ...progressNoteKeywordFilter,
          ...providerSpecialtyFilter,
        },
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
          status: true,
          createdAt: true,
          updatedAt: true,
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialty: true,
              email: true,
            },
          },
          progressNotes: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              summary: true,
              assessment: true,
              plan: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.encounter.count({
        where: {
          ...whereEncounter,
          ...progressNoteKeywordFilter,
          ...providerSpecialtyFilter,
        },
      }),
    ]);

    // For medications, fetch active meds for the patient once (could be scoped by date in future)
    const activeMeds = await prisma.medication.findMany({
      where: {
        patientId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        dosage: true,
        frequency: true,
        instructions: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: 'desc' },
    });

    // Audit view event (timeline)
    await auditView(
      request,
      session,
      'encounter',
      'timeline',
      buildProvenanceMetadata(session, { patientId, providerId, specialty, page, pageSize, keywords })
    );

    // Shape timeline entries
    const items = encounters.map((e) => {
      const latest = e.progressNotes?.[0];
      return {
        encounterId: e.id,
        patientId: e.patientId,
        provider: e.provider
          ? {
              id: e.provider.id,
              name: `${e.provider.firstName ?? ''} ${e.provider.lastName ?? ''}`.trim() || null,
              specialty: e.provider.specialty ?? null,
              email: e.provider.email ?? null,
            }
          : null,
        type: e.type,
        mode: e.mode,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime ? e.endTime.toISOString() : null,
        location: e.location ?? null,
        status: e.status,
        // Key excerpts
        diagnoses: latest?.assessment ?? null,
        plan: latest?.plan ?? null,
        diagnosesUpdatedAt: latest?.updatedAt ? latest.updatedAt.toISOString() : null,
        // Active medications snapshot (names + basic info)
        medications: activeMeds.map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          instructions: m.instructions ?? null,
          startDate: m.startDate.toISOString(),
          endDate: m.endDate ? m.endDate.toISOString() : null,
        })),
        // Summary excerpt
        summary: latest?.summary ?? null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ items, total, page, pageSize }, { status: 200 });
  } catch (err: any) {
    console.error('[PastVisits GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to fetch past visits timeline', status }), issues },
      { status }
    );
  }
}