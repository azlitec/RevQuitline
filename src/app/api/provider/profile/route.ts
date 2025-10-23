import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

/**
 * Provider Profile API
 * GET: returns merged profile view from User fields + availability.extra
 * PUT: updates core provider fields on User and persists extended profile in availability.extra
 */

function defaultOfficeHours() {
  return {
    monday: '9:00 AM - 5:00 PM',
    tuesday: '9:00 AM - 5:00 PM',
    wednesday: '9:00 AM - 5:00 PM',
    thursday: '9:00 AM - 5:00 PM',
    friday: '9:00 AM - 5:00 PM',
    saturday: 'Closed',
    sunday: 'Closed',
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        specialty: true,
        yearsOfExperience: true,
        licenseNumber: true,
        bio: true,
        address: true,
        availability: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const availability = (user.availability as any) ?? {};
    // prefer availability.providerProfile, but also accept .extra for backward compatibility
    const extra = availability.providerProfile ?? availability.extra ?? {};

    const profile = {
      profilePhoto: extra.profilePhoto ?? undefined,
      title: extra.title ?? 'Dr.',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      specialty: user.specialty ?? '',
      subSpecialties: extra.subSpecialties ?? [],
      medicalLicense: user.licenseNumber ?? '',
      medicalSchool: extra.medicalSchool ?? '',
      residency: extra.residency ?? '',
      fellowships: extra.fellowships ?? [],
      boardCertifications: extra.boardCertifications ?? [],
      yearsOfExperience: user.yearsOfExperience ?? 0,
      patientsServed: extra.patientsServed ?? 0,
      consultationFee: extra.consultationFee ?? 0,
      clinicName: extra.clinicName ?? '',
      clinicAddress: extra.clinicAddress ?? user.address ?? '',
      city: extra.city ?? '',
      state: extra.state ?? '',
      phone: user.phone ?? '',
      email: user.email ?? '',
      servicesOffered: extra.servicesOffered ?? [],
      treatmentTypes: extra.treatmentTypes ?? [],
      languagesSpoken: extra.languagesSpoken ?? [],
      about: user.bio ?? '',
      treatmentPhilosophy: extra.treatmentPhilosophy ?? '',
      education: extra.education ?? [],
      awards: extra.awards ?? [],
      memberships: extra.memberships ?? [],
      officeHours: extra.officeHours ?? defaultOfficeHours(),
      acceptingNewPatients: extra.acceptingNewPatients ?? true,
      emergencyAvailable: extra.emergencyAvailable ?? false,
    };

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('Provider profile GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Fetch existing availability to merge
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { availability: true },
    });

    const availability = (existing?.availability as any) ?? {};
    const nextExtra = {
      ...(availability.providerProfile ?? availability.extra ?? {}),
      // Persist extended provider profile fields under providerProfile
      profilePhoto: body.profilePhoto ?? undefined,
      title: body.title ?? 'Dr.',
      subSpecialties: Array.isArray(body.subSpecialties) ? body.subSpecialties : [],
      medicalSchool: body.medicalSchool ?? '',
      residency: body.residency ?? '',
      fellowships: Array.isArray(body.fellowships) ? body.fellowships : [],
      boardCertifications: Array.isArray(body.boardCertifications) ? body.boardCertifications : [],
      patientsServed: typeof body.patientsServed === 'number' ? body.patientsServed : (availability.patientsServed ?? 0),
      consultationFee: typeof body.consultationFee === 'number' ? body.consultationFee : (availability.consultationFee ?? 0),
      clinicName: body.clinicName ?? '',
      clinicAddress: body.clinicAddress ?? '',
      city: body.city ?? '',
      state: body.state ?? '',
      servicesOffered: Array.isArray(body.servicesOffered) ? body.servicesOffered : [],
      treatmentTypes: Array.isArray(body.treatmentTypes) ? body.treatmentTypes : [],
      languagesSpoken: Array.isArray(body.languagesSpoken) ? body.languagesSpoken : [],
      treatmentPhilosophy: body.treatmentPhilosophy ?? '',
      education: Array.isArray(body.education) ? body.education : [],
      awards: Array.isArray(body.awards) ? body.awards : [],
      memberships: Array.isArray(body.memberships) ? body.memberships : [],
      officeHours: body.officeHours ?? defaultOfficeHours(),
      acceptingNewPatients: !!body.acceptingNewPatients,
      emergencyAvailable: !!body.emergencyAvailable,
    };

    const mergedAvailability = {
      ...availability,
      providerProfile: nextExtra,
    };

    // Update core fields on User; only allow a controlled subset
    const data: any = {
      firstName: typeof body.firstName === 'string' ? body.firstName : undefined,
      lastName: typeof body.lastName === 'string' ? body.lastName : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      specialty: typeof body.specialty === 'string' ? body.specialty : undefined,
      yearsOfExperience:
        typeof body.yearsOfExperience === 'number' ? body.yearsOfExperience : undefined,
      licenseNumber: typeof body.medicalLicense === 'string' ? body.medicalLicense : undefined,
      bio: typeof body.about === 'string' ? body.about : undefined,
      address: typeof body.clinicAddress === 'string' ? body.clinicAddress : undefined,
      availability: mergedAvailability,
    };

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        specialty: true,
        yearsOfExperience: true,
        licenseNumber: true,
        bio: true,
        address: true,
        availability: true,
      },
    });

    // Return the same shape as GET
    const extra = (updated.availability as any)?.providerProfile ?? {};
    const profile = {
      profilePhoto: extra.profilePhoto ?? undefined,
      title: extra.title ?? 'Dr.',
      firstName: updated.firstName ?? '',
      lastName: updated.lastName ?? '',
      specialty: updated.specialty ?? '',
      subSpecialties: extra.subSpecialties ?? [],
      medicalLicense: updated.licenseNumber ?? '',
      medicalSchool: extra.medicalSchool ?? '',
      residency: extra.residency ?? '',
      fellowships: extra.fellowships ?? [],
      boardCertifications: extra.boardCertifications ?? [],
      yearsOfExperience: updated.yearsOfExperience ?? 0,
      patientsServed: extra.patientsServed ?? 0,
      consultationFee: extra.consultationFee ?? 0,
      clinicName: extra.clinicName ?? '',
      clinicAddress: extra.clinicAddress ?? updated.address ?? '',
      city: extra.city ?? '',
      state: extra.state ?? '',
      phone: updated.phone ?? '',
      email: updated.email ?? '',
      servicesOffered: extra.servicesOffered ?? [],
      treatmentTypes: extra.treatmentTypes ?? [],
      languagesSpoken: extra.languagesSpoken ?? [],
      about: updated.bio ?? '',
      treatmentPhilosophy: extra.treatmentPhilosophy ?? '',
      education: extra.education ?? [],
      awards: extra.awards ?? [],
      memberships: extra.memberships ?? [],
      officeHours: extra.officeHours ?? defaultOfficeHours(),
      acceptingNewPatients: extra.acceptingNewPatients ?? true,
      emergencyAvailable: extra.emergencyAvailable ?? false,
    };

    return NextResponse.json({ profile }, { status: 200 });
  } catch (err) {
    console.error('Provider profile PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}