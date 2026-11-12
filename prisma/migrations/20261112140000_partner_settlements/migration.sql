-- Audit BL-22, PO 12/11/2026: sổ quyết toán tiền công đối tác theo kỳ. Chỉ thêm bảng mới (expand); khoá ngoại tới
-- `organizations`/`partners` giữ khoá ngắn trên bảng đó nên đặt trần chờ khoá để không treo khi bảng bận.
SET LOCAL lock_timeout = '5s';
-- CreateTable
CREATE TABLE "partner_settlements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "order_count" INTEGER NOT NULL,
    "total_payout_vnd" DECIMAL(14,2) NOT NULL,
    "items" JSONB NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "reconciled_by" TEXT,
    "reconciled_at" TIMESTAMPTZ(3),
    "paid_by" TEXT,
    "paid_at" TIMESTAMPTZ(3),
    "payment_reference" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_settlements_organization_id_status_idx" ON "partner_settlements"("organization_id", "status");

-- CreateIndex
CREATE INDEX "partner_settlements_partner_id_idx" ON "partner_settlements"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_settlements_organization_id_partner_id_period_from_key" ON "partner_settlements"("organization_id", "partner_id", "period_from");

-- AddForeignKey
ALTER TABLE "partner_settlements" ADD CONSTRAINT "partner_settlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_settlements" ADD CONSTRAINT "partner_settlements_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security theo tổ chức (ADR-013 D-I2), sinh bởi scripts/gen-rls-policies.mjs.

ALTER TABLE "partner_settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner_settlements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "partner_settlements"
  USING (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
  )
  WITH CHECK (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
  );
