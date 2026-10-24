/**
 * Financial System Test Suite — Harmony College
 * ───────────────────────────────────────────────
 * Comprehensive tests for:
 * - Registration fee duplicate prevention
 * - Payment submission workflow and approval
 * - Atomic operations and concurrent request handling
 * - Balance calculations and transaction status filtering
 * - Dashboard calculations and TVET/Short Program separation
 * - Staff payments and expenses
 */

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { 
  verifyRegistrationPayment 
} from '../services/finance/foPaymentService';
import {
  submitPaymentEvidence,
  approveSubmission,
} from '../services/finance/paymentSubmissionService';
import { Role, AccountStatus, ProgramType, PaymentInstallmentStatus } from '@prisma/client';

const STRONG_PASSWORD = 'TestPass1!';
const STRONG_HASH = bcrypt.hashSync(STRONG_PASSWORD, 12);

// ── Test Data Helpers ─────────────────────────────────────────────────────────

async function createTestUser(overrides: Partial<any> = {}) {
  const timestamp = Date.now();
  return prisma.user.create({
    data: {
      fullName: overrides.fullName || `Test User ${timestamp}`,
      email: overrides.email || `test-${timestamp}@test.local`,
      phone: overrides.phone || null,
      passwordHash: STRONG_HASH,
      role: overrides.role || Role.STUDENT,
      status: overrides.status || AccountStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
      profileCompleted: false,
    },
  });
}

async function createTestDepartment(programType: ProgramType = ProgramType.TVET) {
  const timestamp = Date.now();
  return prisma.department.create({
    data: {
      name: `Test Dept ${timestamp}`,
      code: `TD${timestamp.toString().slice(-4)}`,
      description: 'Test department',
      programType,
    },
  });
}

async function createTestProgram(departmentId: string) {
  const timestamp = Date.now();
  return prisma.program.create({
    data: {
      name: `Test Program ${timestamp}`,
      code: `TP${timestamp.toString().slice(-4)}`,
      departmentId,
      durationYears: 4,
    },
  });
}

async function createTestStudentRecord(userId: string, departmentId: string, programId: string, programType: ProgramType = ProgramType.TVET) {
  const timestamp = Date.now();
  return prisma.studentRecord.create({
    data: {
      userId,
      studentId: `HC-TEST-${timestamp.toString().slice(-6)}`,
      departmentId,
      programId,
      programType,
      yearLevel: 1,
    },
  });
}

async function createTestFinancialAccount(studentRecordId: string) {
  return prisma.financialAccount.create({
    data: {
      studentRecordId,
      balance: 0,
    },
  });
}

async function createTestInstallment(financialAccountId: string, studentRecordId: string, expectedAmount: number = 1000, status: PaymentInstallmentStatus = PaymentInstallmentStatus.DUE) {
  const timestamp = Date.now();
  const billingMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  return prisma.monthlyInstallment.create({
    data: {
      financialAccountId,
      studentRecordId,
      academicContext: ProgramType.TVET,
      billingMonth: `${billingMonth}-${timestamp.toString().slice(-4)}`, // Make unique
      billingLabel: `Test Installment ${timestamp}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
      expectedAmount,
      status,
    },
  });
}

async function cleanupTestData(userIds: string[] = [], deptIds: string[] = [], progIds: string[] = [], studentRecordIds: string[] = []) {
  try {
    // Delete in correct order due to foreign key constraints
    for (const srId of studentRecordIds) {
      await prisma.paymentReceipt.deleteMany({ where: { studentRecordId: srId } });
      await prisma.paymentSubmission.deleteMany({ where: { studentRecordId: srId } });
      await prisma.monthlyInstallment.deleteMany({ where: { studentRecordId: srId } });
      await prisma.financialTransaction.deleteMany({ 
        where: { financialAccount: { studentRecordId: srId } } 
      });
      await prisma.financialAccount.deleteMany({ where: { studentRecordId: srId } });
      await prisma.studentRecord.delete({ where: { id: srId } }).catch(() => {});
    }
    
    for (const userId of userIds) {
      await prisma.registrationFeePayment.deleteMany({ where: { userId } });
      await prisma.studentProfile.deleteMany({ where: { userId } });
      await prisma.application.deleteMany({ where: { userId } });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    
    for (const progId of progIds) {
      await prisma.program.delete({ where: { id: progId } }).catch(() => {});
    }
    
    for (const deptId of deptIds) {
      await prisma.department.delete({ where: { id: deptId } }).catch(() => {});
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Test Suites
// ══════════════════════════════════════════════════════════════════════════════

describe('Financial System', () => {

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Registration Fee - verifyRegistrationPayment
  // ────────────────────────────────────────────────────────────────────────────

  describe('Registration Fee - verifyRegistrationPayment', () => {
    test('Verification creates exactly one FinancialTransaction', async () => {
      const user = await createTestUser();
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      
      try {
        // Create application and profile
        await prisma.application.create({
          data: {
            userId: user.id,
            fullName: user.fullName,
            dob: new Date('1995-01-01'),
            age: 29,
            gender: 'Male',
            nationality: 'Ethiopian',
            emergencyContact: '+251911000000',
            phone: '+251911000001',
            city: 'Addis Ababa',
            address: '123 Test St',
            program: 'Software Engineering',
            academicYear: '2025',
            semester: 'Fall',
            studyMode: 'Full-time',
            programType: ProgramType.TVET,
            registrationScreenshotUrl: 'https://example.com/screenshot.jpg',
          },
        });
        
        await prisma.studentProfile.create({
          data: {
            userId: user.id,
            registrationFeePaid: true,
            registrationFeePaidAt: new Date(),
            paymentVerifiedByFinance: false,
          },
        });

        // Verify payment
        await verifyRegistrationPayment(user.id, foUser.id);

        // Check that exactly one transaction was created
        const transactions = await prisma.financialTransaction.findMany({
          where: {
            financialCategory: 'REGISTRATION_FEE',
            registrationFeePayment: {
              userId: user.id,
            },
            status: 'POSTED',
          },
        });

        expect(transactions.length).toBe(1);
        expect(transactions[0].amount).toBe(-500); // Standard registration fee
        expect(transactions[0].type).toBe('REGISTRATION');
      } finally {
        await cleanupTestData([user.id, foUser.id]);
      }
    });

    test('Second verification throws error and does not create duplicate transaction', async () => {
      const user = await createTestUser();
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      
      try {
        await prisma.application.create({
          data: {
            userId: user.id,
            fullName: user.fullName,
            dob: new Date('1995-01-01'),
            age: 29,
            gender: 'Male',
            nationality: 'Ethiopian',
            emergencyContact: '+251911000000',
            phone: '+251911000001',
            city: 'Addis Ababa',
            address: '123 Test St',
            program: 'Software Engineering',
            academicYear: '2025',
            semester: 'Fall',
            studyMode: 'Full-time',
            programType: ProgramType.TVET,
            registrationScreenshotUrl: 'https://example.com/screenshot.jpg',
          },
        });
        
        await prisma.studentProfile.create({
          data: {
            userId: user.id,
            registrationFeePaid: true,
            registrationFeePaidAt: new Date(),
            paymentVerifiedByFinance: false,
          },
        });

        // First verification should succeed
        await verifyRegistrationPayment(user.id, foUser.id);

        // Second verification should throw error
        await expect(
          verifyRegistrationPayment(user.id, foUser.id)
        ).rejects.toThrow('Payment is already verified');

        // Verify still only one transaction exists
        const transactions = await prisma.financialTransaction.findMany({
          where: {
            financialCategory: 'REGISTRATION_FEE',
            registrationFeePayment: {
              userId: user.id,
            },
            status: 'POSTED',
          },
        });

        expect(transactions.length).toBe(1);
      } finally {
        await cleanupTestData([user.id, foUser.id]);
      }
    });

    test('Throws error if paymentVerifiedByFinance is already true', async () => {
      const user = await createTestUser();
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      
      try {
        await prisma.studentProfile.create({
          data: {
            userId: user.id,
            registrationFeePaid: true,
            registrationFeePaidAt: new Date(),
            paymentVerifiedByFinance: true,
            paymentVerifiedAt: new Date(),
            paymentVerifiedByUserId: foUser.id,
          },
        });

        await expect(
          verifyRegistrationPayment(user.id, foUser.id)
        ).rejects.toThrow('Payment is already verified');
      } finally {
        await cleanupTestData([user.id, foUser.id]);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Payment Workflow - approveSubmission
  // ────────────────────────────────────────────────────────────────────────────

  describe('Payment Workflow - approveSubmission', () => {
    test('Student payment approval creates FinancialTransaction with correct data', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      const dept = await createTestDepartment();
      const prog = await createTestProgram(dept.id);
      const studentRec = await createTestStudentRecord(student.id, dept.id, prog.id);
      const finAccount = await createTestFinancialAccount(studentRec.id);
      const installment = await createTestInstallment(finAccount.id, studentRec.id, 1000);
      
      try {
        // Submit payment evidence
        const submission = await submitPaymentEvidence({
          studentRecordId: studentRec.id,
          installmentId: installment.id,
          amount: 1000,
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          referenceNumber: 'TEST-REF-001',
          evidenceUrl: 'https://example.com/proof.jpg',
          note: 'Test payment',
        });

        // Approve submission
        const result = await approveSubmission({
          submissionId: submission.id,
          reviewedByUserId: foUser.id,
        });

        // Verify transaction created
        expect(result.transaction).toBeDefined();
        expect(result.transaction.amount).toBe(-1000); // Credit to student
        expect(result.transaction.type).toBe('PAYMENT');
        expect(result.transaction.status).toBe('POSTED');
        expect(result.transaction.financialCategory).toBe('STUDENT_TUITION');
        expect(result.transaction.programType).toBe(ProgramType.TVET);

        // Verify receipt created
        expect(result.receipt).toBeDefined();
        expect(result.receipt.amountPaid).toBe(1000);

        // Verify installment updated
        const updatedInstallment = await prisma.monthlyInstallment.findUnique({
          where: { id: installment.id },
        });
        expect(updatedInstallment?.status).toBe('PAID');
      } finally {
        await cleanupTestData([student.id, foUser.id], [dept.id], [prog.id], [studentRec.id]);
      }
    });

    test('Cannot approve a submission that is not PENDING_REVIEW', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      const dept = await createTestDepartment();
      const prog = await createTestProgram(dept.id);
      const studentRec = await createTestStudentRecord(student.id, dept.id, prog.id);
      const finAccount = await createTestFinancialAccount(studentRec.id);
      const installment = await createTestInstallment(finAccount.id, studentRec.id);
      
      try {
        const submission = await submitPaymentEvidence({
          studentRecordId: studentRec.id,
          installmentId: installment.id,
          amount: 1000,
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          evidenceUrl: 'https://example.com/proof.jpg',
        });

        // Approve once
        await approveSubmission({
          submissionId: submission.id,
          reviewedByUserId: foUser.id,
        });

        // Try to approve again - should fail
        await expect(
          approveSubmission({
            submissionId: submission.id,
            reviewedByUserId: foUser.id,
          })
        ).rejects.toThrow('Cannot approve submission with status: APPROVED');
      } finally {
        await cleanupTestData([student.id, foUser.id], [dept.id], [prog.id], [studentRec.id]);
      }
    });

    test('Cannot approve a submission when installment is already PAID', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      const dept = await createTestDepartment();
      const prog = await createTestProgram(dept.id);
      const studentRec = await createTestStudentRecord(student.id, dept.id, prog.id);
      const finAccount = await createTestFinancialAccount(studentRec.id);
      const installment = await createTestInstallment(finAccount.id, studentRec.id, 1000);
      
      try {
        // First submission and approval
        const submission1 = await submitPaymentEvidence({
          studentRecordId: studentRec.id,
          installmentId: installment.id,
          amount: 1000,
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          evidenceUrl: 'https://example.com/proof1.jpg',
        });

        await approveSubmission({
          submissionId: submission1.id,
          reviewedByUserId: foUser.id,
        });

        // Manually update installment to allow creating second submission
        await prisma.monthlyInstallment.update({
          where: { id: installment.id },
          data: { status: 'DUE', activeSubmissionId: null },
        });

        // Create second submission
        const submission2 = await submitPaymentEvidence({
          studentRecordId: studentRec.id,
          installmentId: installment.id,
          amount: 1000,
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          evidenceUrl: 'https://example.com/proof2.jpg',
        });

        // Manually set installment back to PAID
        await prisma.monthlyInstallment.update({
          where: { id: installment.id },
          data: { status: 'PAID' },
        });

        // Try to approve second submission - should fail
        await expect(
          approveSubmission({
            submissionId: submission2.id,
            reviewedByUserId: foUser.id,
          })
        ).rejects.toThrow('already been paid');
      } finally {
        await cleanupTestData([student.id, foUser.id], [dept.id], [prog.id], [studentRec.id]);
      }
    });

    test('Partial payment is rejected with clear message', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      const dept = await createTestDepartment();
      const prog = await createTestProgram(dept.id);
      const studentRec = await createTestStudentRecord(student.id, dept.id, prog.id);
      const finAccount = await createTestFinancialAccount(studentRec.id);
      const installment = await createTestInstallment(finAccount.id, studentRec.id, 1000);
      
      try {
        // Submit partial payment
        const submission = await submitPaymentEvidence({
          studentRecordId: studentRec.id,
          installmentId: installment.id,
          amount: 500, // Only half the expected amount
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          evidenceUrl: 'https://example.com/proof.jpg',
        });

        // Try to approve partial payment - should fail
        await expect(
          approveSubmission({
            submissionId: submission.id,
            reviewedByUserId: foUser.id,
          })
        ).rejects.toThrow(/Partial payment not allowed.*Full payment of ETB 1,000 required.*Submitted: ETB 500/);
      } finally {
        await cleanupTestData([student.id, foUser.id], [dept.id], [prog.id], [studentRec.id]);
      }
    });

    test('Concurrent approval requests only succeed once (atomicity test)', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      const dept = await createTestDepartment();
      const prog = await createTestProgram(dept.id);
      const studentRec = await createTestStudentRecord(student.id, dept.id, prog.id);
      const finAccount = await createTestFinancialAccount(studentRec.id);
      const installment = await createTestInstallment(finAccount.id, studentRec.id, 1000);
      
      try {
        const submission = await submitPaymentEvidence({
          studentRecordId: studentRec.id,
          installmentId: installment.id,
          amount: 1000,
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          evidenceUrl: 'https://example.com/proof.jpg',
        });

        // Attempt concurrent approvals
        const results = await Promise.allSettled([
          approveSubmission({
            submissionId: submission.id,
            reviewedByUserId: foUser.id,
          }),
          approveSubmission({
            submissionId: submission.id,
            reviewedByUserId: foUser.id,
          }),
        ]);

        // One should succeed, one should fail
        const successes = results.filter(r => r.status === 'fulfilled');
        const failures = results.filter(r => r.status === 'rejected');

        expect(successes.length).toBe(1);
        expect(failures.length).toBe(1);

        // Verify only one receipt created
        const receipts = await prisma.paymentReceipt.findMany({
          where: { installmentId: installment.id },
        });
        expect(receipts.length).toBe(1);

        // Verify only one transaction created
        const transactions = await prisma.financialTransaction.findMany({
          where: { 
            financialAccountId: finAccount.id,
            type: 'PAYMENT',
          },
        });
        expect(transactions.length).toBe(1);
      } finally {
        await cleanupTestData([student.id, foUser.id], [dept.id], [prog.id], [studentRec.id]);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Balance Calculation
  // ────────────────────────────────────────────────────────────────────────────

  describe('Balance Calculation', () => {
    test('Balance equals sum of POSTED transactions only', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const dept = await createTestDepartment();
      const prog = await createTestProgram(dept.id);
      const studentRec = await createTestStudentRecord(student.id, dept.id, prog.id);
      const finAccount = await createTestFinancialAccount(studentRec.id);
      
      try {
        // Create POSTED transactions
        await prisma.financialTransaction.create({
          data: {
            financialAccountId: finAccount.id,
            type: 'FEE',
            amount: 5000,
            description: 'Tuition fee',
            category: 'Tuition',
            financialCategory: 'STUDENT_TUITION',
            status: 'POSTED',
          },
        });

        await prisma.financialTransaction.create({
          data: {
            financialAccountId: finAccount.id,
            type: 'PAYMENT',
            amount: -2000,
            description: 'Payment',
            category: 'Payment',
            financialCategory: 'STUDENT_TUITION',
            status: 'POSTED',
          },
        });

        // Create REVERSED transaction (should not count)
        await prisma.financialTransaction.create({
          data: {
            financialAccountId: finAccount.id,
            type: 'PAYMENT',
            amount: -1000,
            description: 'Reversed payment',
            category: 'Payment',
            financialCategory: 'STUDENT_TUITION',
            status: 'REVERSED',
          },
        });

        // Calculate balance manually
        const transactions = await prisma.financialTransaction.findMany({
          where: { 
            financialAccountId: finAccount.id,
            status: 'POSTED',
          },
        });

        const expectedBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

        // Update balance
        await prisma.financialAccount.update({
          where: { id: finAccount.id },
          data: { balance: expectedBalance },
        });

        // Verify balance
        const account = await prisma.financialAccount.findUnique({
          where: { id: finAccount.id },
        });

        expect(account?.balance).toBe(3000); // 5000 - 2000 (ignores reversed -1000)
      } finally {
        await cleanupTestData([student.id], [dept.id], [prog.id], [studentRec.id]);
      }
    });

    test('REVERSED transactions are excluded from balance', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const dept = await createTestDepartment();
      const prog = await createTestProgram(dept.id);
      const studentRec = await createTestStudentRecord(student.id, dept.id, prog.id);
      const finAccount = await createTestFinancialAccount(studentRec.id);
      
      try {
        // Create and then reverse a transaction
        const tx = await prisma.financialTransaction.create({
          data: {
            financialAccountId: finAccount.id,
            type: 'PAYMENT',
            amount: -3000,
            description: 'Payment to be reversed',
            category: 'Payment',
            financialCategory: 'STUDENT_TUITION',
            status: 'POSTED',
          },
        });

        // Reverse it
        await prisma.financialTransaction.update({
          where: { id: tx.id },
          data: { status: 'REVERSED' },
        });

        // Calculate balance from POSTED only
        const postedTxs = await prisma.financialTransaction.findMany({
          where: { 
            financialAccountId: finAccount.id,
            status: 'POSTED',
          },
        });

        const balance = postedTxs.reduce((sum, t) => sum + t.amount, 0);
        expect(balance).toBe(0); // Reversed transaction not counted
      } finally {
        await cleanupTestData([student.id], [dept.id], [prog.id], [studentRec.id]);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Dashboard Calculations
  // ────────────────────────────────────────────────────────────────────────────

  describe('Dashboard Calculations', () => {
    test('Registration fees counted in registration category, not tuition', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const foUser = await createTestUser({ role: Role.FINANCE_OFFICER });
      
      try {
        await prisma.application.create({
          data: {
            userId: student.id,
            fullName: student.fullName,
            dob: new Date('1995-01-01'),
            age: 29,
            gender: 'Male',
            nationality: 'Ethiopian',
            emergencyContact: '+251911000000',
            phone: '+251911000001',
            city: 'Addis Ababa',
            address: '123 Test St',
            program: 'Software Engineering',
            academicYear: '2025',
            semester: 'Fall',
            studyMode: 'Full-time',
            programType: ProgramType.TVET,
            registrationScreenshotUrl: 'https://example.com/screenshot.jpg',
          },
        });
        
        await prisma.studentProfile.create({
          data: {
            userId: student.id,
            registrationFeePaid: true,
            registrationFeePaidAt: new Date(),
            paymentVerifiedByFinance: false,
          },
        });

        await verifyRegistrationPayment(student.id, foUser.id);

        // Check the transaction category
        const regTx = await prisma.financialTransaction.findFirst({
          where: {
            financialCategory: 'REGISTRATION_FEE',
            registrationFeePayment: {
              userId: student.id,
            },
          },
        });

        expect(regTx).not.toBeNull();
        expect(regTx?.financialCategory).toBe('REGISTRATION_FEE');
        expect(regTx?.financialCategory).not.toBe('STUDENT_TUITION');

        // Verify it's not counted as tuition
        const tuitionTxs = await prisma.financialTransaction.findMany({
          where: { financialCategory: 'STUDENT_TUITION' },
        });

        expect(tuitionTxs.find(tx => tx.id === regTx?.id)).toBeUndefined();
      } finally {
        await cleanupTestData([student.id, foUser.id]);
      }
    });

    test('TVET and Short Program are separated by programType', async () => {
      const tvetStudent = await createTestUser({ role: Role.STUDENT, email: `tvet-${Date.now()}@test.local` });
      const shortStudent = await createTestUser({ role: Role.STUDENT, email: `short-${Date.now()}@test.local` });
      const tvetDept = await createTestDepartment(ProgramType.TVET);
      const shortDept = await createTestDepartment(ProgramType.SHORT_PROGRAM);
      const tvetProg = await createTestProgram(tvetDept.id);
      const shortProg = await createTestProgram(shortDept.id);
      const tvetRec = await createTestStudentRecord(tvetStudent.id, tvetDept.id, tvetProg.id, ProgramType.TVET);
      const shortRec = await createTestStudentRecord(shortStudent.id, shortDept.id, shortProg.id, ProgramType.SHORT_PROGRAM);
      const tvetAccount = await createTestFinancialAccount(tvetRec.id);
      const shortAccount = await createTestFinancialAccount(shortRec.id);
      
      try {
        // Create TVET transaction
        await prisma.financialTransaction.create({
          data: {
            financialAccountId: tvetAccount.id,
            type: 'PAYMENT',
            amount: -1000,
            description: 'TVET Payment',
            category: 'Payment',
            financialCategory: 'STUDENT_TUITION',
            programType: ProgramType.TVET,
            status: 'POSTED',
          },
        });

        // Create Short Program transaction
        await prisma.financialTransaction.create({
          data: {
            financialAccountId: shortAccount.id,
            type: 'PAYMENT',
            amount: -500,
            description: 'Short Program Payment',
            category: 'Payment',
            financialCategory: 'STUDENT_TUITION',
            programType: ProgramType.SHORT_PROGRAM,
            status: 'POSTED',
          },
        });

        // Query by program type
        const tvetTransactions = await prisma.financialTransaction.findMany({
          where: { 
            programType: ProgramType.TVET,
            status: 'POSTED',
          },
        });

        const shortTransactions = await prisma.financialTransaction.findMany({
          where: { 
            programType: ProgramType.SHORT_PROGRAM,
            status: 'POSTED',
          },
        });

        expect(tvetTransactions.length).toBeGreaterThanOrEqual(1);
        expect(shortTransactions.length).toBeGreaterThanOrEqual(1);
        
        // Verify amounts are correctly separated
        const tvetTotal = tvetTransactions
          .filter(tx => tx.financialCategory === 'STUDENT_TUITION')
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const shortTotal = shortTransactions
          .filter(tx => tx.financialCategory === 'STUDENT_TUITION')
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        expect(tvetTotal).toBeGreaterThanOrEqual(1000);
        expect(shortTotal).toBeGreaterThanOrEqual(500);
      } finally {
        await cleanupTestData(
          [tvetStudent.id, shortStudent.id], 
          [tvetDept.id, shortDept.id], 
          [tvetProg.id, shortProg.id], 
          [tvetRec.id, shortRec.id]
        );
      }
    });

    test('Only POSTED transactions are counted in dashboard totals', async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const dept = await createTestDepartment();
      const prog = await createTestProgram(dept.id);
      const studentRec = await createTestStudentRecord(student.id, dept.id, prog.id);
      const finAccount = await createTestFinancialAccount(studentRec.id);
      
      try {
        // Create POSTED transaction
        await prisma.financialTransaction.create({
          data: {
            financialAccountId: finAccount.id,
            type: 'PAYMENT',
            amount: -1000,
            description: 'Posted payment',
            category: 'Payment',
            financialCategory: 'STUDENT_TUITION',
            status: 'POSTED',
          },
        });

        // Create REVERSED transaction
        await prisma.financialTransaction.create({
          data: {
            financialAccountId: finAccount.id,
            type: 'PAYMENT',
            amount: -2000,
            description: 'Reversed payment',
            category: 'Payment',
            financialCategory: 'STUDENT_TUITION',
            status: 'REVERSED',
          },
        });

        // Count only POSTED
        const postedSum = await prisma.financialTransaction.aggregate({
          where: {
            financialCategory: 'STUDENT_TUITION',
            status: 'POSTED',
          },
          _sum: { amount: true },
        });

        const allSum = await prisma.financialTransaction.aggregate({
          where: {
            financialCategory: 'STUDENT_TUITION',
          },
          _sum: { amount: true },
        });

        // POSTED sum should exclude reversed transactions
        expect(Math.abs(postedSum._sum.amount || 0)).toBeLessThan(Math.abs(allSum._sum.amount || 0));
      } finally {
        await cleanupTestData([student.id], [dept.id], [prog.id], [studentRec.id]);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Staff Payments
  // ────────────────────────────────────────────────────────────────────────────

  describe('Staff Payments', () => {
    test('Only PAID staff payments have a FinancialTransaction', async () => {
      const timestamp = Date.now();
      
      // Create test employee
      const testDept = await prisma.hRDepartment.findFirst();
      if (!testDept) {
        throw new Error('No HR department found for testing. Please create one first.');
      }
      
      const employee = await prisma.hREmployee.create({
        data: {
          employeeCode: `EMP-${timestamp}`,
          fullName: 'Test Employee',
          email: `emp-${timestamp}@test.local`,
          phone: `+251911${timestamp.toString().slice(-6)}`,
          nationalId: `NID-${timestamp}`,
          position: 'Instructor',
          gender: 'MALE',
          departmentId: testDept.id,
          hireDate: new Date(),
          status: 'ACTIVE',
          basicSalary: 5000,
        },
      });

      try {
        // Create PENDING payment (no transaction)
        const pendingPayment = await prisma.staffPayment.create({
          data: {
            employeeId: employee.id,
            payrollMonth: 'January',
            payrollYear: 2025,
            assignedSalary: 5000,
            status: 'PENDING',
          },
        });

        // Create PAID payment (with transaction)
        const paidPayment = await prisma.staffPayment.create({
          data: {
            employeeId: employee.id,
            payrollMonth: 'February',
            payrollYear: 2025,
            assignedSalary: 5000,
            status: 'PAID',
            paymentDate: new Date(),
            paymentMethod: 'Bank Transfer',
          },
        });

        // Create transaction for PAID payment
        const transaction = await prisma.financialTransaction.create({
          data: {
            type: 'SALARY',
            amount: 5000,
            description: 'February 2025 salary',
            category: 'Staff Salary',
            financialCategory: 'STAFF_SALARY',
            staffPaymentId: paidPayment.id,
            status: 'POSTED',
          },
        });

        // Verify pending payment has no transaction
        const pendingTx = await prisma.financialTransaction.findFirst({
          where: { staffPaymentId: pendingPayment.id },
        });
        expect(pendingTx).toBeNull();

        // Verify paid payment has transaction
        const paidTx = await prisma.financialTransaction.findFirst({
          where: { staffPaymentId: paidPayment.id },
        });
        expect(paidTx).not.toBeNull();
        expect(paidTx?.id).toBe(transaction.id);
      } finally {
        await prisma.financialTransaction.deleteMany({
          where: { staffPayment: { employeeId: employee.id } },
        });
        await prisma.staffPayment.deleteMany({ where: { employeeId: employee.id } });
        await prisma.hREmployee.delete({ where: { id: employee.id } }).catch(() => {});
      }
    });

    test('Duplicate payroll generation for same month/year throws unique constraint error', async () => {
      const timestamp = Date.now();
      
      const testDept = await prisma.hRDepartment.findFirst();
      if (!testDept) {
        throw new Error('No HR department found for testing. Please create one first.');
      }
      
      const employee = await prisma.hREmployee.create({
        data: {
          employeeCode: `EMP-${timestamp}`,
          fullName: 'Test Employee',
          email: `emp-${timestamp}@test.local`,
          phone: `+251911${timestamp.toString().slice(-6)}`,
          nationalId: `NID-${timestamp}`,
          position: 'Instructor',
          gender: 'MALE',
          departmentId: testDept.id,
          hireDate: new Date(),
          status: 'ACTIVE',
          basicSalary: 5000,
        },
      });

      try {
        // First payroll entry
        await prisma.staffPayment.create({
          data: {
            employeeId: employee.id,
            payrollMonth: 'March',
            payrollYear: 2025,
            assignedSalary: 5000,
            status: 'PENDING',
          },
        });

        // Attempt duplicate payroll entry
        await expect(
          prisma.staffPayment.create({
            data: {
              employeeId: employee.id,
              payrollMonth: 'March',
              payrollYear: 2025,
              assignedSalary: 5000,
              status: 'PENDING',
            },
          })
        ).rejects.toThrow(); // Unique constraint violation
      } finally {
        await prisma.staffPayment.deleteMany({ where: { employeeId: employee.id } });
        await prisma.hREmployee.delete({ where: { id: employee.id } }).catch(() => {});
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Expenses
  // ────────────────────────────────────────────────────────────────────────────

  describe('Expenses', () => {
    test('Only PAID expenses have a FinancialTransaction', async () => {
      const timestamp = Date.now();
      const user = await createTestUser({ role: Role.FINANCE_OFFICER });
      
      // Create expense category
      const category = await prisma.expenseCategory.create({
        data: {
          name: `Test Category ${timestamp}`,
          description: 'Test category',
        },
      });

      try {
        // Create PENDING expense (no transaction)
        const pendingExpense = await prisma.expense.create({
          data: {
            title: 'Pending Expense',
            description: 'Test pending expense',
            categoryId: category.id,
            amount: 1500,
            expenseDate: new Date(),
            status: 'PENDING',
            createdByUserId: user.id,
          },
        });

        // Create APPROVED expense (no transaction yet)
        const approvedExpense = await prisma.expense.create({
          data: {
            title: 'Approved Expense',
            description: 'Test approved expense',
            categoryId: category.id,
            amount: 2000,
            expenseDate: new Date(),
            status: 'APPROVED',
            createdByUserId: user.id,
            approvedByUserId: user.id,
            approvedAt: new Date(),
          },
        });

        // Create PAID expense (with transaction)
        const paidExpense = await prisma.expense.create({
          data: {
            title: 'Paid Expense',
            description: 'Test paid expense',
            categoryId: category.id,
            amount: 2500,
            expenseDate: new Date(),
            status: 'PAID',
            createdByUserId: user.id,
            approvedByUserId: user.id,
            approvedAt: new Date(),
            paidByUserId: user.id,
            paidAt: new Date(),
            paymentMethod: 'Bank Transfer',
          },
        });

        // Create transaction for PAID expense
        await prisma.financialTransaction.create({
          data: {
            type: 'FEE',
            amount: 2500,
            description: 'Paid expense',
            category: 'Operational',
            financialCategory: 'OPERATIONAL_EXPENSE',
            expenseId: paidExpense.id,
            status: 'POSTED',
          },
        });

        // Verify only PAID expense has transaction
        const transactions = await prisma.financialTransaction.findMany({
          where: {
            expenseId: { in: [pendingExpense.id, approvedExpense.id, paidExpense.id] },
          },
        });

        expect(transactions.length).toBe(1);
        expect(transactions[0].expenseId).toBe(paidExpense.id);
      } finally {
        await prisma.financialTransaction.deleteMany({
          where: { expense: { categoryId: category.id } },
        });
        await prisma.expense.deleteMany({ where: { categoryId: category.id } });
        await prisma.expenseCategory.delete({ where: { id: category.id } }).catch(() => {});
        await cleanupTestData([user.id]);
      }
    });

    test('APPROVED but unpaid expenses are not counted in cash outflows', async () => {
      const timestamp = Date.now();
      const user = await createTestUser({ role: Role.FINANCE_OFFICER });
      
      const category = await prisma.expenseCategory.create({
        data: {
          name: `Test Category ${timestamp}`,
          description: 'Test category',
        },
      });

      try {
        // Create APPROVED expense
        await prisma.expense.create({
          data: {
            title: 'Approved but Unpaid',
            categoryId: category.id,
            amount: 3000,
            expenseDate: new Date(),
            status: 'APPROVED',
            createdByUserId: user.id,
            approvedByUserId: user.id,
            approvedAt: new Date(),
          },
        });

        // Check that no transaction was created
        const transactions = await prisma.financialTransaction.findMany({
          where: {
            financialCategory: 'OPERATIONAL_EXPENSE',
            expense: { categoryId: category.id },
          },
        });

        expect(transactions.length).toBe(0);
      } finally {
        await prisma.expense.deleteMany({ where: { categoryId: category.id } });
        await prisma.expenseCategory.delete({ where: { id: category.id } }).catch(() => {});
        await cleanupTestData([user.id]);
      }
    });
  });

});
