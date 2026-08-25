-- CreateTable
CREATE TABLE "WondeConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wondeSchoolId" TEXT,
    "apiTokenEncrypted" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WondeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WondeConnection_tenantId_key" ON "WondeConnection"("tenantId");

-- AddForeignKey
ALTER TABLE "WondeConnection" ADD CONSTRAINT "WondeConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
