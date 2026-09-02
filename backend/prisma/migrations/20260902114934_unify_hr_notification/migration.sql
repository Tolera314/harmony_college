-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Unify HRNotification into the Notification table
--
-- Steps (all in one transaction-safe sequence):
--   1. Add `module` column to Notification (non-destructive, default = 'ACADEMIC')
--   2. Add `(userId, module)` composite index on Notification
--   3. Migrate every row from HRNotification → Notification
--        module     = 'HR'
--        userId     = recipientUserId
--        entityType = 'HREmployee'
--        entityId   = employeeId (nullable)
--        actionTab  = tab
--        type       = type  (LEAVE / PAYROLL / etc.)
--   4. Drop the HRNotification table
--   5. Drop the HRNotifType enum
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add module column (safe: has a default, existing rows become 'ACADEMIC')
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "module" TEXT NOT NULL DEFAULT 'ACADEMIC';

-- 2. Composite index for per-module inbox queries (e.g. WHERE userId=? AND module='HR')
CREATE INDEX IF NOT EXISTS "Notification_userId_module_idx"
  ON "Notification" ("userId", "module");

-- 3. Migrate HRNotification rows → Notification
--    Only runs if the source table still exists (idempotent guard)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'HRNotification'
  ) THEN
    INSERT INTO "Notification" (
      "id",
      "userId",
      "title",
      "message",
      "type",
      "module",
      "isRead",
      "entityType",
      "entityId",
      "actionTab",
      "pushedAt",
      "createdAt"
    )
    SELECT
      "id",
      "recipientUserId",          -- maps to userId
      "title",
      "message",
      "type"::TEXT,               -- cast from enum to text
      'HR',                       -- module namespace
      "isRead",
      'HREmployee',               -- entityType
      "employeeId",               -- entityId (nullable)
      "tab",                      -- actionTab
      NULL,                       -- pushedAt (historical rows were not socket-pushed)
      "createdAt"
    FROM "HRNotification"
    ON CONFLICT ("id") DO NOTHING; -- safe re-run: skip already-migrated rows

    -- 4. Drop HRNotification table (rows safely copied above)
    DROP TABLE "HRNotification";
  END IF;
END;
$$;

-- 5. Drop the HRNotifType enum (no longer referenced by any model)
DROP TYPE IF EXISTS "HRNotifType";
