import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bayarCashService } from '@/lib/payment/bayarcash';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify callback signature
    const isValid = bayarCashService.verifyCallback(body);
    if (!isValid) {
      console.error('Invalid payment callback signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const { order_id, transaction_id, status, amount } = body;

    // Find invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: order_id },
      include: {
        appointment: true,
      }
    });

    if (!invoice) {
      console.error('Invoice not found:', order_id);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Update invoice status based on payment status
    let invoiceStatus = 'pending';
    let appointmentStatus = invoice.appointment.status;

    switch (status.toLowerCase()) {
      case 'success':
      case 'paid':
        invoiceStatus = 'paid';
        appointmentStatus = 'confirmed'; // Confirm appointment after payment
        break;
      case 'failed':
      case 'cancelled':
        invoiceStatus = 'failed';
        break;
      default:
        invoiceStatus = 'pending';
    }

    // Update invoice
    await prisma.invoice.update({
      where: { id: order_id },
      data: {
        status: invoiceStatus,
        transactionId: transaction_id,
        paidAt: invoiceStatus === 'paid' ? new Date() : null,
        updatedAt: new Date(),
      }
    });

    // Update appointment status if payment successful
    if (invoiceStatus === 'paid') {
      await prisma.appointment.update({
        where: { id: invoice.appointmentId },
        data: {
          status: appointmentStatus,
          updatedAt: new Date(),
        }
      });

      // Create notification for successful payment
      try {
        const { NotificationService } = await import('@/lib/notifications/notificationService');
        await NotificationService.createNotification(
          invoice.patientId,
          'payment',
          'Payment Successful',
          `Your payment of RM ${(amount / 100).toFixed(2)} has been processed successfully. Your appointment is now confirmed.`,
          'high'
        );
      } catch (notificationError) {
        console.error('Failed to create payment notification:', notificationError);
      }
    }

    console.log(`Payment callback processed: ${order_id} - ${status}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}