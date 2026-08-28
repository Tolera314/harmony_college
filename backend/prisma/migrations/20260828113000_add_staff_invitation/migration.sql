-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_INVITATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_INVITATION_RESENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_INVITATION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_INVITATION_ACCEPTED';

-- CreateTable
CREATE TABLE IF NOT EXISTS "StaffInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "positionTitle" TEXT,
    "employeeId" TEXT,
    "phone" TEXT,
    "specialization" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StaffInvitation_acceptedByUserId_key" ON "StaffInvitation"("acceptedByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffInvitation_email_idx" ON "StaffInvitation"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffInvitation_tokenHash_idx" ON "StaffInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffInvitation_expiresAt_idx" ON "StaffInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffInvitation_role_idx" ON "StaffInvitation"("role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffInvitation_departmentId_idx" ON "StaffInvitation"("departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffInvitation_invitedByUserId_idx" ON "StaffInvitation"("invitedByUserId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaffInvitation_departmentId_fkey') THEN
        ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaffInvitation_invitedByUserId_fkey') THEN
        ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaffInvitation_acceptedByUserId_fkey') THEN
        ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
