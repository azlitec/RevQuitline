import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status values
    const validStatuses = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Check if user has permission to update appointment
    // Providers can only update their own appointments
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        provider: true,
        patient: true
      }
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (session.user.isProvider && existingAppointment.providerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update the appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: newStatus,
        updatedAt: new Date()
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            specialty: true
          }
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Auto-generate invoice for completed quitline sessions
    if (newStatus === 'completed' && existingAppointment.type === 'quitline_smoking_cessation' && existingAppointment.price) {
      // Check if invoice already exists
      const existingInvoice = await prisma.invoice.findUnique({
        where: { appointmentId: appointmentId }
      });

      if (!existingInvoice) {
        // Generate invoice number
        const invoiceCount = await prisma.invoice.count();
        const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

        // Create invoice due in 30 days
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        await prisma.invoice.create({
          data: {
            invoiceNumber,
            patientId: existingAppointment.patientId,
            providerId: existingAppointment.providerId,
            appointmentId: appointmentId,
            description: `Quitline Free-Smoking Session (INRT) - ${existingAppointment.serviceName || 'Smoking Cessation Consultation'}`,
            amount: existingAppointment.price,
            dueDate
          }
        });
      }
    }

    return NextResponse.json(updatedAppointment);

  } catch (error) {
    console.error('Update appointment status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}