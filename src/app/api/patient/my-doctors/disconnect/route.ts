import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a patient (not provider or admin)
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { connectionId, reason } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' }, 
        { status: 400 }
      );
    }

    const patientId = session.user.id;

    // Find the connection and verify ownership
    const connection = await prisma.doctorPatientConnection.findFirst({
      where: {
        id: connectionId,
        patientId: patientId
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Check if disconnection is allowed
    if (!connection.canDisconnect) {
      return NextResponse.json({ 
        error: 'Disconnection not allowed. Please contact support.' 
      }, { status: 403 });
    }

    // Check for outstanding balance
    if (connection.outstandingBalance > 0) {
      return NextResponse.json({ 
        error: `Cannot disconnect with outstanding balance of RM ${connection.outstandingBalance}. Please settle payment first.` 
      }, { status: 403 });
    }

    // Check if connection is already disconnected
    if (connection.status === 'disconnected') {
      return NextResponse.json({ 
        error: 'Connection is already disconnected' 
      }, { status: 409 });
    }

    // Update connection status to request disconnection
    // In a real system, this might require admin/doctor approval
    const updatedConnection = await prisma.doctorPatientConnection.update({
      where: {
        id: connectionId
      },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date(),
        disconnectReason: reason || 'Patient requested disconnection'
      }
    });

    // Create notification for the doctor
    const doctorName = `${connection.provider.firstName || ''} ${connection.provider.lastName || ''}`.trim() || connection.provider.email;
    
    await prisma.notification.create({
      data: {
        userId: connection.providerId,
        type: 'warning',
        title: 'Patient Disconnection',
        message: `Patient has disconnected from ${connection.treatmentType} treatment.`,
        priority: 'medium'
      }
    });

    // Create notification for the patient
    await prisma.notification.create({
      data: {
        userId: patientId,
        type: 'info',
        title: 'Successfully Disconnected',
        message: `You have successfully disconnected from Dr. ${doctorName} for ${connection.treatmentType} treatment.`,
        priority: 'low'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from doctor',
      connection: {
        id: updatedConnection.id,
        status: updatedConnection.status,
        disconnectedAt: updatedConnection.disconnectedAt
      }
    });

  } catch (error) {
    console.error('Doctor disconnect API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}