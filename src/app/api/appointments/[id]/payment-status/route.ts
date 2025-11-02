import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;

    // Get appointment to verify ownership
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        price: true,
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check if user has access to this appointment
    const hasAccess = appointment.patientId === session.user.id || 
                     (session.user.isProvider && appointment.providerId === session.user.id) ||
                     session.user.isAdmin;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If appointment has no price, no payment required
    if (!appointment.price || appointment.price <= 0) {
      return NextResponse.json({
        status: 'not_required',
        message: 'No payment required for this appointment'
      });
    }

    // Check for invoice/payment
    const invoice = await prisma.invoice.findFirst({
      where: { appointmentId: appointmentId },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        paidAt: true,
        transactionId: true,
      }
    });

    if (!invoice) {
      return NextResponse.json({
        status: 'pending',
        message: 'Payment not initiated',
        amount: appointment.price,
        currency: 'MYR'
      });
    }

    return NextResponse.json({
      status: invoice.status,
      message: getStatusMessage(invoice.status),
      amount: invoice.amount,
      currency: invoice.currency,
      paidAt: invoice.paidAt,
      transactionId: invoice.transactionId,
      invoiceId: invoice.id,
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'paid':
      return 'Payment completed successfully';
    case 'pending':
      return 'Payment pending';
    case 'failed':
      return 'Payment failed';
    case 'cancelled':
      return 'Payment cancelled';
    default:
      return 'Payment status unknown';
  }
}