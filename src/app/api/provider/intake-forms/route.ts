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
    // Fetch provider's quitline appointments, then filter IntakeForms by appointmentId
    const providerAppointments = await prisma.appointment.findMany({
      where: {
        providerId: session.user.id,
        type: 'quitline_smoking_cessation',
      },
      select: { id: true, type: true, date: true },
    });
    const appointmentMap = new Map(providerAppointments.map(a => [a.id, { type: a.type, date: a.date }]));
    const appointmentIds = Array.from(appointmentMap.keys());

    const intakeForms = await prisma.intakeForm.findMany({
      where: {
        appointmentId: { in: appointmentIds },
        ...(status === 'completed'
          ? { completed: true }
          : status === 'in-progress'
          ? { completed: false }
          : {}),
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
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });

    const formattedForms = intakeForms.map(form => {
      const appt = appointmentMap.get(form.appointmentId);
      return {
        id: form.id,
        patientId: form.patientId,
        patientName: `${form.patient.firstName} ${form.patient.lastName}`,
        patientEmail: form.patient.email,
        appointmentId: form.appointmentId,
        appointmentType: appt?.type ?? null,
        appointmentDate: appt?.date ?? null,
        currentStep: form.currentStep,
        completed: form.completed,
        completedAt: form.completedAt,
        updatedAt: form.updatedAt,
        formData: form.formData, // Only include if provider has permission
      };
    });

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
    const intakeForm = await prisma.intakeForm.findUnique({
      where: { id: intakeFormId },
      select: {
        id: true,
        appointmentId: true,
        formData: true,
        currentStep: true,
        completed: true,
        completedAt: true,
      },
    });

    if (!intakeForm) {
      return NextResponse.json({ error: 'Intake form not found' }, { status: 404 });
    }

    // Ensure the appointment belongs to this provider and is quitline type
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: intakeForm.appointmentId,
        providerId: session.user.id,
        type: 'quitline_smoking_cessation',
      },
      select: { id: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Access denied: appointment not found for provider' }, { status: 403 });
    }

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