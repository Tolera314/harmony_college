-- ─────────────────────────────────────────────────────────────────────────────
-- Internal Messaging System — Schema Migration
-- Extends the existing Conversation / ConversationParticipant / Message models
-- and adds MessageAttachment + MessageAcknowledgment tables.
-- All ALTER TABLE steps use IF NOT EXISTS / IF EXISTS guards for safety.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create new enums
DO $$ BEGIN
  CREATE TYPE "ConversationType"  AS ENUM ('DIRECT', 'GROUP', 'DEPARTMENT', 'OFFICIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MessageStatus"   AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MessagePriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend Conversation table
ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "type"          "ConversationType" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS "description"   TEXT,
  ADD COLUMN IF NOT EXISTS "createdById"   TEXT,
  ADD COLUMN IF NOT EXISTS "departmentId"  TEXT,
  ADD COLUMN IF NOT EXISTS "priority"      "MessagePriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "requiresAck"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "expiresAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isActive"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Migrate existing rows: isGroup=true → GROUP, isGroup=false → DIRECT
UPDATE "Conversation" SET "type" = 'GROUP'  WHERE "isGroup" = true  AND "type" = 'DIRECT';
-- (false rows are already DIRECT by default)

-- 3. Extend ConversationParticipant table
ALTER TABLE "ConversationParticipant"
  ADD COLUMN IF NOT EXISTS "participantRole"   TEXT NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN IF NOT EXISTS "joinedAt"          TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "leftAt"            TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastReadMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "isMuted"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isPinned"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isArchived"        BOOLEAN NOT NULL DEFAULT false;

-- 4. Extend Message table
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "messageType" TEXT        NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS "status"      "MessageStatus" NOT NULL DEFAULT 'SENT',
  ADD COLUMN IF NOT EXISTS "replyToId"   TEXT,
  ADD COLUMN IF NOT EXISTS "editedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "editedById"  TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT,
  ADD COLUMN IF NOT EXISTS "isDeleted"   BOOLEAN NOT NULL DEFAULT false;

-- Widen content column from VarChar(4000) to Text
ALTER TABLE "Message" ALTER COLUMN "content" TYPE TEXT;

-- Self-referential reply FK (only if not already present)
ALTER TABLE "Message"
  ADD CONSTRAINT IF NOT EXISTS "Message_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL;

-- 5. Create MessageAttachment table
CREATE TABLE IF NOT EXISTS "MessageAttachment" (
  "id"               TEXT        NOT NULL,
  "messageId"        TEXT        NOT NULL,
  "originalFileName" TEXT        NOT NULL,
  "storedFileName"   TEXT        NOT NULL,
  "mimeType"         TEXT        NOT NULL,
  "fileSize"         INTEGER     NOT NULL,
  "storagePath"      TEXT        NOT NULL,
  "uploadedAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MessageAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE
);

-- 6. Create MessageAcknowledgment table
CREATE TABLE IF NOT EXISTS "MessageAcknowledgment" (
  "id"             TEXT        NOT NULL,
  "messageId"      TEXT        NOT NULL,
  "userId"         TEXT        NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "MessageAcknowledgment_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "MessageAcknowledgment_messageId_userId_key" UNIQUE ("messageId", "userId")
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS "Conversation_type_idx"         ON "Conversation"("type");
CREATE INDEX IF NOT EXISTS "Conversation_departmentId_idx" ON "Conversation"("departmentId");
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "Conversation_isActive_idx"      ON "Conversation"("isActive");

CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_idx"            ON "ConversationParticipant"("userId");
CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_isArchived_idx" ON "ConversationParticipant"("userId", "isArchived");

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx"                 ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "Message_conversationId_isDeleted_idx" ON "Message"("conversationId", "isDeleted");

CREATE INDEX IF NOT EXISTS "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

CREATE INDEX IF NOT EXISTS "MessageAcknowledgment_messageId_idx" ON "MessageAcknowledgment"("messageId");
CREATE INDEX IF NOT EXISTS "MessageAcknowledgment_userId_idx"    ON "MessageAcknowledgment"("userId");
