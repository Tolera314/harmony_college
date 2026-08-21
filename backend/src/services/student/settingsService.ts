/**
 * Student Settings Service
 * Profile update (name, phone, email) + notification preferences.
 * Student ID, major, program, and academic fields are read-only (Registrar-managed).
 */
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import { PASSWORD_BCRYPT_ROUNDS } from '../../types/auth';

export async function getStudentSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      studentRecord: {
        select: {
          id: true,
          studentId: true,
          yearLevel: true,
          gpa: true,
          program: { select: { name: true, code: true } },
          department: { select: { name: true } },
          notificationPreference: true,
        },
      },
    },
  });
  if (!user) return null;
  return user;
}

export async function updateStudentProfile(
  userId: string,
  data: { fullName?: string; phone?: string; email?: string },
) {
  if (!data.fullName && !data.phone && !data.email) {
    throw new Error('No fields to update');
  }

  // Email uniqueness check
  if (data.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), id: { not: userId } },
    });
    if (conflict) throw new Error('Email already in use by another account');
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName && { fullName: data.fullName.trim() }),
      ...(data.phone && { phone: data.phone.trim() }),
      ...(data.email && { email: data.email.trim().toLowerCase() }),
    },
    select: { id: true, fullName: true, email: true, phone: true },
  });
}

export async function updateNotificationPreferences(
  studentRecordId: string,
  prefs: {
    gradeAlerts?: boolean;
    tuitionReminders?: boolean;
    registrarNotices?: boolean;
    advisorMessages?: boolean;
  },
) {
  return prisma.studentNotificationPreference.upsert({
    where: { studentRecordId },
    create: { studentRecordId, ...prefs },
    update: { ...prefs },
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new Error('User not found');
  if (!user.passwordHash) throw new Error('No password set on this account');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash ?? '');
  if (!valid) throw new Error('Current password is incorrect');

  const hash = await bcrypt.hash(newPassword, PASSWORD_BCRYPT_ROUNDS);

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });

  // Revoke all other sessions
  await prisma.session.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });

  await prisma.auditLog.create({
    data: { userId, action: 'PASSWORD_CHANGED' },
  });
}
