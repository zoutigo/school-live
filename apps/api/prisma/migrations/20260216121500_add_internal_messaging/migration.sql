DO $$
BEGIN
  CREATE TYPE "InternalMessageStatus" AS ENUM ('DRAFT', 'SENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "InternalMessage" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "status" "InternalMessageStatus" NOT NULL DEFAULT 'SENT',
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "senderArchivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternalMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InternalMessageRecipient" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InternalMessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InternalMessageRecipient_messageId_recipientUserId_key"
  ON "InternalMessageRecipient"("messageId", "recipientUserId");

CREATE INDEX IF NOT EXISTS "InternalMessage_schoolId_idx"
  ON "InternalMessage"("schoolId");
CREATE INDEX IF NOT EXISTS "InternalMessage_senderUserId_idx"
  ON "InternalMessage"("senderUserId");
CREATE INDEX IF NOT EXISTS "InternalMessage_status_idx"
  ON "InternalMessage"("status");
CREATE INDEX IF NOT EXISTS "InternalMessage_sentAt_idx"
  ON "InternalMessage"("sentAt");
CREATE INDEX IF NOT EXISTS "InternalMessage_createdAt_idx"
  ON "InternalMessage"("createdAt");

CREATE INDEX IF NOT EXISTS "InternalMessageRecipient_schoolId_idx"
  ON "InternalMessageRecipient"("schoolId");
CREATE INDEX IF NOT EXISTS "InternalMessageRecipient_recipientUserId_idx"
  ON "InternalMessageRecipient"("recipientUserId");
CREATE INDEX IF NOT EXISTS "InternalMessageRecipient_archivedAt_idx"
  ON "InternalMessageRecipient"("archivedAt");
CREATE INDEX IF NOT EXISTS "InternalMessageRecipient_readAt_idx"
  ON "InternalMessageRecipient"("readAt");
CREATE INDEX IF NOT EXISTS "InternalMessageRecipient_deletedAt_idx"
  ON "InternalMessageRecipient"("deletedAt");

DO $$
BEGIN
  ALTER TABLE "InternalMessage"
    ADD CONSTRAINT "InternalMessage_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "InternalMessage"
    ADD CONSTRAINT "InternalMessage_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "InternalMessageRecipient"
    ADD CONSTRAINT "InternalMessageRecipient_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "InternalMessage"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "InternalMessageRecipient"
    ADD CONSTRAINT "InternalMessageRecipient_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "InternalMessageRecipient"
    ADD CONSTRAINT "InternalMessageRecipient_recipientUserId_fkey"
    FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
