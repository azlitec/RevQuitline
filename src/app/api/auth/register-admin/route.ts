import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

const ADMIN_REGISTRATION_CODE = "1234567890ABC";

export async function POST(request: NextRequest) {
  try {
    // Get registration data
    const data = await request.json();
    const { firstName, lastName, name, email, password, registrationCode } = data;

    // Diagnostics: log received payload keys without sensitive values
    try {
      console.debug('Admin register received keys', Object.keys(data));
    } catch {}

    // Normalize name fields: if firstName/lastName missing, derive from "name"
    let normalizedFirstName = typeof firstName === 'string' ? firstName.trim() : '';
    let normalizedLastName = typeof lastName === 'string' ? lastName.trim() : '';

    if (!normalizedFirstName && typeof name === 'string' && name.trim().length > 0) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) {
        normalizedFirstName = parts[0];
      } else {
        const last = parts.pop() as string;
        normalizedLastName = normalizedLastName || last;
        normalizedFirstName = parts.join(' ');
      }
    }

    // Diagnostics: log normalized result
    try {
      console.debug('Admin register normalized names', { normalizedFirstName, normalizedLastName });
    } catch {}

    // Validate required fields (lastName optional per schema)
    if (!normalizedFirstName || !email || !password || !registrationCode) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify registration code
    if (registrationCode !== ADMIN_REGISTRATION_CODE) {
      return NextResponse.json(
        { message: 'Invalid registration code' },
        { status: 403 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with admin role
    const newUser = await prisma.user.create({
      data: {
        firstName: normalizedFirstName,
        lastName: normalizedLastName || null,
        email,
        password: hashedPassword,
        isAdmin: true,
        role: 'ADMIN',
      }
    });

    // Remove sensitive data from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      message: 'Admin registered successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error during admin registration:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}