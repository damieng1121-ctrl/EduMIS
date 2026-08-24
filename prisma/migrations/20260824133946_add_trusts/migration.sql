-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TRUST_ADMIN';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "trustId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trustId" TEXT;

-- CreateTable
CREATE TABLE "Trust" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trust_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trust_slug_key" ON "Trust"("slug");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("id") ON DELETE SET NULL ON UPDATE CASCADE;
