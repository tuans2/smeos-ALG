-- CreateEnum
CREATE TYPE "usage_destination" AS ENUM ('PROMOTION', 'SALES', 'CARE', 'PRINT', 'OTHER');

-- CreateEnum
CREATE TYPE "usage_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "asset_usages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "asset_type_code" TEXT NOT NULL,
    "destination" "usage_destination" NOT NULL,
    "cta_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_link_id" TEXT,
    "campaign_id" TEXT,
    "config" JSONB DEFAULT '{}',
    "status" "usage_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_usages_organization_id_idx" ON "asset_usages"("organization_id");

-- CreateIndex
CREATE INDEX "asset_usages_organization_id_source_type_source_id_idx" ON "asset_usages"("organization_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "asset_usages_organization_id_destination_status_idx" ON "asset_usages"("organization_id", "destination", "status");

-- AddForeignKey
ALTER TABLE "asset_usages" ADD CONSTRAINT "asset_usages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_usages" ADD CONSTRAINT "asset_usages_short_link_id_fkey" FOREIGN KEY ("short_link_id") REFERENCES "short_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

