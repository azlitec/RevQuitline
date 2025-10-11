import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  requirePermission,
  toProblemJson,
} from '@/lib/api/guard';
import {
  auditCreate,
  buildProvenanceMetadata,
} from '@/lib/audit/audit';

/**
 * Integration Error Queue Retry (patient-scoped)
 * POST /api/investigations/ingest/retry
 *
 * Processes queued IntegrationError entries for a specific patient by attempting to
 * map and persist InvestigationResult records (Order → Result → Review-ready).
 *
 * Why: Provides resilient ingestion with backoff and audit provenance to meet safety/
 * compliance requirements and operational robustness for lab feeds.
 *
 * RBAC: Requires 'investigation.create'
 */

// ===== Zod =====
const RetrySchema = z.object({
  patientId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// ===== Shared mapping (copied/adapted from FHIR ingest) =====
type ParsedObservation = {
  code?: string | null;
  name?: string | null;
  value?: string | null;
  units?: string | null;
  referenceRangeLow?: number | null;
  referenceRangeHigh?: number | null;
  referenceRangeText?: string | null;
  interpretation?: 'normal' | 'abnormal' | 'critical' | null;
  performer?: string | null;
  observedAt?: Date | null;
  fhirObservation: any;
};

function safeGetCodeAndDisplay(obs: any): { code?: string | null; display?: string | null } {
  const coding = obs?.code?.coding;
  if (Array.isArray(coding) && coding.length > 0) {
    const c0 = coding[0];
    return {
      code: c0?.code ?? null,
      display: c0?.display ?? obs?.code?.text ?? null,
    };
  }
  return {
    code: undefined,
    display: obs?.code?.text ?? null,
  };
}

function extractValue(obs: any): { value?: string | null; units?: string | null } {
  if (obs?.valueQuantity) {
    const v = obs.valueQuantity;
    const val = v?.value != null ? String(v.value) : null;
    const unit = v?.unit ?? v?.code ?? null;
    return { value: val, units: unit };
  }
  if (typeof obs?.valueString === 'string') {
    return { value: obs.valueString, units: null };
  }
  if (typeof obs?.valueInteger === 'number') {
    return { value: String(obs.valueInteger), units: null };
  }
  if (typeof obs?.valueBoolean === 'boolean') {
    return { value: obs.valueBoolean ? 'true' : 'false', units: null };
  }
  if (obs?.valueCodeableConcept?.text) {
    return { value: obs.valueCodeableConcept.text, units: null };
  }
  return { value: null, units: null };
}

function extractReferenceRange(obs: any): {
  low?: number | null;
  high?: number | null;
  text?: string | null;
} {
  const rr = Array.isArray(obs?.referenceRange) ? obs.referenceRange[0] : undefined;
  const low = rr?.low?.value != null ? Number(rr.low.value) : null;
  const high = rr?.high?.value != null ? Number(rr.high.value) : null;
  const text = rr?.text ?? null;
  return { low, high, text };
}

function mapInterpretation(obs: any): 'normal' | 'abnormal' | 'critical' | null {
  const cc = Array.isArray(obs?.interpretation) ? obs.interpretation[0] : undefined;
  const coding = Array.isArray(cc?.coding) && cc.coding.length > 0 ? cc.coding[0] : undefined;
  const code: string | undefined = coding?.code ?? undefined;
  const text: string | undefined = cc?.text ?? undefined;
  const norm = (code || text || '').toString().toUpperCase();
  if (norm === 'N' || /NORMAL/.test(norm)) return 'normal';
  if (['A', 'AB', 'H', 'L', 'HIGH', 'LOW', 'ABNORMAL'].some((k) => norm.includes(k))) return 'abnormal';
  if (['HH', 'LL', 'CRIT', 'CRITICAL', 'PANIC'].some((k) => norm.includes(k))) return 'critical';
  return null;
}

function extractPerformer(obs: any): string | null {
  const perf = Array.isArray(obs?.performer) ? obs.performer[0] : undefined;
  return perf?.display ?? null;
}

function extractObservedAt(obs: any): Date | null {
  const dt = obs?.effectiveDateTime ?? obs?.issued ?? obs?.meta?.lastUpdated;
  if (dt) {
    const d = new Date(dt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseObservation(obs: any): ParsedObservation {
  const { code, display } = safeGetCodeAndDisplay(obs);
  const { value, units } = extractValue(obs);
  const { low, high, text } = extractReferenceRange(obs);
  const interpretation = mapInterpretation(obs);
  const performer = extractPerformer(obs);
  const observedAt = extractObservedAt(obs);

  return {
    code: code ?? null,
    name: display ?? null,
    value: value ?? null,
    units: units ?? null,
    referenceRangeLow: low ?? null,
    referenceRangeHigh: high ?? null,
    referenceRangeText: text ?? null,
    interpretation,
    performer,
    observedAt: observedAt ?? null,
    fhirObservation: obs,
  };
}

async function findOrCreateOrder(params: {
  patientId: string;
  providerId?: string | null;
  encounterId?: string | null;
  preferredOrderId?: string | null;
  parsed: ParsedObservation;
}) {
  const { patientId, providerId, encounterId, preferredOrderId, parsed } = params;

  if (preferredOrderId) {
    const existing = await prisma.investigationOrder.findUnique({ where: { id: preferredOrderId } });
    if (existing) return existing.id;
  }

  const name = parsed.name ?? undefined;
  const code = parsed.code ?? undefined;

  const where: any = { patientId };
  if (code || name) {
    where.OR = [
      ...(code ? [{ code: code }] : []),
      ...(name ? [{ name: name }] : []),
    ];
  }

  const recent = await prisma.investigationOrder.findFirst({
    where,
    orderBy: { orderedAt: 'desc' },
    select: { id: true },
  });
  if (recent) return recent.id;

  const prov = providerId ?? null;
  const created = await prisma.investigationOrder.create({
    data: {
      patientId,
      providerId: prov ?? 'unknown-provider',
      encounterId: encounterId ?? null,
      code: code ?? null,
      name: name ?? parsed.code ?? 'Observation',
      status: 'completed' as any,
      orderedAt: parsed.observedAt ?? new Date(),
      notes: 'Auto-created by Retry ingestion',
    },
    select: { id: true },
  });
  return created.id;
}

// ===== Backoff =====
function getRetryDelayMs(retryCount: number): number {
  const base = 15 * 60 * 1000; // 15 minutes
  const capped = Math.min(retryCount, 5);
  return base * Math.pow(2, capped); // 15m, 30m, 60m, 120m, 240m, 480m
}

// ===== Handler =====
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
    const parsed = RetrySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { patientId, limit } = parsed.data;

    // Pull eligible errors for this patient
    const now = new Date();
    const errs = await prisma.integrationError.findMany({
      where: {
        patientId,
        status: { in: ['pending', 'retrying', 'failed'] as any },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: [{ nextRetryAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    if (!errs.length) {
      return NextResponse.json(
        { processed: 0, resolved: 0, failed: 0, details: [] },
        { status: 200 }
      );
    }

    const results: Array<{ id: string; status: 'resolved' | 'failed'; message?: string }> = [];
    let resolved = 0;
    let failed = 0;

    for (const e of errs) {
      // Transition to retrying
      await prisma.integrationError.update({
        where: { id: e.id },
        data: { status: 'retrying' as any, lastTriedAt: new Date() },
      });

      try {
        const payload = e.payload as any;
        const po = parseObservation(payload);

        const orderId = await findOrCreateOrder({
          patientId: e.patientId,
          providerId: null,
          encounterId: null,
          preferredOrderId: e.orderId ?? null,
          parsed: po,
        });

        const created = await prisma.investigationResult.create({
          data: {
            orderId,
            code: po.code ?? null,
            name: po.name ?? null,
            value: po.value ?? null,
            units: po.units ?? null,
            referenceRangeLow: po.referenceRangeLow ?? null,
            referenceRangeHigh: po.referenceRangeHigh ?? null,
            referenceRangeText: po.referenceRangeText ?? null,
            interpretation: (po.interpretation as any) ?? null,
            performer: po.performer ?? null,
            observedAt: po.observedAt ?? new Date(),
            fhirObservation: po.fhirObservation as any,
          },
          select: { id: true, orderId: true },
        });

        // Audit (source integration)
        await auditCreate(
          request as any,
          session,
          'investigation_result',
          created.id,
          buildProvenanceMetadata(session, {
            source: 'retry',
            orderId: created.orderId,
            integrationErrorId: e.id,
          })
        );

        // Mark resolved
        await prisma.integrationError.update({
          where: { id: e.id },
          data: { status: 'resolved' as any, nextRetryAt: null, errorMessage: '' },
        });

        results.push({ id: e.id, status: 'resolved' });
        resolved += 1;
      } catch (err: any) {
        const newCount = (e.retryCount ?? 0) + 1;
        const delay = getRetryDelayMs(newCount);
        await prisma.integrationError.update({
          where: { id: e.id },
          data: {
            status: 'failed' as any,
            retryCount: newCount,
            nextRetryAt: new Date(Date.now() + delay),
            errorMessage: err?.message ?? 'Retry failed',
            lastTriedAt: new Date(),
          },
        });
        results.push({ id: e.id, status: 'failed', message: err?.message ?? 'Retry failed' });
        failed += 1;
      }
    }

    return NextResponse.json(
      {
        processed: errs.length,
        resolved,
        failed,
        details: results,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Investigations Ingest Retry POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to process retry queue', status }), issues },
      { status }
    );
  }
}