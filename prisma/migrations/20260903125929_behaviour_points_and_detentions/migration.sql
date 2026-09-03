-- CreateEnum
CREATE TYPE "PointsCategory" AS ENUM ('ACHIEVEMENT', 'EFFORT', 'KINDNESS', 'ATTENDANCE', 'CONDUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "DetentionStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'MISSED');

-- CreateTable
CREATE TABLE "BehaviourPointsEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pupilId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL,
    "category" "PointsCategory" NOT NULL DEFAULT 'OTHER',
    "reason" TEXT NOT NULL,
    "awardedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviourPointsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Detention" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pupilId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "location" TEXT,
    "status" "DetentionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Detention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BehaviourPointsEntry_tenantId_pupilId_idx" ON "BehaviourPointsEntry"("tenantId", "pupilId");

-- CreateIndex
CREATE INDEX "BehaviourPointsEntry_tenantId_date_idx" ON "BehaviourPointsEntry"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Detention_tenantId_pupilId_idx" ON "Detention"("tenantId", "pupilId");

-- CreateIndex
CREATE INDEX "Detention_tenantId_date_idx" ON "Detention"("tenantId", "date");

-- AddForeignKey
ALTER TABLE "BehaviourPointsEntry" ADD CONSTRAINT "BehaviourPointsEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviourPointsEntry" ADD CONSTRAINT "BehaviourPointsEntry_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviourPointsEntry" ADD CONSTRAINT "BehaviourPointsEntry_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detention" ADD CONSTRAINT "Detention_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detention" ADD CONSTRAINT "Detention_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detention" ADD CONSTRAINT "Detention_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
