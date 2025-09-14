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

    // Get all providers (doctors)
    const providers = await prisma.user.findMany({
      where: {
        isProvider: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        specialty: true,
        yearsOfExperience: true,
        licenseNumber: true,
        bio: true,
        phone: true,
        address: true,
        availability: true,
        _count: {
          select: {
            appointmentsAsProvider: {
              where: {
                status: 'completed'
              }
            }
          }
        }
      }
    });

    // Get existing connections for this patient
    const existingConnections = await prisma.doctorPatientConnection.findMany({
      where: {
        patientId: patientId
      },
      select: {
        providerId: true,
        status: true,
        treatmentType: true
      }
    });

    const connectionMap = new Map();
    existingConnections.forEach(conn => {
      connectionMap.set(conn.providerId, {
        isConnected: conn.status === 'approved',
        status: conn.status,
        treatmentType: conn.treatmentType
      });
    });

    // Mock data for additional doctor info (in real app, this would come from database)
    const mockDoctorData = {
      treatments: [
        'Smoking Cessation', 'Weight Management', 'Diabetes Care',
        'Heart Disease', 'Mental Health', 'Cancer Treatment',
        'Physical Therapy', 'Addiction Recovery', 'Chronic Pain',
        'Preventive Care', 'Emergency Care', 'Telemedicine'
      ],
      locations: [
        'Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Perak',
        'Sabah', 'Sarawak', 'Kelantan', 'Terengganu', 'Pahang'
      ],
      languages: [
        'English', 'Bahasa Malaysia', 'Mandarin', 'Tamil',
        'Cantonese', 'Hindi', 'Arabic', 'Thai'
      ]
    };

    // Format doctors data
    const formattedDoctors = providers.map(provider => {
      const firstName = provider.firstName || '';
      const lastName = provider.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || provider.email;
      
      const connection = connectionMap.get(provider.id);
      
      // Generate mock data based on provider ID for consistency
      const seedValue = provider.id.length;
      const rating = 3.5 + (seedValue % 15) / 10; // Rating between 3.5 and 5.0
      const reviewsCount = 10 + (seedValue % 200); // Reviews between 10-210
      const consultationFee = 80 + (seedValue % 220); // Fee between RM 80-300
      
      // Assign treatment types based on specialty
      let treatmentTypes = ['Preventive Care', 'General Consultation'];
      if (provider.specialty) {
        const specialtyLower = provider.specialty.toLowerCase();
        if (specialtyLower.includes('cardio')) {
          treatmentTypes.push('Heart Disease', 'Diabetes Care');
        } else if (specialtyLower.includes('mental') || specialtyLower.includes('psychiatry')) {
          treatmentTypes.push('Mental Health', 'Addiction Recovery');
        } else if (specialtyLower.includes('oncology')) {
          treatmentTypes.push('Cancer Treatment');
        } else if (specialtyLower.includes('pulmonology')) {
          treatmentTypes.push('Smoking Cessation', 'Chronic Pain');
        }
      }
      
      return {
        id: provider.id,
        name: fullName,
        email: provider.email,
        specialty: provider.specialty || 'General Medicine',
        yearsOfExperience: provider.yearsOfExperience || 1 + (seedValue % 20),
        licenseNumber: provider.licenseNumber,
        bio: provider.bio || `Experienced ${provider.specialty || 'General Medicine'} practitioner dedicated to providing quality healthcare.`,
        rating: Math.round(rating * 10) / 10,
        reviewsCount,
        consultationFee,
        availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], // Mock availability
        location: mockDoctorData.locations[seedValue % mockDoctorData.locations.length],
        languages: [
          'English',
          'Bahasa Malaysia',
          mockDoctorData.languages[seedValue % mockDoctorData.languages.length]
        ].filter((lang, index, arr) => arr.indexOf(lang) === index), // Remove duplicates
        treatmentTypes,
        qualifications: [
          'MBBS',
          provider.specialty ? `${provider.specialty} Specialist` : 'General Medicine',
          'Licensed Medical Practitioner'
        ],
        isConnected: connection?.isConnected || false,
        connectionStatus: connection?.status,
        totalPatients: provider._count.appointmentsAsProvider || 0,
        phone: provider.phone,
        address: provider.address
      };
    });

    // Sort by rating by default
    formattedDoctors.sort((a, b) => b.rating - a.rating);

    return NextResponse.json({
      doctors: formattedDoctors,
      total: formattedDoctors.length,
      filters: {
        specialties: [...new Set(formattedDoctors.map(d => d.specialty))],
        treatmentTypes: mockDoctorData.treatments,
        locations: mockDoctorData.locations,
        languages: mockDoctorData.languages,
        experienceRanges: ['1-5 years', '5-10 years', '10-15 years', '15+ years'],
        priceRanges: ['RM 0-100', 'RM 100-200', 'RM 200-300', 'RM 300+']
      }
    });

  } catch (error) {
    console.error('Patient doctors API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}