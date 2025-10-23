import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { requirePermission, toProblemJson } from '@/lib/api/guard';
import { jsonEntity } from '@/lib/api/response';
import { errorResponse } from '@/lib/api/response';
import { promises as fs } from 'fs';
import path from 'path';
import { validateFileUpload, generateSafeFilename, extFromMime } from '@/lib/security/fileValidation';

export const runtime = 'nodejs';

/**
 * Secure file upload handler
 * - Validates MIME/type/size using centralized validators
 * - Verifies magic bytes and scans for malicious patterns
 * - Generates random server-side filename (never trust client name)
 * - Stores outside webroot (uploads/ not public/)
 * - Logs all attempts with minimal, non-sensitive metadata
 *
 * Allowed types: application/pdf, image/jpeg, image/png
 * Max size: 10MB
 */
export async function POST(request: NextRequest) {
  let session: any | null = null;

  try {
    session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    // Ensure uploader has permission (correspondence.create aligned with inbound document ingestion)
    try {
      requirePermission(session, 'correspondence.create');
    } catch (err: any) {
      const status = err?.status ?? 403;
      return errorResponse('Permission error', status);
    }

    const form = await request.formData();
    const entries = form.getAll('file');

    if (!entries || entries.length === 0) {
      return errorResponse('No file uploaded (field name "file" required)', 400);
    }

    const results: Array<{
      id: string;
      originalName: string;
      filename: string;
      mimeType: string;
      size: number;
      // Store path relative to storage root; not directly web-accessible
      storagePath: string;
    }> = [];

    const uploadRoot = path.join(process.cwd(), 'uploads'); // outside webroot
    await fs.mkdir(uploadRoot, { recursive: true });

    for (const entry of entries) {
      if (!(entry instanceof File)) {
        return errorResponse('Invalid form entry for "file"', 400);
      }
      const file = entry as File;

      // Client-provided metadata (do not trust for security decisions)
      const clientName = (file as any).name || 'upload';
      const declaredMime = (file.type || 'application/octet-stream').toLowerCase();
      const size = file.size;

      // Validate file using centralized utilities
      const validation = await validateFileUpload(file);
      // Log attempt (minimal metadata, no PHI)
      console.info('[Upload Attempt]', {
        userId: session.user.id,
        declaredMime,
        size,
        safe: validation.safe,
        reason: validation.reason ?? undefined,
        detectedMime: validation.detectedMime ?? undefined,
      });

      if (!validation.safe) {
        return errorResponse('File validation failed', 400, {
          reason: validation.reason,
        });
      }

      // Derive safe extension from detected/declared type
      const ext = validation.recommendedExt ?? extFromMime(validation.detectedMime ?? declaredMime) ?? 'bin';
      const safeServerFilename = generateSafeFilename(ext);

      const fsPath = path.join(uploadRoot, safeServerFilename);
      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      // Write to storage
      await fs.writeFile(fsPath, buffer);

      results.push({
        id: safeServerFilename.split('.')[0],
        originalName: clientName,
        filename: safeServerFilename,
        mimeType: validation.detectedMime ?? declaredMime,
        size,
        storagePath: `uploads/${safeServerFilename}`,
      });
    }

    // Return uniform entity envelope with privacy headers and requestId
    return jsonEntity(request, { files: results }, 201);
  } catch (err: any) {
    // Avoid leaking details; shape error via Problem+JSON for diagnostics (without PHI)
    console.error('[Uploads POST] Error', { message: err?.message, code: err?.code });
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(toProblemJson(err, { title: 'Upload failed', status }), { status });
  }
}