-- Add actionTab and pushedAt columns to Notification
-- actionTab: optional dashboard tab deep-link (e.g. "grades", "leave")
-- pushedAt:  timestamp of last real-time socket push attempt (null = not pushed yet)

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "actionTab"  TEXT,
  ADD COLUMN IF NOT EXISTS "pushedAt"   TIMESTAMP(3);

-- Composite index for the most common query pattern: fetch unread by userId
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"
  ON "Notification" ("userId", "isRead");
