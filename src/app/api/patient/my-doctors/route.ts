import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a patient (not provider or admin)
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const patientId = session.user.id;

    // Get all connections for this patient
    const connections = await prisma.doctorPatientConnection.findMany({
      where: {
        patientId: patientId
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
            yearsOfExperience: true,
            phone: true,
            licenseNumber: true,
            bio: true,
            _count: {
              select: {
                appointmentsAsProvider: {
                  where: {
                    patientId: patientId,
                    status: 'completed'
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Show approved first, then pending
        { createdAt: 'desc' }
      ]
    });

    // Get appointment information for each connection
    const connectionsWithDetails = await Promise.all(
      connections.map(async (connection) => {
        const firstName = connection.provider.firstName || '';
        const lastName = connection.provider.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || connection.provider.email;

        // Get last and next appointments
        const lastAppointment = await prisma.appointment.findFirst({
          where: {
            providerId: connection.providerId,
            patientId: patientId,
            status: 'completed'
          },
          orderBy: { date: 'desc' }
        });

        const nextAppointment = await prisma.appointment.findFirst({
          where: {
            providerId: connection.providerId,
            patientId: patientId,
            status: { in: ['scheduled', 'confirmed'] },
            date: { gte: new Date() }
          },
          orderBy: { date: 'asc' }
        });

        // Mock rating data (in real app, this would come from a reviews table)
        const seedValue = connection.provider.id.length;
        const rating = 3.5 + (seedValue % 15) / 10; // Rating between 3.5 and 5.0
        const reviewsCount = 10 + (seedValue % 200); // Reviews between 10-210

        return {
          id: connection.id,
          doctor: {
            id: connection.provider.id,
            name: fullName,
            email: connection.provider.email,
            specialty: connection.provider.specialty || 'General Medicine',
            yearsOfExperience: connection.provider.yearsOfExperience || 1,
            phone: connection.provider.phone,
            rating: Math.round(rating * 10) / 10,
            reviewsCount
          },
          treatmentType: connection.treatmentType,
          status: connection.status,
          connectedAt: connection.approvedAt?.toISOString(),
          outstandingBalance: connection.outstandingBalance,
          canDisconnect: connection.canDisconnect,
          totalAppointments: connection.provider._count.appointmentsAsProvider,
          lastAppointment: lastAppointment?.date.toISOString(),
          nextAppointment: nextAppointment?.date.toISOString(),
          createdAt: connection.createdAt.toISOString()
        };
      })
    );

    // Calculate summary statistics
    const stats = {
      total: connections.length,
      approved: connections.filter(c => c.status === 'approved').length,
      pending: connections.filter(c => c.status === 'pending').length,
      rejected: connections.filter(c => c.status === 'rejected').length,
      totalAppointments: connectionsWithDetails.reduce((sum, c) => sum + c.totalAppointments, 0),
      totalOutstanding: connectionsWithDetails.reduce((sum, c) => sum + c.outstandingBalance, 0)
    };

    return NextResponse.json({
      connections: connectionsWithDetails,
      stats
    });

  } catch (error) {
    console.error('My doctors API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}