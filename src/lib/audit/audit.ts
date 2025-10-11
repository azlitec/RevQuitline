import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Centralized Audit Logging Utility
 * Persists comprehensive audit logs for CRUD and view events with user, timestamp, IP, and source.
 * Maps to Prisma model AuditLog and enums: AuditAction, AuditSource, EntityType.
 *
 * Usage:
 * - Import the utility and call audit(...) in API route handlers when performing operations.
 * - Optionally call pruneOldAuditLogs(...) via a scheduled job to enforce retention.
 *
 * Note: This utility is designed for Next.js App Router API routes.
 */

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'view'
  | 'finalize'
  | 'amend'
  | 'review'
  | 'send';

export type AuditSource = 'api' | 'system' | 'integration';

export type EntityType =
  | 'encounter'
  | 'progress_note'
  | 'investigation_order'
  | 'investigation_result'
  | 'correspondence'
  | 'template'
  | 'user'
  | 'appointment';

export interface AuditOptions {
  source?: AuditSource;
  metadata?: Record<string, unknown> | null;
  timestamp?: Date;
}

/**
 * Extract client IP address from request headers in a proxy-friendly manner.
 */
export function getRequestIp(req: NextRequest): string | undefined {
  const xfwd = req.headers.get('x-forwarded-for');
  if (xfwd) {
    // x-forwarded-for can be a comma-separated list; take the first (original client)
    const first = xfwd.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  // NextRequest may not expose req.ip; prefer headers
  return undefined;
}

/**
 * Safely resolves the userId from NextAuth session object.
 */
export function getSessionUserId(session: any): string | undefined {
  try {
    return session?.user?.id ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Core audit logger. Writes a single AuditLog row.
 * Wrap all API operations with calls to this function for compliance.
 */
export async function audit(
  req: NextRequest,
  session: any,
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  options?: AuditOptions
): Promise<void> {
  const ip = getRequestIp(req);
  const userId = getSessionUserId(session);
  const source: AuditSource = options?.source ?? 'api';
  const timestamp = options?.timestamp ?? new Date();
  const metadata = options?.metadata ?? null;

  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entityType,
        entityId,
        ip: ip ?? null,
        source,
        timestamp,
        metadata: metadata as any,
      },
    });
  } catch (err) {
    // Do not throw to avoid breaking clinical workflows; log server-side instead.
    console.error('[Audit] Failed to write audit log', {
      action,
      entityType,
      entityId,
      userId,
      ip,
      source,
      timestamp,
      error: err,
    });
  }
}

/**
 * Convenience method for auditing common CRUD operations.
 */
export async function auditCreate(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'create', entityType, entityId, { metadata });
}

export async function auditRead(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'read', entityType, entityId, { metadata });
}

export async function auditUpdate(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'update', entityType, entityId, { metadata });
}

export async function auditDelete(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'delete', entityType, entityId, { metadata });
}

export async function auditView(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'view', entityType, entityId, { metadata });
}

export async function auditFinalize(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'finalize', entityType, entityId, { metadata });
}

export async function auditAmend(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'amend', entityType, entityId, { metadata });
}

export async function auditReview(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'review', entityType, entityId, { metadata });
}

export async function auditSend(
  req: NextRequest,
  session: any,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return audit(req, session, 'send', entityType, entityId, { metadata });
}

/**
 * Retention policy support:
 * Call this from a scheduled job (e.g. cron) to prune audit logs older than retentionDays.
 * Default retention is 365 days if not specified.
 */
export async function pruneOldAuditLogs(retentionDays = getDefaultRetentionDays()): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoff,
        },
      },
    });
    console.log('[Audit] Pruned old audit logs', {
      retentionDays,
      deletedCount: result.count,
      cutoff: cutoff.toISOString(),
    });
    return result.count;
  } catch (err) {
    console.error('[Audit] Failed to prune audit logs', { retentionDays, error: err });
    return 0;
  }
}

/**
 * Default retention derived from env, falls back to 365 days.
 * Set HIPAA-compliant retention via AUDIT_RETENTION_DAYS environment variable.
 */
export function getDefaultRetentionDays(): number {
  const envVal = process.env.AUDIT_RETENTION_DAYS;
  const parsed = envVal ? parseInt(envVal, 10) : NaN;
  if (!isNaN(parsed) && parsed > 0) {
    return parsed;
  }
  return 365;
}

/**
 * Helper to attach basic provenance metadata for auditing convenience.
 * Example: who created/edited/viewed alongside endpoint action metadata.
 */
export function buildProvenanceMetadata(session: any, extra?: Record<string, unknown>) {
  const md: Record<string, unknown> = {
    userEmail: session?.user?.email ?? null,
    userRole: session?.user?.role ?? null,
    providerApprovalStatus: session?.user?.providerApprovalStatus ?? null,
    timestamp: new Date().toISOString(),
  };
  if (extra && typeof extra === 'object') {
    for (const [k, v] of Object.entries(extra)) {
      md[k] = v;
    }
  }
  return md;
}