-- ─────────────────────────────────────────────────────────────────────────────
-- Internal Messaging System — Schema Migration (fixed)
-- Uses DO $$ ... $$ blocks for all conditional DDL to avoid PostgreSQL
-- syntax errors with IF NOT EXISTS on enum-typed columns and constraints.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create new enums (idempotent)
DO $$ BEGIN
  CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'DEPARTMENT', 'OFFICIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MessagePriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend Conversation table (each column guarded individually)
DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "type" "ConversationType" NOT NULL DEFAULT 'DIRECT';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "description" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "createdById" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "departmentId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "requiresAck" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "expiresAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "lastMessageAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Migrate existing isGroup rows → type
UPDATE "Conversation" SET "type" = 'GROUP' WHERE "isGroup" = true AND "type" = 'DIRECT';

-- 3. Extend ConversationParticipant table
DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD COLUMN "participantRole" TEXT NOT NULL DEFAULT 'MEMBER';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD COLUMN "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD COLUMN "leftAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD COLUMN "lastReadMessageId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD COLUMN "isMuted" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConversationParticipant" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 4. Extend Message table
DO $$ BEGIN
  ALTER TABLE "Message" ADD COLUMN "messageType" TEXT NOT NULL DEFAULT 'TEXT';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'SENT';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD COLUMN "editedById" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD COLUMN "deletedById" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Widen content column from VarChar(4000) to Text
ALTER TABLE "Message" ALTER COLUMN "content" TYPE TEXT;

-- Self-referential reply FK (idempotent)
DO $$ BEGIN
  ALTER TABLE "Message"
    ADD CONSTRAINT "Message_replyToId_fkey"
    FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Create MessageAttachment table
CREATE TABLE IF NOT EXISTS "MessageAttachment" (
  "id"               TEXT         NOT NULL,
  "messageId"        TEXT         NOT NULL,
  "originalFileName" TEXT         NOT NULL,
  "storedFileName"   TEXT         NOT NULL,
  "mimeType"         TEXT         NOT NULL,
  "fileSize"         INTEGER      NOT NULL,
  "storagePath"      TEXT         NOT NULL,
  "uploadedAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "MessageAttachment_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "MessageAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE
);

-- 6. Create MessageAcknowledgment table
CREATE TABLE IF NOT EXISTS "MessageAcknowledgment" (
  "id"             TEXT         NOT NULL,
  "messageId"      TEXT         NOT NULL,
  "userId"         TEXT         NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "MessageAcknowledgment_pkey"               PRIMARY KEY ("id"),
  CONSTRAINT "MessageAcknowledgment_messageId_userId_key" UNIQUE ("messageId", "userId")
);

-- 7. Indexes (all idempotent with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "Conversation_type_idx"          ON "Conversation"("type");
CREATE INDEX IF NOT EXISTS "Conversation_departmentId_idx"  ON "Conversation"("departmentId");
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "Conversation_isActive_idx"      ON "Conversation"("isActive");

CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_idx"
  ON "ConversationParticipant"("userId");
CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_isArchived_idx"
  ON "ConversationParticipant"("userId", "isArchived");

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx"
  ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx"
  ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "Message_conversationId_isDeleted_idx"
  ON "Message"("conversationId", "isDeleted");

CREATE INDEX IF NOT EXISTS "MessageAttachment_messageId_idx"
  ON "MessageAttachment"("messageId");

CREATE INDEX IF NOT EXISTS "MessageAcknowledgment_messageId_idx"
  ON "MessageAcknowledgment"("messageId");
CREATE INDEX IF NOT EXISTS "MessageAcknowledgment_userId_idx"
  ON "MessageAcknowledgment"("userId");

-- Notification module migration (from 20260901133905) — also idempotent
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN "actionTab" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN "pushedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN "module" TEXT NOT NULL DEFAULT 'ACADEMIC';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"
  ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_userId_module_idx"
  ON "Notification"("userId", "module");
