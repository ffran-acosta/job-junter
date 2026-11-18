-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "cvVariant" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "analysis" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "recruiterMessage" TEXT NOT NULL,
    "formAnswers" TEXT NOT NULL,
    "additions" TEXT NOT NULL DEFAULT '{}',
    "linkedinUrl" TEXT,
    "appliedAt" DATETIME,
    "followUpAt" DATETIME,
    "interviewAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("analysis", "appliedAt", "company", "coverLetter", "createdAt", "cvVariant", "description", "followUpAt", "formAnswers", "id", "jobId", "matchScore", "notes", "recruiterMessage", "source", "status", "title", "updatedAt", "url") SELECT "analysis", "appliedAt", "company", "coverLetter", "createdAt", "cvVariant", "description", "followUpAt", "formAnswers", "id", "jobId", "matchScore", "notes", "recruiterMessage", "source", "status", "title", "updatedAt", "url" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE UNIQUE INDEX "Application_jobId_key" ON "Application"("jobId");
CREATE INDEX "Application_status_followUpAt_idx" ON "Application"("status", "followUpAt");
CREATE INDEX "Application_deletedAt_updatedAt_idx" ON "Application"("deletedAt", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
