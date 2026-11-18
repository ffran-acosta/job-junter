-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "salary" TEXT,
    "postedAt" DATETIME,
    "score" INTEGER NOT NULL,
    "seniority" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "matched" TEXT NOT NULL,
    "warnings" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Job" ("company", "createdAt", "description", "externalId", "id", "location", "matched", "postedAt", "salary", "score", "source", "status", "tags", "title", "url", "warnings") SELECT "company", "createdAt", "description", "externalId", "id", "location", "matched", "postedAt", "salary", "score", "source", "status", "tags", "title", "url", "warnings" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE INDEX "Job_status_score_idx" ON "Job"("status", "score");
CREATE INDEX "Job_status_postedAt_idx" ON "Job"("status", "postedAt");
CREATE UNIQUE INDEX "Job_source_externalId_key" ON "Job"("source", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
