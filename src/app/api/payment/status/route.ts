import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Get invoice details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        appointment: {
          include: {
            provider: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if user owns this invoice
    if (invoice.patientId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      id: invoice.id,
      status: invoice.status,
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      transactionId: invoice.transactionId,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      appointment: {
        id: invoice.appointment.id,
        title: invoice.appointment.title,
        date: invoice.appointment.date,
        provider: invoice.appointment.provider,
      }
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}