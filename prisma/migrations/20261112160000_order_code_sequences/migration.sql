-- Bộ đếm mã đơn theo tổ chức và ngày (12/11/2026, đặc tả 07 §57): thử tải O-9 cho thấy đơn tạo cùng lúc trong một
-- chuỗi trùng mã `DH<yymmdd>-<số>` vì số lấy từ đếm đơn trong ngày. Chỉ thêm bảng mới (expand), không backfill: dòng
-- đầu tiên của mỗi ngày tự lấy số lớn nhất đã có trong ngày. Khoá ngoại tới `organizations` giữ khoá ngắn nên đặt trần chờ khoá.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateTable
CREATE TABLE "order_code_sequences" (
    "organization_id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_code_sequences_pkey" PRIMARY KEY ("organization_id","prefix")
);

-- AddForeignKey
ALTER TABLE "order_code_sequences" ADD CONSTRAINT "order_code_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security theo tổ chức (ADR-013 D-I2), cùng mẫu scripts/gen-rls-policies.mjs.
ALTER TABLE "order_code_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_code_sequences" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "order_code_sequences"
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
