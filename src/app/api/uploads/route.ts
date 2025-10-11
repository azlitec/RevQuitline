import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { requirePermission, toProblemJson } from '@/lib/api/guard';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const MAX_BYTES = 1_000_000; // 1MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
]);

const ALLOWED_EXT = new Set([
  'pdf',
  'docx',
  'png',
  'jpg',
  'jpeg',
  'gif',
]);

function inferExtFromMime(mime: string): string | null {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    default:
      return null;
  }
}

function extFromFilename(name: string): string | null {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return null;
  const ext = name.slice(idx + 1).toLowerCase();
  return ext || null;
}

function isAllowed(mime: string, filename: string): boolean {
  const byMime = ALLOWED_MIME.has(mime);
  const byExt = (() => {
    const ext = extFromFilename(filename);
    return ext ? ALLOWED_EXT.has(ext) : false;
  })();
  return byMime || byExt;
}

function decideExt(mime: string, filename: string): string {
  const fromMime = inferExtFromMime(mime);
  if (fromMime) return fromMime;
  const fromName = extFromFilename(filename);
  if (fromName && ALLOWED_EXT.has(fromName)) return fromName;
  // Fallback to 'bin' though code path should be unreachable due to validation
  return 'bin';
}

export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure uploader can create correspondence (aligns with inbound document ingestion use case)
    try {
      requirePermission(session, 'correspondence.create');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const form = await request.formData();
    const entries = form.getAll('file');

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'No file uploaded (field name "file" required)' }, { status: 400 });
    }

    const results: Array<{
      id: string;
      originalName: string;
      filename: string;
      mimeType: string;
      size: number;
      path: string;
    }> = [];

    for (const entry of entries) {
      if (!(entry instanceof File)) {
        return NextResponse.json({ error: 'Invalid form entry for "file"' }, { status: 400 });
      }
      const file = entry as File;
      const name = (file as any).name || 'upload';
      const size = file.size;
      const mime = file.type || 'application/octet-stream';

      if (size > MAX_BYTES) {
        return NextResponse.json({ error: 'File too large. Maximum allowed size is 1MB' }, { status: 413 });
      }
      if (!isAllowed(mime, name)) {
        return NextResponse.json({ error: 'Unsupported file type. Allowed: pdf, docx, png, jpg, jpeg, gif' }, { status: 415 });
      }

      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      const ext = decideExt(mime, name);
      const id = randomUUID();
      const filename = `${id}.${ext}`;

      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });

      const fsPath = path.join(uploadDir, filename);
      await fs.writeFile(fsPath, buffer);

      results.push({
        id,
        originalName: name,
        filename,
        mimeType: mime,
        size,
        path: `/uploads/${filename}`,
      });
    }

    // Return list for flexibility (supports multiple files). Client can attach to correspondence.create
    return NextResponse.json({ files: results }, { status: 201 });
  } catch (err: any) {
    console.error('[Uploads POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Upload failed', status }),
      { status }
    );
  }
}