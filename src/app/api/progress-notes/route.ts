import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

/**
 * Simplified Progress Notes API
 * - GET: List progress notes for a provider
 * - POST: Create a new progress note
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    const where: any = {
      authorId: session.user.id
    };

    if (patientId) {
      where.patientId = patientId;
    }

    const notes = await prisma.progressNote.findMany({
      where,
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
            startTime: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching progress notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, subjective, objective, assessment, plan, summary } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Create a basic encounter automatically
    const basicEncounter = await prisma.encounter.create({
      data: {
        patientId: patientId,
        providerId: session.user.id,
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
            startTime: true
          }
        }
      }
    });

    return NextResponse.json({ progressNote }, { status: 201 });
  } catch (error) {
    console.error('Error creating progress note:', error);
    return NextResponse.json(
      { error: 'Failed to create progress note' },
      { status: 500 }
    );
  }
}