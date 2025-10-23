import { z } from 'zod';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * RBAC and Validation helpers for EMR endpoints.
 * - Centralizes per-route permission checks.
 * - Provides Zod schemas for Progress Note workflows (draft/update/finalize/amend).
 * - Standardizes request validation and error shaping.
 */

/* ===== Roles and Permissions (RBAC) ===== */

export type UserRole =
  | 'USER'
  | 'CLERK'
  | 'ADMIN'
  | 'PROVIDER'
  | 'PROVIDER_PENDING'
  | 'PROVIDER_REVIEWING';

export type Permission =
  | 'progress_note.read'
  | 'progress_note.create'
  | 'progress_note.update'
  | 'progress_note.finalize'
  | 'progress_note.amend'
  | 'encounter.read'
  | 'encounter.create'
  | 'encounter.update'
  | 'investigation.read'
  | 'investigation.create'
  | 'investigation.update'
  | 'investigation.review'
  | 'correspondence.read'
  | 'correspondence.create'
  | 'correspondence.update'
  | 'correspondence.send'
  | 'medication.read'
  | 'medication.create'
  | 'medication.update';

const ALL_PROGRESS_NOTE: Permission[] = [
  'progress_note.read',
  'progress_note.create',
  'progress_note.update',
  'progress_note.finalize',
  'progress_note.amend',
];

const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  ADMIN: new Set<Permission>([
    ...ALL_PROGRESS_NOTE,
    'encounter.read',
    'encounter.create',
    'encounter.update',
    'investigation.read',
    'investigation.create',
    'investigation.update',
    'investigation.review',
    'correspondence.read',
    'correspondence.create',
    'correspondence.update',
    'correspondence.send',
    'medication.read',
    'medication.create',
    'medication.update',
  ]),
  CLERK: new Set<Permission>([
    // Clerks can generally read but not author/finalize clinical content
    'progress_note.read',
    'encounter.read',
    'investigation.read',
    'correspondence.read',
    'medication.read',
  ]),
  PROVIDER: new Set<Permission>([
    ...ALL_PROGRESS_NOTE,
    'encounter.read',
    'encounter.create',
    'encounter.update',
    'investigation.read',
    'investigation.create',
    'investigation.update',
    'investigation.review',
    'correspondence.read',
    'correspondence.create',
    'correspondence.update',
    'correspondence.send',
    'medication.read',
    'medication.create',
    'medication.update',
  ]),
  PROVIDER_PENDING: new Set<Permission>([
    // Pending providers can only read their own data; cannot finalize/amend
    'progress_note.read',
    'encounter.read',
    'investigation.read',
    'correspondence.read',
    'medication.read',
  ]),
  PROVIDER_REVIEWING: new Set<Permission>([
    // Reviewing providers similar to pending
    'progress_note.read',
    'encounter.read',
    'investigation.read',
    'correspondence.read',
    'medication.read',
  ]),
  USER: new Set<Permission>([
    // Patients (USER) typically no access to provider-only endpoints
  ]),
};

export function getRoleFromSession(session: any): UserRole | undefined {
  const role = session?.user?.role as UserRole | undefined;
  return role;
}

export function isApprovedProvider(session: any): boolean {
  const role = getRoleFromSession(session);
  const isProvider = session?.user?.isProvider === true || role === 'PROVIDER';
  const approval = session?.user?.providerApprovalStatus;
  return isProvider && (approval === 'approved' || approval === undefined);
}

export function hasPermission(session: any, permission: Permission): boolean {
  const role = getRoleFromSession(session);
  if (!role) return false;
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.has(permission);
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class BadRequestError extends Error {
  status = 400;
  issues?: unknown;
  constructor(message = 'Bad Request', issues?: unknown) {
    super(message);
    this.name = 'BadRequestError';
    this.issues = issues;
  }
}

/**
 * Ensure session is present and user has a required permission.
 * Optionally require approved provider status for high-privilege actions (finalize/amend).
 */
export function requirePermission(
  session: any,
  permission: Permission,
  opts?: { requireApprovedProvider?: boolean }
) {
  if (!session || !session.user) {
    throw new UnauthorizedError('Unauthorized');
  }
  if (!hasPermission(session, permission)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  if (opts?.requireApprovedProvider) {
    if (!isApprovedProvider(session)) {
      throw new ForbiddenError('Provider not approved for this action');
    }
  }
}

/* ===== Zod Schemas (Validation) ===== */

/**
 * Shared attachment metadata schema for uploads stored as JSON arrays
 * Extended with retention tagging and expiry to support governance.
 */
export const AttachmentMetaSchema = z.object({
  url: z.string().min(1),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  checksum: z.string().optional(),
  source: z.string().optional(),
  // Patient-scoped retention
  retentionTag: z.string().optional(),           // e.g., 'order', 'result', 'correspondence', 'pmh', policy labels
  expiresAt: z.string().datetime().optional(),   // ISO datetime when attachment should be purged
});

/**
 * Progress Note Draft (create) schema aligned with SOAP structure.
 * When integrating with Encounter, encounterId can be provided; otherwise appointmentId is used for legacy flow.
 */
export const ProgressNoteDraftCreateSchema = z.object({
  // Encounter linkage required to match Prisma model (ProgressNote.encounterId is non-null)
  encounterId: z.string().min(1),
  // Legacy field retained for payload compatibility; not persisted on ProgressNote
  appointmentId: z.string().min(1).optional(),
  patientId: z.string().min(1),

  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  summary: z.string().optional(),

  attachments: z.array(AttachmentMetaSchema).optional(),
});

/**
 * Progress Note Update (draft edit) schema
 */
export const ProgressNoteUpdateSchema = z.object({
  id: z.string().min(1),
  encounterId: z.string().min(1).optional(),
  // Legacy field retained for compatibility; not persisted on ProgressNote
  appointmentId: z.string().min(1).optional(),
  // Allow partial updates (EMR inline editor sends only changed fields)
  patientId: z.string().min(1).optional(),

  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  summary: z.string().optional(),

  attachments: z.array(AttachmentMetaSchema).optional(),
});

/**
 * Progress Note Finalize schema
 * - signatureHash is a string representation of a digital signature hash (e.g., SHA-256 hex).
 */
export const ProgressNoteFinalizeSchema = z.object({
  id: z.string().min(1),
  signatureHash: z.string().min(16), // allow flexibility; enforce stronger requirements in route if needed
  finalizedAt: z.string().datetime().optional(), // ISO timestamp; default to server time
});

/**
 * Progress Note Amendment schema
 * - originalId: the finalized note being amended
 * - optional reason and new SOAP fields to append/change
 */
export const ProgressNoteAmendSchema = z.object({
  originalId: z.string().min(1),
  reason: z.string().min(1).optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  summary: z.string().optional(),
  attachments: z.array(AttachmentMetaSchema).optional(),
});

/* ===== Validation Helpers ===== */

export async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new BadRequestError('Invalid JSON payload');
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new BadRequestError('Validation failed', result.error.flatten());
  }
  return result.data as z.infer<T>;
}

export function toProblemJson(
  err: unknown,
  defaults?: { title?: string; status?: number }
) {
  const base = {
    type: 'about:blank',
    title: defaults?.title ?? 'Error',
    status: defaults?.status ?? 500,
    detail: 'An unexpected error occurred',
  } as any;

  if (err instanceof BadRequestError) {
    base.title = 'Bad Request';
    base.status = 400;
    base.detail = err.message;
    if ((err as any).issues) base.issues = (err as any).issues;
  } else if (err instanceof UnauthorizedError) {
    base.title = 'Unauthorized';
    base.status = 401;
    base.detail = err.message;
  } else if (err instanceof ForbiddenError) {
    base.title = 'Forbidden';
    base.status = 403;
    base.detail = err.message;
  } else if (err && typeof err === 'object' && (err as any).code && (err as any).clientVersion) {
    // Prisma Known Request Errors mapping
    const perr = err as Prisma.PrismaClientKnownRequestError;
    base.title = 'Database Error';
    base.detail = perr.message;
    switch (perr.code) {
      case 'P2002':
        // Unique constraint violation -> Conflict
        base.title = 'Conflict';
        base.status = 409;
        break;
      case 'P2025':
        // Record not found -> Not Found
        base.title = 'Not Found';
        base.status = 404;
        break;
      case 'P2003':
        // Foreign key violation -> Conflict
        base.title = 'Conflict';
        base.status = 409;
        break;
      default:
        base.status = defaults?.status ?? 500;
        break;
    }
    // Attach minimal error code without leaking PHI
    (base as any).code = perr.code;
  } else if (err instanceof Error) {
    base.detail = err.message || base.detail;
  }

  return base;
}

/* ===== Convenience Guards for Today’s Notes workflow ===== */

/**
 * Ensure a provider is logged in and approved for clinical finalization flows.
 * - Useful before finalize/amend operations.
 */
export function requireApprovedProviderForFinalization(session: any) {
  requirePermission(session, 'progress_note.finalize', { requireApprovedProvider: true });
}

/**
 * Ensure a provider is logged in (draft/update flows).
 */
export function requireProviderForDraftOrUpdate(session: any) {
  if (!session?.user) throw new UnauthorizedError();
  if (
    !hasPermission(session, 'progress_note.create') ||
    !hasPermission(session, 'progress_note.update')
  ) {
    throw new ForbiddenError('Provider permission required for draft/update');
  }
}

/**
 * Ensure the requesting provider is linked to the patient via an approved DoctorPatientConnection.
 * Throws UnauthorizedError if no session, or ForbiddenError if link is missing.
 */
export async function ensureProviderPatientLink(session: any, patientId: string) {
  if (!session?.user) {
    throw new UnauthorizedError('Unauthorized');
  }
  if (!patientId) {
    throw new BadRequestError('Patient ID required');
  }
  // Must be a provider (approved or standard provider role)
  if (!(session.user.isProvider === true || getRoleFromSession(session) === 'PROVIDER')) {
    throw new ForbiddenError('Provider role required');
  }
  const providerId = session.user.id;
  const connection = await prisma.doctorPatientConnection.findFirst({
    where: {
      providerId,
      patientId,
      status: 'approved',
    },
    select: { patientId: true },
  });

  if (!connection) {
    throw new ForbiddenError('No approved provider-patient link');
  }
}