-- ADR-014 D-P4, bước P-6a: bảng hạn lưu theo loại dữ liệu. Chỉ thêm kiểu + bảng nền tảng mới (không có
-- `organization_id`) và 3 dòng mốc PO đã chốt (D-50). `enforce = false` ở mọi dòng: job hằng đêm chỉ đếm, chưa xoá
-- hay ẩn danh gì cho tới khi PO bật từng loại. Loại dữ liệu khác (hội thoại, lead, khách, chứng từ) thêm ở P-6b.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "retention_action" AS ENUM ('DELETE', 'ANONYMIZE');

-- CreateTable
CREATE TABLE "retention_policies" (
    "category" TEXT NOT NULL,
    "retention_months" INTEGER NOT NULL,
    "action" "retention_action" NOT NULL,
    "enforce" BOOLEAN NOT NULL DEFAULT false,
    "last_run_at" TIMESTAMPTZ(3),
    "last_run_rows" INTEGER,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("category"),
    CONSTRAINT "retention_policies_months_check" CHECK ("retention_months" BETWEEN 1 AND 600)
);

-- Mốc ADR-014 D-P4 (PO 05/11/2026, D-50) — chưa phải ý kiến pháp lý.
INSERT INTO "retention_policies" ("category", "retention_months", "action") VALUES
    ('technical_logs', 3, 'DELETE'),
    ('delivery_info', 12, 'ANONYMIZE'),
    ('audit_logs', 60, 'DELETE')
ON CONFLICT ("category") DO NOTHING;

COMMIT;
