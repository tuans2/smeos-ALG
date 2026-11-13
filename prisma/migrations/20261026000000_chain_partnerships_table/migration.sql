-- CreateTable: chain_partnerships
-- Module: ChainOS — Liên kết Chuỗi-Đối tác
CREATE TABLE IF NOT EXISTS "chain_partnerships" (
    "id" TEXT NOT NULL,
    "chain_org_id" TEXT NOT NULL,
    "partner_org_id" TEXT NOT NULL,
    "partner_code" TEXT NOT NULL,
    "partnership_type" TEXT NOT NULL DEFAULT 'SUBCONTRACTOR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "capacity_daily" INTEGER NOT NULL DEFAULT 10,
    "commission_rate" DECIMAL(65,30),
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "address" TEXT,
    "province" TEXT,
    "district" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_partnerships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chain_partnerships_chain_org_id_partner_code_key" ON "chain_partnerships"("chain_org_id", "partner_code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chain_partnerships_chain_org_id_partner_org_id_key" ON "chain_partnerships"("chain_org_id", "partner_org_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chain_partnerships_chain_org_id_status_idx" ON "chain_partnerships"("chain_org_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chain_partnerships_partner_org_id_idx" ON "chain_partnerships"("partner_org_id");

-- AddForeignKey
ALTER TABLE "chain_partnerships" ADD CONSTRAINT "chain_partnerships_chain_org_id_fkey" FOREIGN KEY ("chain_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_partnerships" ADD CONSTRAINT "chain_partnerships_partner_org_id_fkey" FOREIGN KEY ("partner_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
