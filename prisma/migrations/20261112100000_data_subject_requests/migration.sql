-- ADR-014 D-P5, bước P-7a (PO duyệt 12/11/2026): yêu cầu của khách về dữ liệu cá nhân (xuất / xoá / sửa). Chỉ thêm
-- kiểu + bảng mới (expand); khoá ngoại tới `organizations`, `customers` giữ khoá ngắn nên đặt trần chờ khoá.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "data_subject_request_type" AS ENUM ('EXPORT', 'ERASE', 'RECTIFY');

-- CreateEnum
CREATE TYPE "data_subject_request_status" AS ENUM ('RECEIVED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "data_subject_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "type" "data_subject_request_type" NOT NULL,
    "status" "data_subject_request_status" NOT NULL DEFAULT 'RECEIVED',
    "received_by" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "note" TEXT,
    "completed_by" TEXT,
    "completed_at" TIMESTAMPTZ(3),
    "result" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_subject_requests_organization_id_idx" ON "data_subject_requests"("organization_id");

-- CreateIndex
CREATE INDEX "data_subject_requests_organization_id_status_idx" ON "data_subject_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "data_subject_requests_customer_id_idx" ON "data_subject_requests"("customer_id");

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row Level Security theo tổ chức (ADR-013 D-I2), cùng mẫu scripts/gen-rls-policies.mjs.
ALTER TABLE "data_subject_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_subject_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "data_subject_requests"
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
