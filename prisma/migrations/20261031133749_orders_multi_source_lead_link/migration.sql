-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "closed_reason" TEXT,
ADD COLUMN     "converted_order_id" TEXT,
ADD COLUMN     "next_follow_up_at" TIMESTAMP(3),
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "lead_id" TEXT,
ADD COLUMN     "owner_sale_id" TEXT,
ADD COLUMN     "workflow" TEXT NOT NULL DEFAULT 'LEGACY';

-- CreateIndex
CREATE INDEX "leads_organization_id_next_follow_up_at_idx" ON "leads"("organization_id", "next_follow_up_at");

-- CreateIndex
CREATE INDEX "leads_organization_id_converted_order_id_idx" ON "leads"("organization_id", "converted_order_id");

-- CreateIndex
CREATE INDEX "orders_organization_id_owner_sale_id_idx" ON "orders"("organization_id", "owner_sale_id");

-- CreateIndex
CREATE INDEX "orders_organization_id_lead_id_idx" ON "orders"("organization_id", "lead_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_order_id_fkey" FOREIGN KEY ("converted_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data: đổi trạng thái lead CONTACTED → IN_PROGRESS (PO 31/10/2026, KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md §3.4).
UPDATE "leads" SET "status" = 'IN_PROGRESS' WHERE "status" = 'CONTACTED';
