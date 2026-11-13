-- ADR-012 D-T2, bước T-4c: xoá `chain_branches` và `memberships.chain_branch_code`. Từ T-4b mọi đường đọc ở
-- `branches` (`accepts_dispatch`) và `memberships.branch_id`; từ bước này repository ghi thẳng `branches`.
-- contract: drop chain_branches + memberships.chain_branch_code — PO duyệt T-4c 06/11/2026; dữ liệu đã chép sang branches (T-4a, ghi kép tới T-4b)
-- Chốt an toàn: còn chi nhánh chuỗi nào chưa có dòng `branches` nhận đơn cùng mã → dừng cả migration
-- (preDeployCommand thất bại, bản đang chạy giữ nguyên, không mất dữ liệu). Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

DO $$
DECLARE
  missing integer;
BEGIN
  SELECT count(*) INTO missing
  FROM "chain_branches" cb
  WHERE NOT EXISTS (
    SELECT 1 FROM "branches" b
    WHERE b."organization_id" = cb."organization_id" AND b."code" = cb."branch_code" AND b."accepts_dispatch"
  );
  IF missing > 0 THEN
    RAISE EXCEPTION 'T-4c dừng: % chi nhánh chain_branches chưa có trong branches — rà trước khi xoá', missing;
  END IF;
END $$;

-- Thành viên còn mã chi nhánh chuỗi mà chưa có branch_id → gắn (D-56) trước khi bỏ cột.
UPDATE "memberships" m SET "branch_id" = b."id"
FROM "branches" b
WHERE m."branch_id" IS NULL AND m."chain_branch_code" IS NOT NULL
  AND b."organization_id" = m."organization_id" AND b."code" = m."chain_branch_code" AND b."accepts_dispatch";

-- Thành viên có branch_id khác chi nhánh chuỗi (NOTICE ở T-4a): giữ branch_id; sau bước này họ không còn vào
-- trang cửa hàng của chi nhánh chuỗi cho tới khi được gắn lại.
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM "memberships" m
  JOIN "branches" b ON b."organization_id" = m."organization_id" AND b."code" = m."chain_branch_code" AND b."accepts_dispatch"
  WHERE m."branch_id" IS DISTINCT FROM b."id";
  IF n > 0 THEN
    RAISE NOTICE 'T-4c: % thành viên có branch_id khác chi nhánh chuỗi đã gắn — giữ branch_id, cần gắn lại chi nhánh nhận đơn', n;
  END IF;
END $$;

-- DropIndex
DROP INDEX "memberships_organization_id_chain_branch_code_idx";

-- AlterTable
ALTER TABLE "memberships" DROP COLUMN "chain_branch_code";

-- DropTable (khoá ngoại, index, chính sách RLS của bảng đi cùng)
DROP TABLE "chain_branches";

COMMIT;
