import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * User roles for authorization
 */
export type UserRole = 'PATIENT' | 'PROVIDER' | 'ADMIN';

/**
 * Convert error to RFC7807 Problem+JSON format
 */
export function toProblemJson(
  err: unknown,
  defaults?: { title?: string; status?: number }
): Record<string, any> {
  const problem: Record<string, any> = {
    type: 'about:blank',
    title: defaults?.title || 'An error occurred',
    status: defaults?.status || 500,
  };

  if (err instanceof Error) {
    problem.detail = err.message;
    if ('status' in err && typeof err.status === 'number') {
      problem.status = err.status;
    }
  } else if (typeof err === 'string') {
    problem.detail = err;
  } else if (err && typeof err === 'object') {
    const errObj = err as any;
    if (errObj.message) problem.detail = errObj.message;
    if (errObj.status && typeof errObj.status === 'number') {
      problem.status = errObj.status;
    }
    if (errObj.issues) problem.issues = errObj.issues;
  }

  return problem;
}

/**
 * Parse JSON body with error handling
 */
export async function parseJson(req: NextRequest): Promise<any> {
  try {
    return await req.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Require user to have specific permission/role
 */
export async function requirePermission(
  req: NextRequest,
  requiredRole?: UserRole
): Promise<{ userId: string; role: UserRole; email: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    const error = new Error('Authentication required') as any;
    error.status = 401;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true }
  });

  if (!user) {
    const error = new Error('User not found') as any;
    error.status = 404;
    throw error;
  }

  if (requiredRole && user.role !== requiredRole) {
    const error = new Error('Insufficient permissions') as any;
    error.status = 403;
    throw error;
  }

  return {
    userId: user.id,
    role: user.role as UserRole,
    email: user.email
  };
}

/**
 * Ensure provider has access to specific patient
 */
export async function ensureProviderPatientLink(
  providerId: string,
  patientId: string
): Promise<void> {
  const connection = await prisma.doctorPatientConnection.findFirst({
    where: {
      doctorId: providerId,
      patientId: patientId,
      status: 'ACTIVE'
    }
  });

  if (!connection) {
    const error = new Error('Provider does not have access to this patient') as any;
    error.status = 403;
    throw error;
  }
}

/**
 * Require provider role for draft or update operations
 */
export async function requireProviderForDraftOrUpdate(
  req: NextRequest
): Promise<{ userId: string; role: UserRole; email: string }> {
  return requirePermission(req, 'PROVIDER');
}

/**
 * Attachment metadata schema
 */
export const AttachmentMetaSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().positive(),
  url: z.string().url().optional(),
  uploadId: z.string().optional()
});

/**
 * Progress note schemas
 */
export const ProgressNoteDraftCreateSchema = z.object({
  appointmentId: z.string().uuid(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  attachments: z.array(AttachmentMetaSchema).optional()
});

export const ProgressNoteUpdateSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  attachments: z.array(AttachmentMetaSchema).optional()
});

export const ProgressNoteFinalizeSchema = z.object({
  finalizeNote: z.literal(true),
  signature: z.string().min(1).optional()
});