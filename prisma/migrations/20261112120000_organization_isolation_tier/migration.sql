-- ADR-016 D-S2, bước S-5 (PO duyệt 12/11/2026): mức cô lập của tổ chức. Chỉ thêm kiểu + cột; cột bắt buộc có
-- DEFAULT 'SHARED' nên mọi tổ chức cũ ở mức dùng chung (đúng hiện trạng). Gói thuê bao quyết định mức được phép.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "organization_isolation_tier" AS ENUM ('SHARED', 'SHARED_PLUS', 'DEDICATED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "isolation_tier" "organization_isolation_tier" NOT NULL DEFAULT 'SHARED';

COMMIT;
