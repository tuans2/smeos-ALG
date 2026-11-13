-- CreateEnum
CREATE TYPE "campaign_objective" AS ENUM ('AWARENESS', 'LEAD', 'SALE', 'RETENTION');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" "campaign_objective" NOT NULL,
    "occasion_code" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "status" "campaign_status" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_organization_id_idx" ON "campaigns"("organization_id");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_status_idx" ON "campaigns"("organization_id", "status");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_created_at_idx" ON "campaigns"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "asset_usages_campaign_id_idx" ON "asset_usages"("campaign_id");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_usages" ADD CONSTRAINT "asset_usages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: Update leads in 'IN_PROGRESS' to 'CONTACTED'
UPDATE "leads" SET "status" = 'CONTACTED' WHERE "status" = 'IN_PROGRESS';

