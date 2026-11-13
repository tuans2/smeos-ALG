-- Đối soát số dư (ADR-013 D-I6, bước I-3): bảng ghi các đơn có paid_vnd lệch tổng order_payments.
-- Bảng mới, không chạm dữ liệu cũ.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "reconciliation_kind" AS ENUM ('ORDER_PAID_MISMATCH');

-- CreateTable
CREATE TABLE "reconciliation_findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" "reconciliation_kind" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "expected_vnd" DECIMAL(14,2) NOT NULL,
    "actual_vnd" DECIMAL(14,2) NOT NULL,
    "first_detected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_detected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconciliation_findings_organization_id_idx" ON "reconciliation_findings"("organization_id");

-- CreateIndex
CREATE INDEX "reconciliation_findings_organization_id_resolved_at_idx" ON "reconciliation_findings"("organization_id", "resolved_at");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_findings_kind_entity_id_key" ON "reconciliation_findings"("kind", "entity_id");

-- AddForeignKey
ALTER TABLE "reconciliation_findings" ADD CONSTRAINT "reconciliation_findings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
