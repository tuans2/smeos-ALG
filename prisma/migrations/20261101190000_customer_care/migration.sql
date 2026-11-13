-- CreateEnum
CREATE TYPE "customer_segment_kind" AS ENUM ('DYNAMIC', 'STATIC');

-- CreateEnum
CREATE TYPE "customer_interaction_channel" AS ENUM ('ZALO', 'PHONE', 'SMS', 'EMAIL', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "customer_interaction_direction" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateTable
CREATE TABLE "customer_segments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "customer_segment_kind" NOT NULL DEFAULT 'DYNAMIC',
    "rules" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_interactions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "channel" "customer_interaction_channel" NOT NULL,
    "direction" "customer_interaction_direction" NOT NULL DEFAULT 'OUTBOUND',
    "asset_usage_id" TEXT,
    "summary" TEXT NOT NULL,
    "outcome" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_segments_organization_id_idx" ON "customer_segments"("organization_id");
CREATE INDEX "customer_segments_organization_id_kind_idx" ON "customer_segments"("organization_id", "kind");
CREATE INDEX "customer_segments_organization_id_created_at_idx" ON "customer_segments"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_interactions_organization_id_idx" ON "customer_interactions"("organization_id");
CREATE INDEX "customer_interactions_organization_id_customer_id_occurred_at_idx" ON "customer_interactions"("organization_id", "customer_id", "occurred_at");
CREATE INDEX "customer_interactions_customer_id_idx" ON "customer_interactions"("customer_id");
CREATE INDEX "customer_interactions_asset_usage_id_idx" ON "customer_interactions"("asset_usage_id");

-- AddForeignKey
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_asset_usage_id_fkey" FOREIGN KEY ("asset_usage_id") REFERENCES "asset_usages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

