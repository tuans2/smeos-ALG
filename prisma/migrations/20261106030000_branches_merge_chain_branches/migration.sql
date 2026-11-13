-- ADR-012 D-T2, bước T-4a: một bảng chi nhánh. Thêm cột vận hành điều phối của `chain_branches` vào `branches`,
-- chép dữ liệu sang, gắn `memberships.branch_id` cho tài khoản cửa hàng (D-56) và `orders.branch_id` cho đơn gia công
-- đã có chi nhánh nhận. Repository chi nhánh chuỗi ghi kép tới T-4c; đường đọc vẫn ở `chain_branches` tới T-4b.
-- Chỉ thêm cột + chép/điền dữ liệu; không xoá gì. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "accepts_dispatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "active_jobs_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bypass_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bypass_history" JSONB,
ADD COLUMN     "cancellation_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancellation_history" JSONB,
ADD COLUMN     "channels" JSONB,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "max_concurrent_jobs" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 90,
ADD COLUMN     "service_wards" JSONB,
ADD COLUMN     "ward" TEXT,
ADD COLUMN     "zalo_link_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "branches_zalo_link_code_key" ON "branches"("zalo_link_code");

-- Trùng mã (D-57): cùng tổ chức, `branches.code` = `chain_branches.branch_code` → coi là một chi nhánh.
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM "chain_branches" cb
  JOIN "branches" b ON b."organization_id" = cb."organization_id" AND b."code" = cb."branch_code";
  IF n > 0 THEN
    RAISE NOTICE 'T-4a: % chi nhánh trùng mã giữa branches và chain_branches — gộp vào dòng branches (D-57), rà tên và trạng thái', n;
  END IF;
END $$;

-- Gộp: giữ tên/địa chỉ của branches, lấy cấu hình nhận đơn từ chain_branches; chỉ nhận đơn khi cả hai đang bật.
UPDATE "branches" b SET
  "accepts_dispatch" = true,
  "is_active" = b."is_active" AND cb."is_active",
  "ward" = cb."ward", "district" = cb."district", "province" = cb."province", "service_wards" = cb."service_wards",
  "latitude" = cb."latitude", "longitude" = cb."longitude",
  "quality_score" = cb."quality_score", "active_jobs_count" = cb."active_jobs_count", "max_concurrent_jobs" = cb."max_concurrent_jobs",
  "channels" = cb."channels", "zalo_link_code" = cb."zalo_link_code",
  "cancellation_count" = cb."cancellation_count", "bypass_count" = cb."bypass_count",
  "cancellation_history" = cb."cancellation_history", "bypass_history" = cb."bypass_history",
  "updated_at" = now()
FROM "chain_branches" cb
WHERE b."organization_id" = cb."organization_id" AND b."code" = cb."branch_code";

-- Không trùng: dòng mới, giữ nguyên id của chain_branches.
INSERT INTO "branches" (
  "id", "organization_id", "name", "code", "address", "is_active", "accepts_dispatch",
  "ward", "district", "province", "service_wards", "latitude", "longitude",
  "quality_score", "active_jobs_count", "max_concurrent_jobs", "channels", "zalo_link_code",
  "cancellation_count", "bypass_count", "cancellation_history", "bypass_history", "created_at", "updated_at"
)
SELECT
  cb."id", cb."organization_id", cb."name", cb."branch_code", cb."address", cb."is_active", true,
  cb."ward", cb."district", cb."province", cb."service_wards", cb."latitude", cb."longitude",
  cb."quality_score", cb."active_jobs_count", cb."max_concurrent_jobs", cb."channels", cb."zalo_link_code",
  cb."cancellation_count", cb."bypass_count", cb."cancellation_history", cb."bypass_history", cb."created_at", cb."updated_at"
FROM "chain_branches" cb
WHERE NOT EXISTS (
  SELECT 1 FROM "branches" b WHERE b."organization_id" = cb."organization_id" AND b."code" = cb."branch_code"
);

-- D-56: tài khoản gắn chi nhánh chuỗi → memberships.branch_id (giới hạn phạm vi theo chi nhánh).
-- Thành viên đã có branch_id khác thì giữ nguyên, báo để rà.
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM "memberships" m
  JOIN "branches" b ON b."organization_id" = m."organization_id" AND b."code" = m."chain_branch_code" AND b."accepts_dispatch"
  WHERE m."branch_id" IS NOT NULL AND m."branch_id" <> b."id";
  IF n > 0 THEN
    RAISE NOTICE 'T-4a: % thành viên đã có branch_id khác chi nhánh chuỗi — giữ branch_id, rà tay', n;
  END IF;
END $$;

UPDATE "memberships" m SET "branch_id" = b."id"
FROM "branches" b
WHERE m."branch_id" IS NULL AND m."chain_branch_code" IS NOT NULL
  AND b."organization_id" = m."organization_id" AND b."code" = m."chain_branch_code" AND b."accepts_dispatch";

-- Đơn gia công đã có chi nhánh nhận/chốt (mã chi nhánh trong metadata điều phối) → orders.branch_id.
UPDATE "orders" o SET "branch_id" = b."id"
FROM "order_coordinations" oc
JOIN "branches" b
  ON b."organization_id" = oc."organization_id"
 AND b."code" = oc."metadata" -> 'subcontract_dispatch' ->> 'claimedBranchId'
 AND b."accepts_dispatch"
WHERE oc."order_id" = o."id" AND oc."organization_id" = o."organization_id"
  AND o."branch_id" IS NULL
  AND oc."metadata" -> 'subcontract_dispatch' ->> 'dispatchStatus' IN ('CLAIMED_GRACE', 'COMMITTED');

COMMIT;
