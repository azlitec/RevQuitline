import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, phone, password, userType, licenseNumber } = await request.json();

    // Validation
    if (!firstName || !email || !password) {
      return NextResponse.json(
        { message: "Nama pertama, email, dan kata laluan diperlukan" },
        { status: 400 }
      );
    }

    // Validate medical registration number for doctors
    if (userType === 'doctor' && !licenseNumber) {
      return NextResponse.json(
        { message: "Nombor pendaftaran perubatan diperlukan untuk doktor" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email telah digunakan" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user with appropriate role based on userType
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName: lastName || "",
        email,
        phone: phone || "",
        password: hashedPassword,
        isProvider: userType === 'doctor',
        role: userType === 'doctor' ? 'PROVIDER' : 'USER',
        licenseNumber: userType === 'doctor' ? licenseNumber || "" : null,
      },
    });

    return NextResponse.json({
      message: "Akaun telah berjaya didaftarkan",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isProvider: user.isProvider,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Terdapat ralat semasa pendaftaran" },
      { status: 500 }
    );
  }
}