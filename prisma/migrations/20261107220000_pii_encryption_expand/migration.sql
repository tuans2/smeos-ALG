-- ADR-014 D-P3, bước P-5a (expand): mã hoá cột dữ liệu cá nhân của khách cuối ở tầng ứng dụng. PO duyệt 07/11/2026: phạm vi A
-- (customers, leads, greeting_sessions, order_recipients, order_coordinations.shipper_phone), khoá chủ `PII_ENCRYPTION_KEY`
-- ở biến môi trường, tìm khách theo 4 số cuối hoặc đủ số, chia 3 PR (P-5a cột + ghi kép + job; P-5b đọc/tra cứu; P-5c
-- bỏ cột rõ). Ở bước này chỉ thêm cột và bảng khoá — bản mã do ứng dụng ghi (khoá không vào CSDL): ghi kép qua extension
-- Prisma, dữ liệu cũ qua `npm run pii:backfill` và lượt quét nền. `tenant_data_keys` thuộc tổ chức: RLS như mọi bảng
-- tenant (sinh bởi scripts/gen-rls-policies.mjs). Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address_enc" TEXT,
ADD COLUMN     "email_enc" TEXT,
ADD COLUMN     "notes_enc" TEXT,
ADD COLUMN     "phone_enc" TEXT,
ADD COLUMN     "phone_hash" TEXT,
ADD COLUMN     "phone_last4" TEXT;

-- AlterTable
ALTER TABLE "greeting_sessions" ADD COLUMN     "customer_phone_enc" TEXT,
ADD COLUMN     "customer_phone_hash" TEXT,
ADD COLUMN     "customer_phone_last4" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "message_enc" TEXT,
ADD COLUMN     "phone_enc" TEXT,
ADD COLUMN     "phone_hash" TEXT,
ADD COLUMN     "phone_last4" TEXT;

-- AlterTable
ALTER TABLE "order_coordinations" ADD COLUMN     "shipper_phone_enc" TEXT;

-- AlterTable
ALTER TABLE "order_recipients" ADD COLUMN     "address_line_enc" TEXT,
ADD COLUMN     "address_parts_enc" TEXT,
ADD COLUMN     "recipient_phone_enc" TEXT,
ADD COLUMN     "vat_company_address_enc" TEXT,
ADD COLUMN     "vat_company_name_enc" TEXT,
ADD COLUMN     "vat_email_enc" TEXT,
ADD COLUMN     "vat_tax_code_enc" TEXT;

-- CreateTable
CREATE TABLE "tenant_data_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "wrapped_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMPTZ(3),

    CONSTRAINT "tenant_data_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_data_keys_organization_id_idx" ON "tenant_data_keys"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_data_keys_organization_id_version_key" ON "tenant_data_keys"("organization_id", "version");

-- CreateIndex
CREATE INDEX "customers_organization_id_phone_hash_idx" ON "customers"("organization_id", "phone_hash");

-- CreateIndex
CREATE INDEX "customers_organization_id_phone_last4_idx" ON "customers"("organization_id", "phone_last4");

-- CreateIndex
CREATE INDEX "greeting_sessions_organization_id_customer_phone_hash_idx" ON "greeting_sessions"("organization_id", "customer_phone_hash");

-- CreateIndex
CREATE INDEX "leads_organization_id_phone_hash_idx" ON "leads"("organization_id", "phone_hash");

-- AddForeignKey
ALTER TABLE "tenant_data_keys" ADD CONSTRAINT "tenant_data_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row Level Security theo tổ chức (ADR-013 D-I2) — sinh bởi scripts/gen-rls-policies.mjs
ALTER TABLE "tenant_data_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_data_keys" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_data_keys"
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

COMMIT;
