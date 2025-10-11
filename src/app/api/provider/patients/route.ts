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
    const treatmentType = searchParams.get('treatmentType');
    const inactiveThresholdDaysParam = searchParams.get('inactiveThresholdDays');

    // Build derived patient filters
    const patientAndFilters: any[] = [];
    
    // Case-insensitive search on patient fields (server-side)
    if (search) {
      patientAndFilters.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName:  { contains: search, mode: 'insensitive' } },
          { email:     { contains: search, mode: 'insensitive' } },
          { phone:     { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    
    // Smoking status filter (server-side)
    if (smokingStatus && smokingStatus !== 'all') {
      patientAndFilters.push({ smokingStatus });
    }
    
    // Age filter -> DOB window (server-side)
    if (minAge || maxAge) {
      const now = new Date();
      let startDOB: Date | undefined; // oldest acceptable DOB (younger people -> later DOB)
      let endDOB: Date | undefined;   // newest acceptable DOB (older people -> earlier DOB)
      if (maxAge) {
        const years = parseInt(maxAge);
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - years - 1);
        d.setDate(d.getDate() + 1); // inclusive of boundary
        startDOB = d;
      }
      if (minAge) {
        const years = parseInt(minAge);
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - years);
        endDOB = d;
      }
      const dobRange: any = {};
      if (startDOB) dobRange.gte = startDOB;
      if (endDOB) dobRange.lte = endDOB;
      patientAndFilters.push({ dateOfBirth: dobRange });
    }
    
    // lastVisitDays filter via appointments existence (server-side)
    if (lastVisitDays) {
      const days = parseInt(lastVisitDays);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      patientAndFilters.push({
        appointmentsAsPatient: {
          some: {
            providerId: session.user.id,
            status: 'completed',
            date: { gte: cutoffDate },
          },
        },
      });
    }
    
    // Build where clause for filtering connections
    const connectionWhere: any = {
      providerId: session.user.id,
      status: {
        in: ['approved'] // Only show approved connections
      }
    };
    
    // Filter by treatmentType if provided (do not overload 'status' for this)
    if (treatmentType && treatmentType !== 'all') {
      connectionWhere.treatmentType = {
        contains: treatmentType,
        mode: 'insensitive'
      };
    }
    
    // Attach patient filters if any
    if (patientAndFilters.length > 0) {
      connectionWhere.patient = { AND: patientAndFilters };
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

    // Initialize filtered connections (server-side filters already applied)
    let filteredConnections = connections;
    
    // Apply visit count filters in-memory (requires aggregated visit count)
    if (minVisits || maxVisits) {
      filteredConnections = filteredConnections.filter(connection => {
        const visitCount = connection.patient._count.appointmentsAsPatient;
        if (minVisits && visitCount < parseInt(minVisits)) return false;
        if (maxVisits && visitCount > parseInt(maxVisits)) return false;
        return true;
      });
    }

    // Format patients for frontend with consistent status mapping and EMR counters
    const inactivityDays = inactiveThresholdDaysParam ? parseInt(inactiveThresholdDaysParam) : 180;
    
    let patients = await Promise.all(filteredConnections.map(async (connection) => {
      const patient = connection.patient;
      const lastAppointment = patient.appointmentsAsPatient[0];
      const lastVisitISO = lastAppointment?.date?.toISOString();
      const lastVisitDate = lastAppointment ? new Date(lastAppointment.date) : undefined;

      // Upcoming appointments count (scheduled/confirmed/in-progress) to treat booked patients as active
      const upcomingApptsCount = await prisma.appointment.count({
        where: {
          providerId: session.user.id,
          patientId: patient.id,
          status: { in: ['scheduled', 'confirmed', 'in-progress'] },
        },
      });
    
      // Status mapping:
      // - vip -> 'vip'
      // - if upcoming appointments exist -> 'active'
      // - else inactive if no visit > inactivityDays, otherwise 'active'
      let mappedStatus = 'active';
      if ((connection.treatmentType || '').toLowerCase() === 'vip') {
        mappedStatus = 'vip';
      } else if (upcomingApptsCount > 0) {
        mappedStatus = 'active';
      } else {
        const daysSinceLastVisit = lastVisitDate ? Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;
        if (daysSinceLastVisit > inactivityDays) {
          mappedStatus = 'inactive';
        } else {
          mappedStatus = 'active';
        }
      }
    
      // Lightweight EMR counters
      const [notesDraftCount, abnormalResultsCount, unsentCorrespondenceCount] = await Promise.all([
        prisma.progressNote.count({
          where: {
            patientId: patient.id,
            status: 'draft',
            encounter: { providerId: session.user.id }
          }
        }),
        prisma.investigationResult.count({
          where: {
            interpretation: { in: ['abnormal', 'critical'] },
            order: {
              patientId: patient.id,
              providerId: session.user.id
            }
          }
        }),
        prisma.correspondence.count({
          where: {
            patientId: patient.id,
            sentAt: null,
            encounter: { providerId: session.user.id }
          }
        })
      ]);
    
      return {
        id: patient.id,
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth?.toISOString(),
        smokingStatus: patient.smokingStatus,
        quitDate: patient.quitDate?.toISOString(),
        lastVisit: lastVisitISO,
        totalVisits: patient._count.appointmentsAsPatient,
        status: mappedStatus,
        createdAt: patient.createdAt.toISOString(),
        notesDraftCount,
        abnormalResultsCount,
        unsentCorrespondenceCount
      };
    }));
// Fallback: include patients who have appointments with this provider even if no approved connection exists
try {
  const existingIds = new Set(patients.map((p: any) => p.id));

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: session.user.id,
      status: { in: ['scheduled', 'confirmed', 'in-progress', 'completed'] },
    },
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
          // Last visit for this provider
          appointmentsAsPatient: {
            where: {
              providerId: session.user.id,
              status: 'completed',
            },
            orderBy: {
              date: 'desc',
            },
            take: 1,
            select: {
              date: true,
            },
          },
          // Count total visits with this provider
          _count: {
            select: {
              appointmentsAsPatient: {
                where: {
                  providerId: session.user.id,
                  status: 'completed',
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  const apptPatientsMap = new Map<string, (typeof appointments)[number]['patient']>();
  for (const a of appointments) {
    const p = a.patient;
    if (!p) continue;
    if (existingIds.has(p.id)) continue; // skip those already from approved connections
    if (!apptPatientsMap.has(p.id)) apptPatientsMap.set(p.id, p);
  }

  const appointmentsOnlyPatients = await Promise.all(
    Array.from(apptPatientsMap.values()).map(async (patient) => {
      const lastAppointment = patient.appointmentsAsPatient[0];
      const lastVisitISO = lastAppointment?.date?.toISOString();
      const lastVisitDate = lastAppointment ? new Date(lastAppointment.date) : undefined;

      // Upcoming appointments count (scheduled/confirmed/in-progress) to treat booked patients as active
      const upcomingApptsCount = await prisma.appointment.count({
        where: {
          providerId: session.user.id,
          patientId: patient.id,
          status: { in: ['scheduled', 'confirmed', 'in-progress'] },
        },
      });
    
      // Status mapping for appointments-only patients (no VIP detection without connection):
      // - if upcoming appointments exist -> 'active'
      // - else inactive if no visit > inactivityDays, otherwise 'active'
      let mappedStatus = 'active';
      if (upcomingApptsCount > 0) {
        mappedStatus = 'active';
      } else {
        const daysSinceLastVisit = lastVisitDate
          ? Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;
        if (daysSinceLastVisit > inactivityDays) {
          mappedStatus = 'inactive';
        } else {
          mappedStatus = 'active';
        }
      }
    
      // Lightweight EMR counters scoped to provider
      const [notesDraftCount, abnormalResultsCount, unsentCorrespondenceCount] = await Promise.all([
        prisma.progressNote.count({
          where: {
            patientId: patient.id,
            status: 'draft',
            encounter: { providerId: session.user.id },
          },
        }),
        prisma.investigationResult.count({
          where: {
            interpretation: { in: ['abnormal', 'critical'] },
            order: {
              patientId: patient.id,
              providerId: session.user.id,
            },
          },
        }),
        prisma.correspondence.count({
          where: {
            patientId: patient.id,
            sentAt: null,
            encounter: { providerId: session.user.id },
          },
        }),
      ]);
    
      return {
        id: patient.id,
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth?.toISOString(),
        smokingStatus: patient.smokingStatus,
        quitDate: patient.quitDate?.toISOString(),
        lastVisit: lastVisitISO,
        totalVisits: patient._count.appointmentsAsPatient,
        status: mappedStatus,
        createdAt: patient.createdAt.toISOString(),
        notesDraftCount,
        abnormalResultsCount,
        unsentCorrespondenceCount,
      };
    })
  );

  // Merge and dedupe
  patients = [...patients, ...appointmentsOnlyPatients];
} catch (fallbackErr) {
  console.warn('Fallback appointment patients inclusion failed:', fallbackErr);
}
    
    // Apply status filter after mapping if provided (active/inactive/vip)
    if (status && status !== 'all') {
      patients = patients.filter(p => p.status === status);
    }
    
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