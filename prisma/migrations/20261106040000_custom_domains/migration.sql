-- Checklist ALG 10.8 (PO 06/11/2026): tên miền riêng của cửa hàng cho trang danh mục và Thẻ Chào.
-- Bảng mới, không sửa dữ liệu cũ. Có chính sách RLS theo tổ chức như mọi bảng thuộc tổ chức (ADR-013 D-I2).
BEGIN;
SET LOCAL lock_timeout = '5s';
-- CreateEnum
CREATE TYPE "custom_domain_status" AS ENUM ('PENDING', 'VERIFIED', 'LOCKED');

-- CreateEnum
CREATE TYPE "custom_domain_certificate_status" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'MANUAL', 'FAILED');

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "status" "custom_domain_status" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMPTZ(3),
    "last_checked_at" TIMESTAMPTZ(3),
    "certificate_status" "custom_domain_certificate_status" NOT NULL DEFAULT 'NOT_REQUESTED',
    "locked_reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_hostname_key" ON "custom_domains"("hostname");

-- CreateIndex
CREATE INDEX "custom_domains_organization_id_idx" ON "custom_domains"("organization_id");

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "custom_domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_domains" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "custom_domains"
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
