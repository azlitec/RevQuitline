import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Provider patients API called');

    const session = await getServerSession(authOptions);
    console.log('Session retrieved:', !!session);
    console.log('Session user:', session?.user);

    if (!session || !session.user) {
      console.log('No session or user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User ID:', session.user.id);
    console.log('Is Provider:', session.user.isProvider);

    // Check if user is a provider
    if (!session.user.isProvider) {
      console.log('User is not a provider');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const smokingStatus = searchParams.get('smokingStatus');
    const minAge = searchParams.get('minAge');
    const maxAge = searchParams.get('maxAge');
    const minVisits = searchParams.get('minVisits');
    const maxVisits = searchParams.get('maxVisits');
    const lastVisitDays = searchParams.get('lastVisitDays');

    // Build where clause for filtering connections
    const connectionWhere: any = {
      providerId: session.user.id,
      status: {
        in: ['approved'] // Only show approved connections
      }
    };

    // Filter by treatment type if status is provided
    if (status && status !== 'all') {
      connectionWhere.treatmentType = {
        contains: status,
        mode: 'insensitive'
      };
    }

    console.log('Querying connections with where clause:', connectionWhere);

    // Get all connected patients for this provider
    const connections = await prisma.doctorPatientConnection.findMany({
      where: connectionWhere,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            smokingStatus: true,
            quitDate: true,
            medicalHistory: true,
            currentMedications: true,
            allergies: true,
            createdAt: true,
            // Get last visit from appointments
            appointmentsAsPatient: {
              where: {
                providerId: session.user.id,
                status: 'completed'
              },
              orderBy: {
                date: 'desc'
              },
              take: 1,
              select: {
                date: true
              }
            },
            // Count total visits
            _count: {
              select: {
                appointmentsAsPatient: {
                  where: {
                    providerId: session.user.id,
                    status: 'completed'
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('Found connections:', connections.length);

    // Filter by search term if provided
    let filteredConnections = connections;
    if (search) {
      filteredConnections = connections.filter(connection => {
        const patient = connection.patient;
        const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
        const email = patient.email?.toLowerCase() || '';
        const phone = patient.phone?.toLowerCase() || '';

        return fullName.includes(search.toLowerCase()) ||
                email.includes(search.toLowerCase()) ||
                phone.includes(search.toLowerCase());
      });
    }

    // Apply additional filters
    if (smokingStatus && smokingStatus !== 'all') {
      filteredConnections = filteredConnections.filter(connection => {
        return connection.patient.smokingStatus === smokingStatus;
      });
    }

    if (minAge || maxAge) {
      filteredConnections = filteredConnections.filter(connection => {
        const patient = connection.patient;
        if (!patient.dateOfBirth) return false;

        const today = new Date();
        const birthDate = new Date(patient.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (minAge && age < parseInt(minAge)) return false;
        if (maxAge && age > parseInt(maxAge)) return false;

        return true;
      });
    }

    if (minVisits || maxVisits) {
      filteredConnections = filteredConnections.filter(connection => {
        const visitCount = connection.patient._count.appointmentsAsPatient;
        if (minVisits && visitCount < parseInt(minVisits)) return false;
        if (maxVisits && visitCount > parseInt(maxVisits)) return false;
        return true;
      });
    }

    if (lastVisitDays) {
      const days = parseInt(lastVisitDays);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      filteredConnections = filteredConnections.filter(connection => {
        const lastAppointment = connection.patient.appointmentsAsPatient[0];
        if (!lastAppointment) return false;

        const lastVisitDate = new Date(lastAppointment.date);
        return lastVisitDate >= cutoffDate;
      });
    }

    // Format patients for frontend
    const patients = filteredConnections.map(connection => {
      const patient = connection.patient;
      const lastAppointment = patient.appointmentsAsPatient[0];

      return {
        id: patient.id,
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth?.toISOString(),
        smokingStatus: patient.smokingStatus,
        quitDate: patient.quitDate?.toISOString(),
        lastVisit: lastAppointment?.date?.toISOString(),
        totalVisits: patient._count.appointmentsAsPatient,
        status: connection.treatmentType === 'vip' ? 'vip' : 'active', // Map treatment type to status
        createdAt: patient.createdAt.toISOString()
      };
    });

    console.log('Returning patients:', patients.length);

    return NextResponse.json({
      patients,
      total: patients.length
    });

  } catch (error) {
    console.error('Provider patients API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}