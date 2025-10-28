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

    // Check if user is a provider
    if (!session.user.isProvider) {
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
    const treatmentType = searchParams.get('treatmentType');
    const inactiveThresholdDays = parseInt(searchParams.get('inactiveThresholdDays') || '180');

    // Build optimized patient filters
    const patientFilters: any = {};
    
    // Search filter
    if (search) {
      patientFilters.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Smoking status filter
    if (smokingStatus && smokingStatus !== 'all') {
      patientFilters.smokingStatus = smokingStatus;
    }
    
    // Age filter using DOB
    if (minAge || maxAge) {
      const now = new Date();
      const dobRange: any = {};
      
      if (maxAge) {
        const maxDate = new Date(now);
        maxDate.setFullYear(maxDate.getFullYear() - parseInt(maxAge));
        dobRange.gte = maxDate;
      }
      
      if (minAge) {
        const minDate = new Date(now);
        minDate.setFullYear(minDate.getFullYear() - parseInt(minAge));
        dobRange.lte = minDate;
      }
      
      patientFilters.dateOfBirth = dobRange;
    }

    // Build connection where clause
    const connectionWhere: any = {
      providerId: session.user.id,
      status: 'approved'
    };

    if (treatmentType && treatmentType !== 'all') {
      connectionWhere.treatmentType = {
        contains: treatmentType,
        mode: 'insensitive'
      };
    }

    if (Object.keys(patientFilters).length > 0) {
      connectionWhere.patient = patientFilters;
    }

    // Single optimized query to get all patient data
    const [connections, upcomingAppointments, emrCounts] = await Promise.all([
      // Get connected patients with basic info and last visit
      prisma.doctorPatientConnection.findMany({
        where: connectionWhere,
        select: {
          treatmentType: true,
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
              createdAt: true,
              appointmentsAsPatient: {
                where: {
                  providerId: session.user.id,
                  status: 'completed'
                },
                orderBy: { date: 'desc' },
                take: 1,
                select: { date: true }
              },
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
        orderBy: { createdAt: 'desc' }
      }),

      // Get upcoming appointments for all patients in one query
      prisma.appointment.groupBy({
        by: ['patientId'],
        where: {
          providerId: session.user.id,
          status: { in: ['scheduled', 'confirmed', 'in-progress'] }
        },
        _count: { id: true }
      }),

      // Get EMR counts for all patients in batch queries
      Promise.all([
        prisma.progressNote.groupBy({
          by: ['patientId'],
          where: {
            status: 'draft',
            encounter: { providerId: session.user.id }
          },
          _count: { id: true }
        }),
        prisma.investigationResult.groupBy({
          by: ['patientId'],
          where: {
            interpretation: { in: ['abnormal', 'critical'] },
            order: { providerId: session.user.id }
          },
          _count: { id: true }
        }),
        prisma.correspondence.groupBy({
          by: ['patientId'],
          where: {
            sentAt: null,
            encounter: { providerId: session.user.id }
          },
          _count: { id: true }
        })
      ])
    ]);

    // Create lookup maps for efficient data access
    const upcomingApptMap = new Map(upcomingAppointments.map(a => [a.patientId, a._count.id]));
    const [draftNotesMap, abnormalResultsMap, unsentCorrespondenceMap] = emrCounts.map(
      counts => new Map(counts.map(c => [c.patientId, c._count.id]))
    );

    // Process patients efficiently
    let patients = connections
      .filter(connection => {
        // Apply visit count filters
        const visitCount = connection.patient._count.appointmentsAsPatient;
        if (minVisits && visitCount < parseInt(minVisits)) return false;
        if (maxVisits && visitCount > parseInt(maxVisits)) return false;
        return true;
      })
      .map(connection => {
        const patient = connection.patient;
        const lastAppointment = patient.appointmentsAsPatient[0];
        const lastVisitDate = lastAppointment?.date;
        const upcomingCount = upcomingApptMap.get(patient.id) || 0;

        // Efficient status mapping
        let mappedStatus = 'active';
        if (connection.treatmentType?.toLowerCase() === 'vip') {
          mappedStatus = 'vip';
        } else if (upcomingCount > 0) {
          mappedStatus = 'active';
        } else if (lastVisitDate) {
          const daysSinceLastVisit = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
          mappedStatus = daysSinceLastVisit > inactiveThresholdDays ? 'inactive' : 'active';
        } else {
          mappedStatus = 'inactive';
        }

        return {
          id: patient.id,
          firstName: patient.firstName || '',
          lastName: patient.lastName || '',
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth?.toISOString(),
          smokingStatus: patient.smokingStatus,
          quitDate: patient.quitDate?.toISOString(),
          lastVisit: lastVisitDate?.toISOString(),
          totalVisits: patient._count.appointmentsAsPatient,
          status: mappedStatus,
          createdAt: patient.createdAt.toISOString(),
          notesDraftCount: draftNotesMap.get(patient.id) || 0,
          abnormalResultsCount: abnormalResultsMap.get(patient.id) || 0,
          unsentCorrespondenceCount: unsentCorrespondenceMap.get(patient.id) || 0
        };
      });
    // Apply status filter if provided
    if (status && status !== 'all') {
      patients = patients.filter(p => p.status === status);
    }

    // Add cache headers for better performance
    return NextResponse.json({
      patients,
      total: patients.length
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30', // Cache for 30 seconds
      }
    });

  } catch (error) {
    console.error('Provider patients API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}