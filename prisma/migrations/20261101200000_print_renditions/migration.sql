-- CreateEnum
CREATE TYPE "print_rendition_status" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "print_renditions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "asset_usage_id" TEXT,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "preset_code" TEXT NOT NULL,
    "width_mm" DECIMAL(8,2) NOT NULL,
    "height_mm" DECIMAL(8,2) NOT NULL,
    "bleed_mm" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "dpi" INTEGER NOT NULL DEFAULT 300,
    "storage_key" TEXT,
    "file_url" TEXT,
    "preflight" JSONB,
    "status" "print_rendition_status" NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_renditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "print_renditions_organization_id_idx" ON "print_renditions"("organization_id");
CREATE INDEX "print_renditions_organization_id_status_idx" ON "print_renditions"("organization_id", "status");
CREATE INDEX "print_renditions_organization_id_preset_code_idx" ON "print_renditions"("organization_id", "preset_code");
CREATE INDEX "print_renditions_organization_id_created_at_idx" ON "print_renditions"("organization_id", "created_at");
CREATE INDEX "print_renditions_asset_usage_id_idx" ON "print_renditions"("asset_usage_id");

-- AddForeignKey
ALTER TABLE "print_renditions" ADD CONSTRAINT "print_renditions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_renditions" ADD CONSTRAINT "print_renditions_asset_usage_id_fkey" FOREIGN KEY ("asset_usage_id") REFERENCES "asset_usages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

