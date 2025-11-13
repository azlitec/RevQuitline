import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId: appointmentId } = await params;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Verify the appointment belongs to the provider
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        providerId: session.user.id
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found or access denied' }, { status: 404 });
    }

    // Get the intake form data for this appointment
    const intakeForm = await prisma.intakeForm.findFirst({
      where: {
        appointmentId: appointmentId,
      },
    });

    if (!intakeForm) {
      return NextResponse.json({
        intakeForm: null,
        message: 'No intake form found for this appointment'
      });
    }

    return NextResponse.json({
      intakeForm: {
        id: intakeForm.id,
        appointmentId: intakeForm.appointmentId,
        patientId: intakeForm.patientId,
        formData: intakeForm.formData,
        currentStep: intakeForm.currentStep,
        completed: intakeForm.completed,
        completedAt: intakeForm.completedAt,
        createdAt: intakeForm.createdAt,
        updatedAt: intakeForm.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching intake form for provider:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}