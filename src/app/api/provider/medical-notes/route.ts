import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { auditRead, auditCreate, auditUpdate, buildProvenanceMetadata } from '@/lib/audit/audit';
import { requirePermission, requireProviderForDraftOrUpdate, parseJson, toProblemJson } from '@/lib/api/guard';
import { z } from 'zod';

// Zod schemas for legacy HealthRecord progress note payloads
const LegacyHealthRecordNoteSchema = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  title: z.string().min(1),

  chiefComplaint: z.string().optional(),
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  socialHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  reviewOfSystems: z.string().optional(),
  physicalExamination: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  followUpInstructions: z.string().optional(),
  prescriptions: z.string().optional(),
});

const LegacyHealthRecordNoteUpdateSchema = LegacyHealthRecordNoteSchema.extend({
  id: z.string().min(1),
});
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      requirePermission(session, 'progress_note.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
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

    const provenance = buildProvenanceMetadata(session, { appointmentId, patientId });
    await Promise.all(
      medicalNotes.map((n: any) =>
        auditRead(request, session, 'progress_note', n.id, provenance)
      )
    );
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

    try {
      requireProviderForDraftOrUpdate(session);
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const body = await parseJson(request as any, LegacyHealthRecordNoteSchema);
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

    await auditCreate(
      request,
      session,
      'progress_note',
      medicalNote.id,
      buildProvenanceMetadata(session, { appointmentId, patientId })
    );
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

    try {
      requireProviderForDraftOrUpdate(session);
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const body = await parseJson(request as any, LegacyHealthRecordNoteUpdateSchema);
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

    await auditUpdate(
      request,
      session,
      'progress_note',
      updatedNote.id,
      buildProvenanceMetadata(session, { appointmentId, patientId })
    );
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