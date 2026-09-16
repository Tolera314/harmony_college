-- HREmployee: add faydaIdUrl, certificateUrl, systemRole, courseId fields

ALTER TABLE "HREmployee"
  ADD COLUMN "faydaIdUrl"           TEXT,
  ADD COLUMN "faydaIdFileSize"      TEXT,
  ADD COLUMN "certificateUrl"       TEXT,
  ADD COLUMN "certificateFileSize"  TEXT,
  ADD COLUMN "systemRole"           TEXT,
  ADD COLUMN "courseId"             TEXT;

CREATE INDEX "HREmployee_systemRole_idx" ON "HREmployee"("systemRole");
