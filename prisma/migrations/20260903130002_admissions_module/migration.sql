-- CreateEnum
CREATE TYPE "AdmissionApplicationType" AS ENUM ('NORMAL_ROUND', 'IN_YEAR');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('RECEIVED', 'OFFERED', 'WAITING_LIST', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "preferredYearGroup" "YearGroup" NOT NULL,
    "applicationType" "AdmissionApplicationType" NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'RECEIVED',
    "waitingListPosition" INTEGER,
    "guardianName" TEXT NOT NULL,
    "guardianEmail" TEXT,
    "guardianPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdmissionApplication_tenantId_status_idx" ON "AdmissionApplication"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AdmissionApplication_tenantId_preferredYearGroup_waitingLis_idx" ON "AdmissionApplication"("tenantId", "preferredYearGroup", "waitingListPosition");

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
