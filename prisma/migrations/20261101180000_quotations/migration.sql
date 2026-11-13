-- CreateEnum
CREATE TYPE "quotation_status" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "lead_id" TEXT,
    "customer_id" TEXT,
    "asset_usage_id" TEXT,
    "status" "quotation_status" NOT NULL DEFAULT 'DRAFT',
    "valid_until" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "terms" TEXT,
    "notes" TEXT,
    "converted_order_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "product_id" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_organization_id_code_key" ON "quotations"("organization_id", "code");
CREATE INDEX "quotations_organization_id_idx" ON "quotations"("organization_id");
CREATE INDEX "quotations_organization_id_status_idx" ON "quotations"("organization_id", "status");
CREATE INDEX "quotations_organization_id_created_at_idx" ON "quotations"("organization_id", "created_at");
CREATE INDEX "quotations_lead_id_idx" ON "quotations"("lead_id");
CREATE INDEX "quotations_customer_id_idx" ON "quotations"("customer_id");

-- CreateIndex
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items"("quotation_id");
CREATE INDEX "quotation_items_product_id_idx" ON "quotation_items"("product_id");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_asset_usage_id_fkey" FOREIGN KEY ("asset_usage_id") REFERENCES "asset_usages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_converted_order_id_fkey" FOREIGN KEY ("converted_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

