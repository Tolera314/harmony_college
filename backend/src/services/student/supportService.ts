/**
 * Student Support Service
 * Handles advisor appointment booking and retrieval.
 * The AI advisor chat itself is handled by /api/advisor/chat route.
 */
import { prisma } from '../../lib/prisma';

const AVAILABLE_TIME_SLOTS = ['10:00', '11:30', '14:00', '15:30'];

export async function bookAppointment(data: {
  studentRecordId: string;
  topic: string;
  requestedDate: string;  // ISO date string
  requestedTime: string;  // "10:00"
  advisorUserId?: string;
}) {
  if (!AVAILABLE_TIME_SLOTS.includes(data.requestedTime)) {
    throw new Error(`Invalid time slot. Available: ${AVAILABLE_TIME_SLOTS.join(', ')}`);
  }

  const requestedDate = new Date(data.requestedDate);
  if (isNaN(requestedDate.getTime())) throw new Error('Invalid date');
  if (requestedDate < new Date()) throw new Error('Cannot book an appointment in the past');

  // Find the student's advisor (their course instructor or default instructor)
  let advisorUserId = data.advisorUserId;
  if (!advisorUserId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentRecordId: data.studentRecordId,
        status: { in: ['ACTIVE', 'FORCE_ADDED'] },
        courseOffering: { instructorId: { not: null } },
      },
      include: { courseOffering: { include: { instructor: true } } },
    });
    advisorUserId = enrollment?.courseOffering.instructor?.userId ?? '';
  }

  if (!advisorUserId) throw new Error('No advisor available. Please contact the Registrar.');

  // Prevent double-booking same slot
  const conflict = await prisma.advisorAppointment.findFirst({
    where: {
      advisorUserId,
      requestedDate,
      requestedTime: data.requestedTime,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });
  if (conflict) {
    throw new Error(`${data.requestedTime} on ${requestedDate.toDateString()} is already booked. Please choose a different slot.`);
  }

  return prisma.advisorAppointment.create({
    data: {
      studentRecordId: data.studentRecordId,
      advisorUserId,
      topic: data.topic.trim(),
      requestedDate,
      requestedTime: data.requestedTime,
      status: 'CONFIRMED', // auto-confirm for now
      confirmedAt: new Date(),
    },
    include: {
      studentRecord: { select: { studentId: true, user: { select: { fullName: true, email: true } } } },
    },
  });
}

export async function getAppointments(studentRecordId: string) {
  return prisma.advisorAppointment.findMany({
    where: { studentRecordId },
    orderBy: { requestedDate: 'desc' },
    include: {
      studentRecord: { select: { user: { select: { fullName: true } } } },
    },
  });
}

export async function cancelAppointment(appointmentId: string, studentRecordId: string) {
  const appointment = await prisma.advisorAppointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) throw new Error('Appointment not found');
  if (appointment.studentRecordId !== studentRecordId) throw new Error('Unauthorized');
  if (appointment.status === 'CANCELLED') throw new Error('Already cancelled');
  if (appointment.status === 'COMPLETED') throw new Error('Cannot cancel a completed appointment');

  return prisma.advisorAppointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
}
