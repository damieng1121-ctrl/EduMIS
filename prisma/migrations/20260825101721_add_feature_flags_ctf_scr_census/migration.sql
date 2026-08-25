-- CreateEnum
CREATE TYPE "ExclusionType" AS ENUM ('FIXED_TERM', 'PERMANENT');

-- CreateEnum
CREATE TYPE "CtfDirection" AS ENUM ('EXPORT', 'IMPORT');

-- AlterTable
ALTER TABLE "Pupil" ADD COLUMN     "eyfsProfileData" JSONB,
ADD COLUMN     "formerUpn" TEXT,
ADD COLUMN     "middleNames" TEXT,
ADD COLUMN     "nationality" TEXT;

-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "barredListCheckDate" TIMESTAMP(3),
ADD COLUMN     "identityCheckDate" TIMESTAMP(3),
ADD COLUMN     "overseasCheckDate" TIMESTAMP(3),
ADD COLUMN     "prohibitionCheckDate" TIMESTAMP(3),
ADD COLUMN     "qualificationsCheckedDate" TIMESTAMP(3),
ADD COLUMN     "referencesObtainedDate" TIMESTAMP(3),
ADD COLUMN     "rightToWorkCheckDate" TIMESTAMP(3),
ADD COLUMN     "rightToWorkEvidence" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "enabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Exclusion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pupilId" TEXT NOT NULL,
    "type" "ExclusionType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "sessionsLost" INTEGER,
    "reason" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CtfExchange" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "CtfDirection" NOT NULL,
    "pupilName" TEXT NOT NULL,
    "upn" TEXT,
    "fileName" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CtfExchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exclusion_tenantId_pupilId_idx" ON "Exclusion"("tenantId", "pupilId");

-- CreateIndex
CREATE INDEX "Exclusion_tenantId_startDate_idx" ON "Exclusion"("tenantId", "startDate");

-- CreateIndex
CREATE INDEX "CtfExchange_tenantId_createdAt_idx" ON "CtfExchange"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "Exclusion" ADD CONSTRAINT "Exclusion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exclusion" ADD CONSTRAINT "Exclusion_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exclusion" ADD CONSTRAINT "Exclusion_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtfExchange" ADD CONSTRAINT "CtfExchange_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtfExchange" ADD CONSTRAINT "CtfExchange_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
