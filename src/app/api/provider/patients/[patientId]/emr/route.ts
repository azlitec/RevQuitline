import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

/**
 * Simplified Provider EMR Summary API
 * - GET: Get EMR summary for a specific patient
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

    // Get patient basic info
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        medicalHistory: true,
        currentMedications: true,
        allergies: true,
        smokingStatus: true
      }
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get recent encounters
    const encounters = await prisma.encounter.findMany({
      where: {
        patientId: patientId,
        providerId: session.user.id
      },
      include: {
        progressNotes: {
          select: {
            id: true,
            status: true,
            summary: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 5
    });

    // Get recent progress notes
    const progressNotes = await prisma.progressNote.findMany({
      where: {
        patientId: patientId,
        authorId: session.user.id
      },
      select: {
        id: true,
        status: true,
        summary: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        createdAt: true,
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
      },
      take: 10
    });

    // Get recent prescriptions
    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId: patientId,
        providerId: session.user.id
      },
      select: {
        id: true,
        medicationName: true,
        dosage: true,
        frequency: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        patientId: patientId,
        providerId: session.user.id,
        date: {
          gte: new Date()
        },
        status: 'scheduled'
      },
      select: {
        id: true,
        title: true,
        date: true,
        duration: true,
        type: true,
        status: true
      },
      orderBy: {
        date: 'asc'
      },
      take: 5
    });

    const summary = {
      patient,
      encounters,
      progressNotes,
      prescriptions,
      upcomingAppointments,
      counters: {
        totalEncounters: encounters.length,
        draftNotes: progressNotes.filter(note => note.status === 'draft').length,
        finalizedNotes: progressNotes.filter(note => note.status === 'finalized').length,
        activePrescriptions: prescriptions.filter(rx => rx.status === 'active').length,
        upcomingAppointments: upcomingAppointments.length
      }
    };

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error fetching EMR summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch EMR summary' },
      { status: 500 }
    );
  }
}