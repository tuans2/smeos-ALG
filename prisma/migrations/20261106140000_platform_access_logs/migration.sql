-- ADR-013 D-I5, bước I-2b (D-60): `platform_access_logs` — mỗi lần nhân viên nền tảng truy cập dữ liệu một tổ chức
-- (Console `platform/organizations/:id/*`, `platform/orgs-data/:orgId/*`) ghi một dòng; chủ tổ chức xem ở `/audit`.
-- Bảng thuộc tổ chức: RLS như mọi bảng tenant (sinh bởi scripts/gen-rls-policies.mjs). Chỉ thêm dòng: dùng chung
-- trigger `smeos_append_only_guard` của I-2a. Chỉ thêm bảng; không đổi dữ liệu. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateTable
CREATE TABLE "platform_access_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_access_logs_organization_id_created_at_idx" ON "platform_access_logs"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "platform_access_logs" ADD CONSTRAINT "platform_access_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security theo tổ chức (ADR-013 D-I2) — sinh bởi scripts/gen-rls-policies.mjs
ALTER TABLE "platform_access_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_access_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "platform_access_logs"
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

-- Nhật ký bất biến (ADR-013 D-I4, hàm từ migration `*_append_only_logs`)
CREATE TRIGGER "platform_access_logs_append_only" BEFORE UPDATE OR DELETE ON "platform_access_logs"
FOR EACH ROW EXECUTE FUNCTION smeos_append_only_guard();

COMMIT;
