import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

/**
 * Simplified Encounters API
 * - GET: List encounters for a provider
 * - POST: Create a new encounter
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    const where: any = {
      providerId: session.user.id
    };

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    const encounters = await prisma.encounter.findMany({
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
        appointment: {
          select: {
            id: true,
            title: true,
            date: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    return NextResponse.json({ encounters });
  } catch (error) {
    console.error('Error fetching encounters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch encounters' },
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
    const { patientId, appointmentId, type, mode, location } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const encounter = await prisma.encounter.create({
      data: {
        patientId: patientId,
        providerId: session.user.id,
        appointmentId: appointmentId || null,
        type: type || 'consultation',
        mode: mode || 'in_person',
        location: location || null,
        startTime: new Date(),
        status: 'in_progress'
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
        appointment: {
          select: {
            id: true,
            title: true,
            date: true
          }
        }
      }
    });

    return NextResponse.json({ encounter }, { status: 201 });
  } catch (error) {
    console.error('Error creating encounter:', error);
    return NextResponse.json(
      { error: 'Failed to create encounter' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, endTime, location } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Encounter ID is required' },
        { status: 400 }
      );
    }

    // Verify the encounter belongs to this provider
    const existingEncounter = await prisma.encounter.findFirst({
      where: {
        id: id,
        providerId: session.user.id
      }
    });

    if (!existingEncounter) {
      return NextResponse.json(
        { error: 'Encounter not found or access denied' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (endTime) updateData.endTime = new Date(endTime);
    if (location !== undefined) updateData.location = location;

    const encounter = await prisma.encounter.update({
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
        appointment: {
          select: {
            id: true,
            title: true,
            date: true
          }
        }
      }
    });

    return NextResponse.json({ encounter });
  } catch (error) {
    console.error('Error updating encounter:', error);
    return NextResponse.json(
      { error: 'Failed to update encounter' },
      { status: 500 }
    );
  }
}