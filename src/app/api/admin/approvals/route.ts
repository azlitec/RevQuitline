import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Auth: admin only
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    // Build filters:
    // - Pending provider approval via either providerApprovalStatus='pending'
    //   or staged role in ['PROVIDER_PENDING','PROVIDER_REVIEWING']
    // - Not yet approved as provider
    const stagedRoleValues = ['PROVIDER_PENDING', 'PROVIDER_REVIEWING'];

    const baseApprovalFilter = {
      OR: [
        // Explicit pending status
        { providerApprovalStatus: 'pending' },
        // Staged provider workflow roles
        { role: { in: stagedRoleValues } },
        // Application-like condition: not yet set as pending, but has license number
        { AND: [{ providerApprovalStatus: null }, { licenseNumber: { not: null } }] },
      ],
    };

    const searchFilter = search
      ? {
          OR: [
            { id: { contains: search } },
            { email: { contains: search } },
            { firstName: { contains: search } },
            { lastName: { contains: search } },
          ],
        }
      : undefined;

    const where: any = {
      AND: [
        // Must match one of the approval indicators
        baseApprovalFilter,
        // Optional search
        ...(searchFilter ? [searchFilter] : []),
      ],
    };

    const totalCount = await prisma.user.count({ where });
    console.log('[Approvals] where', JSON.stringify(where));
    console.log('[Approvals] totalCount', totalCount);
    const totalPages = Math.ceil(totalCount / pageSize);

    const applicants = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        image: true,
        role: true,
        isProvider: true,
        providerApprovalStatus: true,
        licenseNumber: true,
        specialty: true,
        yearsOfExperience: true,
        availability: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      applicants,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching provider approvals:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching provider approvals' },
      { status: 500 }
    );
  }
}