-- Migration: real-time timetable & attendance improvements
-- 1. Add RoomType enum and column on Room
-- 2. Add TimetableSlotStatus enum and column on TimetableSlot
-- 3. Add openBeforeMinutes on AttendanceSession

CREATE TYPE "RoomType" AS ENUM ('CLASSROOM', 'LAB', 'LECTURE_HALL', 'EXAM_HALL', 'SEMINAR_ROOM');
CREATE TYPE "TimetableSlotStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

ALTER TABLE "Room"
  ADD COLUMN "roomType" "RoomType" NOT NULL DEFAULT 'CLASSROOM';

CREATE INDEX "Room_roomType_idx" ON "Room"("roomType");

ALTER TABLE "TimetableSlot"
  ADD COLUMN "status" "TimetableSlotStatus" NOT NULL DEFAULT 'PUBLISHED';

CREATE INDEX "TimetableSlot_status_idx" ON "TimetableSlot"("status");

ALTER TABLE "AttendanceSession"
  ADD COLUMN "openBeforeMinutes" INTEGER NOT NULL DEFAULT 15;
