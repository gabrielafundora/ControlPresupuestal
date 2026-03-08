-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "estimateNumber" INTEGER NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "percentComplete" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "invoiceNumber" TEXT,
    "invoiceDate" DATETIME,
    "paidAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "contractId", "createdAt", "estimateNumber", "id", "invoiceDate", "invoiceNumber", "notes", "paidAt", "percentComplete", "periodEnd", "periodStart", "status", "submittedById", "updatedAt") SELECT "amount", "contractId", "createdAt", "estimateNumber", "id", "invoiceDate", "invoiceNumber", "notes", "paidAt", "percentComplete", "periodEnd", "periodStart", "status", "submittedById", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_contractId_estimateNumber_key" ON "Payment"("contractId", "estimateNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
