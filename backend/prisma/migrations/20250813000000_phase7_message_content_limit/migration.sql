-- Phase 7 M3: enforce content length on Message
ALTER TABLE "Message" ALTER COLUMN "content" TYPE VARCHAR(4000);
