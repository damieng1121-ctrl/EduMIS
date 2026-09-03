-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "CoverStatus" AS ENUM ('NEEDS_COVER', 'ASSIGNED', 'COMPLETED');

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "formGroupId" TEXT NOT NULL,
    "dayOfWeek" "Weekday" NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timetableSlotId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "absentTeacherId" TEXT NOT NULL,
    "coveringTeacherId" TEXT,
    "status" "CoverStatus" NOT NULL DEFAULT 'NEEDS_COVER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimetableSlot_tenantId_formGroupId_idx" ON "TimetableSlot"("tenantId", "formGroupId");

-- CreateIndex
CREATE INDEX "CoverAssignment_tenantId_date_idx" ON "CoverAssignment"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CoverAssignment_timetableSlotId_date_key" ON "CoverAssignment"("timetableSlotId", "date");

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_formGroupId_fkey" FOREIGN KEY ("formGroupId") REFERENCES "FormGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "AssessmentSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverAssignment" ADD CONSTRAINT "CoverAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverAssignment" ADD CONSTRAINT "CoverAssignment_timetableSlotId_fkey" FOREIGN KEY ("timetableSlotId") REFERENCES "TimetableSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverAssignment" ADD CONSTRAINT "CoverAssignment_absentTeacherId_fkey" FOREIGN KEY ("absentTeacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverAssignment" ADD CONSTRAINT "CoverAssignment_coveringTeacherId_fkey" FOREIGN KEY ("coveringTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
