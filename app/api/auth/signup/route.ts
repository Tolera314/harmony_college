import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/src/lib/prisma';
import { applicationSchema, normalizePhone } from '@/src/lib/validations';
import { signJWT } from '@/src/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate inputs using Zod
    const validationResult = applicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    // 3. Hash the password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 4. Create user & application with transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: 'STUDENT',
        },
      });

      const application = await tx.application.create({
        data: {
          userId: user.id,
          fullName: data.fullName,
          dob: new Date(data.dob),
          age: data.age,
          gender: data.gender,
          nationality: data.nationality,
          phone: normalizePhone(data.phone),
          emergencyContact: normalizePhone(data.emergencyContact),
          city: data.city,
          address: data.address,
          program: data.program,
          academicYear: data.academicYear,
          semester: data.semester,
          studyMode: data.studyMode,
          status: 'SUBMITTED', // Set status to SUBMITTED directly since it is completed
          submittedAt: new Date(),
        },
      });

      // Create documents
      const docs = [
        { type: 'MATRIC', fileUrl: data.matricFileUrl },
        { type: 'GRADE_8', fileUrl: data.grade8FileUrl },
        { type: 'TRANSCRIPT_9_10', fileUrl: data.transcript910FileUrl },
        { type: 'TRANSCRIPT_11_12', fileUrl: data.transcript1112FileUrl },
      ];

      await tx.document.createMany({
        data: docs.map((d) => ({
          applicationId: application.id,
          type: d.type,
          fileUrl: d.fileUrl,
        })),
      });

      return user;
    });

    // 5. Generate JWT Token
    const token = await signJWT({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // 6. Set response and HttpOnly cookie
    const response = NextResponse.json(
      { success: true, message: 'Registration and application submitted successfully.' },
      { status: 201 }
    );

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
