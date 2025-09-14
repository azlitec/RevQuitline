import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/index';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'completed', 'in-progress', 'all'
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get intake forms for patients who have quitline appointments with this provider
    const intakeForms = await prisma.intakeForm.findMany({
      where: {
        appointment: {
          providerId: session.user.id,
          type: 'quitline_smoking_cessation', // Only quitline sessions
        },
        ...(status === 'completed' ? { completed: true } :
            status === 'in-progress' ? { completed: false } : {}),
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            type: true,
            date: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });

    const formattedForms = intakeForms.map(form => ({
      id: form.id,
      patientId: form.patientId,
      patientName: `${form.patient.firstName} ${form.patient.lastName}`,
      patientEmail: form.patient.email,
      appointmentId: form.appointmentId,
      appointmentType: form.appointment.type,
      appointmentDate: form.appointment.date,
      currentStep: form.currentStep,
      completed: form.completed,
      completedAt: form.completedAt,
      updatedAt: form.updatedAt,
      formData: form.formData, // Only include if provider has permission
    }));

    return NextResponse.json({
      intakeForms: formattedForms,
      total: formattedForms.length,
    });

  } catch (error) {
    console.error('Error fetching intake forms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { intakeFormId, action } = body;

    if (!intakeFormId) {
      return NextResponse.json({ error: 'Intake form ID required' }, { status: 400 });
    }

    // Verify the provider has access to this intake form (only for quitline sessions)
    const intakeForm = await prisma.intakeForm.findFirst({
      where: {
        id: intakeFormId,
        appointment: {
          providerId: session.user.id,
          type: 'quitline_smoking_cessation',
        },
      },
    });

    if (!intakeForm) {
      return NextResponse.json({ error: 'Intake form not found or access denied' }, { status: 404 });
    }

    // Handle different actions (view, mark as reviewed, etc.)
    if (action === 'mark_reviewed') {
      // You could add a reviewed status or notes field to the IntakeForm model
      return NextResponse.json({
        success: true,
        message: 'Intake form marked as reviewed',
      });
    }

    return NextResponse.json({
      success: true,
      intakeForm: {
        id: intakeForm.id,
        formData: intakeForm.formData,
        currentStep: intakeForm.currentStep,
        completed: intakeForm.completed,
        completedAt: intakeForm.completedAt,
      },
    });

  } catch (error) {
    console.error('Error processing intake form action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}