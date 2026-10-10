-- CreateTable
CREATE TABLE "SchoolMemberExclusion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "studentId" TEXT,
    "rolesSnapshot" "SchoolRole"[],
    "reason" TEXT,
    "excludedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excludedByUserId" TEXT,
    "reinvitedAt" TIMESTAMP(3),
    "reinvitedByUserId" TEXT,

    CONSTRAINT "SchoolMemberExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolMemberExclusion_schoolId_reinvitedAt_idx" ON "SchoolMemberExclusion"("schoolId", "reinvitedAt");

-- CreateIndex
CREATE INDEX "SchoolMemberExclusion_userId_idx" ON "SchoolMemberExclusion"("userId");

-- CreateIndex
CREATE INDEX "SchoolMemberExclusion_studentId_idx" ON "SchoolMemberExclusion"("studentId");

-- AddForeignKey
ALTER TABLE "SchoolMemberExclusion" ADD CONSTRAINT "SchoolMemberExclusion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMemberExclusion" ADD CONSTRAINT "SchoolMemberExclusion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMemberExclusion" ADD CONSTRAINT "SchoolMemberExclusion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
