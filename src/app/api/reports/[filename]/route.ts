import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join, basename, resolve, extname } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = params;

    // Validate and sanitize filename to prevent path traversal
    const FILENAME_SAFE = /^[a-zA-Z0-9._-]+$/;
    if (!FILENAME_SAFE.test(filename)) {
      return NextResponse.json({ message: 'Invalid filename' }, { status: 400 });
    }

    const baseDir = join(process.cwd(), 'uploads', 'reports');
    const safeFilename = basename(filename);
    const filePath = join(baseDir, safeFilename);

    // Ensure resolved path remains within the base directory
    const resolvedBase = resolve(baseDir);
    const resolvedPath = resolve(filePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return NextResponse.json({ message: 'Invalid filename' }, { status: 400 });
    }

    try {
      // Check if report exists in database
      const report = await prisma.report.findFirst({
        where: {
          fileUrl: {
            contains: filename,
          },
        },
      });

      if (!report) {
        return NextResponse.json({ message: 'Report not found' }, { status: 404 });
      }

      // Read the file
      const fileBuffer = await readFile(filePath);

      // Determine content type from file extension
      const ext = extname(safeFilename).toLowerCase();
      const contentType =
        ext === '.pdf' ? 'application/pdf' :
        ext === '.csv' ? 'text/csv' :
        ext === '.txt' ? 'text/plain' :
        'application/octet-stream';

      return new NextResponse(fileBuffer as any, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${safeFilename}"`,
        },
      });

    } catch (fileError) {
      console.error('File read error:', fileError);
      return NextResponse.json({ message: 'File not found or inaccessible' }, { status: 404 });
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { message: 'An error occurred while downloading the file' },
      { status: 500 }
    );
  }
}