-- CreateEnum
CREATE TYPE "AbsenceReason" AS ENUM ('ILLNESS', 'MEDICAL_APPOINTMENT', 'RELIGIOUS_OBSERVANCE', 'OTHER');

-- CreateTable
CREATE TABLE "AbsenceReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pupilId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" "AbsenceReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbsenceReport_tenantId_pupilId_startDate_idx" ON "AbsenceReport"("tenantId", "pupilId", "startDate");

-- AddForeignKey
ALTER TABLE "AbsenceReport" ADD CONSTRAINT "AbsenceReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceReport" ADD CONSTRAINT "AbsenceReport_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceReport" ADD CONSTRAINT "AbsenceReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
