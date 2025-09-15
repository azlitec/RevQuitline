import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const patientId = searchParams.get('patientId');

    let whereClause: any = {
      providerId: session.user.id
    };

    if (appointmentId) {
      whereClause.appointmentId = appointmentId;
    }

    if (patientId) {
      whereClause.patientId = patientId;
    }

    const medicalNotes = await prisma.healthRecord.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json({ medicalNotes });
  } catch (error) {
    console.error('Error fetching medical notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      appointmentId,
      patientId,
      title,
      chiefComplaint,
      historyOfPresentIllness,
      pastMedicalHistory,
      medications,
      allergies,
      socialHistory,
      familyHistory,
      reviewOfSystems,
      physicalExamination,
      assessment,
      plan,
      followUpInstructions,
      prescriptions
    } = body;

    // Validate required fields
    if (!appointmentId || !patientId || !title) {
      return NextResponse.json(
        { error: 'Appointment ID, Patient ID, and title are required' },
        { status: 400 }
      );
    }

    // Verify the appointment belongs to the provider
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        providerId: session.user.id,
        patientId: patientId
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found or access denied' },
        { status: 404 }
      );
    }

    // Create the medical note using HealthRecord model
    const medicalNote = await prisma.healthRecord.create({
      data: {
        title,
        description: `Medical consultation notes for ${appointment.type}`,
        type: 'progress_note',
        date: new Date(),
        providerId: session.user.id,
        patientId,
        notes: JSON.stringify({
          chiefComplaint,
          historyOfPresentIllness,
          pastMedicalHistory,
          medications,
          allergies,
          socialHistory,
          familyHistory,
          reviewOfSystems,
          physicalExamination,
          assessment,
          plan,
          followUpInstructions,
          prescriptions
        }),
        attachments: [] // Could be used for uploaded files
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Update appointment status to in-progress if it's still scheduled
    if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'in-progress' }
      });
    }

    return NextResponse.json({
      medicalNote: {
        id: medicalNote.id,
        appointmentId,
        patientId,
        title,
        chiefComplaint,
        historyOfPresentIllness,
        pastMedicalHistory,
        medications,
        allergies,
        socialHistory,
        familyHistory,
        reviewOfSystems,
        physicalExamination,
        assessment,
        plan,
        followUpInstructions,
        prescriptions,
        createdAt: medicalNote.createdAt.toISOString(),
        updatedAt: medicalNote.updatedAt.toISOString()
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating medical note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      appointmentId,
      patientId,
      title,
      chiefComplaint,
      historyOfPresentIllness,
      pastMedicalHistory,
      medications,
      allergies,
      socialHistory,
      familyHistory,
      reviewOfSystems,
      physicalExamination,
      assessment,
      plan,
      followUpInstructions,
      prescriptions
    } = body;

    // Validate required fields
    if (!id || !appointmentId || !patientId || !title) {
      return NextResponse.json(
        { error: 'Medical note ID, Appointment ID, Patient ID, and title are required' },
        { status: 400 }
      );
    }

    // Verify the medical note belongs to the provider
    const existingNote = await prisma.healthRecord.findFirst({
      where: {
        id,
        providerId: session.user.id,
        patientId
      }
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Medical note not found or access denied' },
        { status: 404 }
      );
    }

    // Update the medical note
    const updatedNote = await prisma.healthRecord.update({
      where: { id },
      data: {
        title,
        notes: JSON.stringify({
          chiefComplaint,
          historyOfPresentIllness,
          pastMedicalHistory,
          medications,
          allergies,
          socialHistory,
          familyHistory,
          reviewOfSystems,
          physicalExamination,
          assessment,
          plan,
          followUpInstructions,
          prescriptions
        }),
        updatedAt: new Date()
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      medicalNote: {
        id: updatedNote.id,
        appointmentId,
        patientId,
        title,
        chiefComplaint,
        historyOfPresentIllness,
        pastMedicalHistory,
        medications,
        allergies,
        socialHistory,
        familyHistory,
        reviewOfSystems,
        physicalExamination,
        assessment,
        plan,
        followUpInstructions,
        prescriptions,
        createdAt: updatedNote.createdAt.toISOString(),
        updatedAt: updatedNote.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating medical note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}