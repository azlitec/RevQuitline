import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface Report {
  id: string;
  title: string;
  type: 'appointments' | 'users' | 'revenue' | 'engagement';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  generatedAt: string;
  fileUrl?: string;
  status: 'generating' | 'completed' | 'failed';
}

function getDateRange(period: string, date: Date = new Date()) {
  const now = new Date(date);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (period) {
    case 'daily':
      return { startDate: startOfDay, endDate: endOfDay };
    case 'weekly':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { startDate: startOfWeek, endDate: endOfWeek };
    case 'monthly':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: startOfMonth, endDate: endOfMonth };
    case 'yearly':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { startDate: startOfYear, endDate: endOfYear };
    default:
      return { startDate: startOfDay, endDate: endOfDay };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[Reports API] Session:', session?.user?.email, 'isAdmin:', session?.user?.isAdmin);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden - Admin only' }, { status: 403 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    console.log('[Reports API] Query params:', { search, type, page, pageSize });

    // Get reports from database
    const reports = await prisma.report.findMany({
      where: {
        ...(type !== 'all' && { type }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { type: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { generatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalCount = await prisma.report.count({
      where: {
        ...(type !== 'all' && { type }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { type: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    console.log('[Reports API] Returning', reports.length, 'reports');

    return NextResponse.json({
      reports,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('[Reports API] Error:', error);
    return NextResponse.json(
      {
        message: 'An error occurred while fetching reports',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
