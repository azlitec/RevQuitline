import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

/**
 * Simplified Provider EMR Notes API
 * - GET: List progress notes for a specific patient
 * - POST: Create a new progress note for a patient
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const notes = await prisma.progressNote.findMany({
      where: {
        patientId: patientId,
        authorId: session.user.id
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        encounter: {
          select: {
            id: true,
            type: true,
            startTime: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching patient notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient notes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { subjective, objective, assessment, plan, summary, appointmentId } = body;

    // Create a basic encounter automatically
    const basicEncounter = await prisma.encounter.create({
      data: {
        patientId: patientId,
        providerId: session.user.id,
        appointmentId: appointmentId || null,
        type: 'consultation',
        mode: 'in_person',
        startTime: new Date(),
        status: 'in_progress'
      }
    });

    // Create the progress note
    const progressNote = await prisma.progressNote.create({
      data: {
        encounterId: basicEncounter.id,
        patientId: patientId,
        authorId: session.user.id,
        status: 'draft',
        subjective: subjective || null,
        objective: objective || null,
        assessment: assessment || null,
        plan: plan || null,
        summary: summary || null
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        encounter: {
          select: {
            id: true,
            type: true,
            startTime: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({ progressNote }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient note:', error);
    return NextResponse.json(
      { error: 'Failed to create patient note' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, subjective, objective, assessment, plan, summary, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Progress note ID is required' }, { status: 400 });
    }

    // Verify the note belongs to this provider and patient
    const existingNote = await prisma.progressNote.findFirst({
      where: {
        id: id,
        patientId: patientId,
        authorId: session.user.id
      }
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Progress note not found or access denied' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (subjective !== undefined) updateData.subjective = subjective;
    if (objective !== undefined) updateData.objective = objective;
    if (assessment !== undefined) updateData.assessment = assessment;
    if (plan !== undefined) updateData.plan = plan;
    if (summary !== undefined) updateData.summary = summary;
    if (status !== undefined) updateData.status = status;

    const progressNote = await prisma.progressNote.update({
      where: { id: id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        encounter: {
          select: {
            id: true,
            type: true,
            startTime: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({ progressNote });
  } catch (error) {
    console.error('Error updating patient note:', error);
    return NextResponse.json(
      { error: 'Failed to update patient note' },
      { status: 500 }
    );
  }
}