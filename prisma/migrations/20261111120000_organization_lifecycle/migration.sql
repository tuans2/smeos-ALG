-- ADR-016 D-S5, bước S-3a: vòng đời tổ chức. Chỉ thêm kiểu + cột (cột bắt buộc có DEFAULT 'ACTIVE' nên dòng cũ
-- đều đang hoạt động); không đổi dữ liệu nào khác. Ứng dụng kiểm cột ở `requireTenantContext`; Admin SaaS đổi (N2).
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "organization_lifecycle_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'OFFBOARDING', 'DELETED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "lifecycle_changed_at" TIMESTAMPTZ(3),
ADD COLUMN     "lifecycle_status" "organization_lifecycle_status" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "offboarding_until" TIMESTAMPTZ(3);

COMMIT;
