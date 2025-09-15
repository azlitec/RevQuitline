import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/index';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isProvider === false) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
    }

    // Check if the appointment belongs to the current user
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: session.user.id,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Get the intake form data
    const intakeForm = await prisma.intakeForm.findFirst({
      where: {
        appointmentId: appointmentId,
      },
    });

    if (!intakeForm) {
      return NextResponse.json({ formData: null, currentStep: 1 });
    }

    return NextResponse.json({
      formData: intakeForm.formData,
      currentStep: intakeForm.currentStep,
      completed: intakeForm.completed,
      completedAt: intakeForm.completedAt,
    });

  } catch (error) {
    console.error('Error fetching intake form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isProvider === false) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, formData, currentStep, completed } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
    }

    // Check if the appointment belongs to the current user and is a quitline session
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: session.user.id,
        type: 'quitline_smoking_cessation', // Only allow intake forms for quitline sessions
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found or not eligible for intake form' }, { status: 404 });
    }

    // Check if intake form already exists
    const existingForm = await prisma.intakeForm.findFirst({
      where: {
        appointmentId: appointmentId,
      },
    });

    // Use the completed field from request body, or calculate it if not provided
    const isCompleted = completed !== undefined ? completed : (currentStep >= 5 && formData);

    console.log('API Debug - Received data:', { appointmentId, currentStep, isCompleted });
    console.log('API Debug - Form data keys:', Object.keys(formData || {}));

    if (existingForm) {
      // Update existing form
      const updatedForm = await prisma.intakeForm.update({
        where: {
          id: existingForm.id,
        },
        data: {
          formData: formData,
          currentStep: currentStep,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        form: updatedForm,
        message: isCompleted ? 'Intake form completed successfully!' : 'Progress saved successfully!',
      });
    } else {
      // Create new form
      const newForm = await prisma.intakeForm.create({
        data: {
          appointmentId: appointmentId,
          patientId: session.user.id,
          formData: formData,
          currentStep: currentStep,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });

      console.log('API Debug - Created new form:', newForm.id);

      return NextResponse.json({
        success: true,
        form: newForm,
        message: isCompleted ? 'Intake form completed successfully!' : 'Progress saved successfully!',
      });
    }

  } catch (error) {
    console.error('Error saving intake form:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}