-- CreateTable
CREATE TABLE "InternalMessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalMessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalMessageAttachment_messageId_idx" ON "InternalMessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "InternalMessageAttachment_schoolId_idx" ON "InternalMessageAttachment"("schoolId");

-- CreateIndex
CREATE INDEX "InternalMessageAttachment_createdAt_idx" ON "InternalMessageAttachment"("createdAt");

-- AddForeignKey
ALTER TABLE "InternalMessageAttachment" ADD CONSTRAINT "InternalMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InternalMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalMessageAttachment" ADD CONSTRAINT "InternalMessageAttachment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
