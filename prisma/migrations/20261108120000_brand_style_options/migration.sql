-- Mục Thương hiệu 3 bước (PO 08/11/2026): câu khẩu hiệu chính thức + phương án theo phong cách của
-- Bộ nhận diện (bước 2) và Landing page chính thức (bước 3). Thêm cột nullable + bảng mới, không sửa dữ liệu cũ.
-- Bảng thuộc tổ chức có chính sách RLS như mọi bảng thuộc tổ chức (ADR-013 D-I2).
BEGIN;
SET LOCAL lock_timeout = '5s';
-- AlterTable
ALTER TABLE "brand_profiles" ADD COLUMN     "slogan" TEXT;

-- CreateTable
CREATE TABLE "brand_style_options" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "style_key" TEXT NOT NULL,
    "batch" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "profile_fingerprint" TEXT NOT NULL,
    "job_id" TEXT,
    "selected_at" TIMESTAMPTZ(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_style_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_style_options_organization_id_idx" ON "brand_style_options"("organization_id");

-- CreateIndex
CREATE INDEX "brand_style_options_organization_id_kind_created_at_idx" ON "brand_style_options"("organization_id", "kind", "created_at");

-- AddForeignKey
ALTER TABLE "brand_style_options" ADD CONSTRAINT "brand_style_options_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_style_options" ADD CONSTRAINT "brand_style_options_kind_check" CHECK ("kind" IN ('IDENTITY', 'LANDING'));

ALTER TABLE "brand_style_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_style_options" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "brand_style_options"
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
