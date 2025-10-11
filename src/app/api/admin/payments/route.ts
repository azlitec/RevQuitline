import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[Payments API] Session:', session?.user?.email, 'isAdmin:', session?.user?.isAdmin);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden - Admin only' }, { status: 403 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    console.log('[Payments API] Query params:', { search, status, page, pageSize });

    // Build where clause
    const where: any = {};

    // Search filter - FIXED: use firstName/lastName instead of name
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { 
          patient: { 
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
          } 
        },
      ];
    }

    // Status filter
    if (status !== 'all') {
      where.status = status;
    }

    console.log('[Payments API] Where clause:', JSON.stringify(where, null, 2));

    // Get total count
    const totalCount = await prisma.invoice.count({ where });
    console.log('[Payments API] Total count:', totalCount);

    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch invoices with relations
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    console.log('[Payments API] Invoices found:', invoices.length);

    // Calculate stats
    const allInvoices = await prisma.invoice.findMany({
      select: {
        amount: true,
        status: true,
      },
    });

    const stats = {
      totalRevenue: allInvoices
        .filter(inv => inv.status === 'completed')
        .reduce((sum, inv) => sum + inv.amount, 0),
      completedPayments: allInvoices.filter(inv => inv.status === 'completed').length,
      pendingPayments: allInvoices.filter(inv => inv.status === 'pending').length,
      failedPayments: allInvoices.filter(inv => inv.status === 'failed').length,
    };

    // Format response
    const formattedPayments = invoices.map(invoice => ({
      id: invoice.id,
      patientId: invoice.patientId,
      patientName: `${invoice.patient.firstName || ''} ${invoice.patient.lastName || ''}`.trim() || invoice.patient.email,
      patientEmail: invoice.patient.email,
      providerId: invoice.providerId,
      providerName: invoice.provider 
        ? `Dr. ${invoice.provider.firstName || ''} ${invoice.provider.lastName || ''}`.trim()
        : null,
      amount: invoice.amount,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod || 'Not specified',
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      payments: formattedPayments,
      stats,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('[Payments API] Error:', error);
    return NextResponse.json(
      { 
        message: 'An error occurred while fetching payments',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
