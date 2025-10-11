import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = params;
    const filePath = join(process.cwd(), 'uploads', 'reports', filename);

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
      
      // Determine content type
      const contentType = 'application/pdf';
      
      return new NextResponse(fileBuffer as any, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
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