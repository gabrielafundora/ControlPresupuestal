-- Migration: Budget restructure
-- Remove versioning from Budget, add approvedAmount to BudgetLineItem, add BudgetAdjustment

-- Step 1: Add approvedAmount to BudgetLineItem (copy from totalAmount)
ALTER TABLE "BudgetLineItem" ADD COLUMN "approvedAmount" REAL NOT NULL DEFAULT 0;
UPDATE "BudgetLineItem" SET "approvedAmount" = "totalAmount";

-- Step 2: Create BudgetAdjustment table
CREATE TABLE "BudgetAdjustment" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "lineItemId"  TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "amount"      REAL NOT NULL,
    "groupId"     TEXT,
    "description" TEXT NOT NULL,
    "approvedAt"  DATETIME,
    "approvedBy"  TEXT,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   DATETIME NOT NULL,
    CONSTRAINT "BudgetAdjustment_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "BudgetLineItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 3: Recreate Budget table without version/isActive/label
-- (SQLite doesn't support DROP COLUMN directly on old versions, so recreate)
CREATE TABLE "Budget_new" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "projectId"   TEXT NOT NULL,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "notes"       TEXT,
    "approvedAt"  DATETIME,
    "approvedBy"  TEXT,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   DATETIME NOT NULL,
    CONSTRAINT "Budget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data: keep only the active budget per project (or first if none active)
INSERT INTO "Budget_new" ("id", "projectId", "totalAmount", "notes", "approvedAt", "approvedBy", "createdAt", "updatedAt")
SELECT b."id", b."projectId", b."totalAmount", b."notes", b."approvedAt", b."approvedBy", b."createdAt", b."updatedAt"
FROM "Budget" b
WHERE b."isActive" = 1
   OR b."id" IN (
       SELECT MIN("id") FROM "Budget" b2
       WHERE b2."projectId" NOT IN (SELECT "projectId" FROM "Budget" WHERE "isActive" = 1)
       GROUP BY b2."projectId"
   );

DROP TABLE "Budget";
ALTER TABLE "Budget_new" RENAME TO "Budget";

-- Unique index for Budget.projectId
CREATE UNIQUE INDEX "Budget_projectId_key" ON "Budget"("projectId");

-- Step 4: Update Payment default status to 'approved'
-- (existing draft/submitted payments get approved too since we're dropping the workflow)
UPDATE "Payment" SET "status" = 'approved' WHERE "status" IN ('draft', 'submitted', 'rejected');
