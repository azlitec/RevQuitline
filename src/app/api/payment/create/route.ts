import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { bayarCashService } from '@/lib/payment/bayarcash';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        provider: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check if user owns this appointment
    if (appointment.patientId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if appointment has a price
    if (!appointment.price || appointment.price <= 0) {
      return NextResponse.json({ error: 'No payment required for this appointment' }, { status: 400 });
    }

    // Check if payment already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: { appointmentId: appointmentId }
    });

    if (existingInvoice && existingInvoice.status === 'paid') {
      return NextResponse.json({ error: 'Payment already completed' }, { status: 400 });
    }

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${appointmentId.slice(-6)}`;

    // Create or update invoice
    const invoice = await prisma.invoice.upsert({
      where: { appointmentId: appointmentId },
      update: {
        status: 'pending',
        updatedAt: new Date(),
      },
      create: {
        appointmentId: appointmentId,
        patientId: session.user.id,
        invoiceNumber: invoiceNumber,
        amount: appointment.price,
        currency: 'MYR',
        status: 'pending',
        description: `Payment for ${appointment.serviceName || appointment.type} with Dr. ${appointment.provider.firstName} ${appointment.provider.lastName}`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      }
    });

    // Create payment with BayarCash
    const paymentRequest = {
      orderId: invoice.id,
      amount: Math.round(appointment.price * 100), // Convert to cents
      currency: 'MYR',
      description: invoice.description,
      customerName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      customerEmail: appointment.patient.email,
      customerPhone: appointment.patient.phone || undefined,
    };

    let paymentResponse;
    try {
      paymentResponse = await bayarCashService.createPayment(paymentRequest);
    } catch (configError) {
      console.error('BayarCash configuration error:', configError);
      return NextResponse.json({
        error: 'Payment gateway configuration error. Please contact support.',
        details: process.env.NODE_ENV === 'development' ? configError.message : undefined
      }, { status: 500 });
    }

    if (paymentResponse.success) {
      // Update invoice with transaction ID
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          transactionId: paymentResponse.transactionId,
          paymentUrl: paymentResponse.paymentUrl,
        }
      });

      return NextResponse.json({
        success: true,
        paymentUrl: paymentResponse.paymentUrl,
        invoiceId: invoice.id,
        amount: appointment.price,
        currency: 'MYR',
      });
    } else {
      return NextResponse.json({
        error: paymentResponse.error || 'Failed to create payment'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}