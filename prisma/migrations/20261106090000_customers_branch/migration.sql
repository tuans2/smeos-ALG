-- ADR-012 D-T7, bước T-5 (D-58): khách hàng có chi nhánh. `customers.branch_id` = chi nhánh của người tạo (CRM) hoặc
-- của đơn đầu tiên có chi nhánh; null = khách dùng chung toàn tổ chức. Chỉ thêm cột + chép dữ liệu; lọc theo chi nhánh
-- chỉ bật khi tổ chức bật cờ `settings.branch_scope.wave1` (D-59). Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "branch_id" TEXT;

-- CreateIndex
CREATE INDEX "customers_organization_id_branch_id_idx" ON "customers"("organization_id", "branch_id");

-- CreateIndex
CREATE INDEX "customers_branch_id_idx" ON "customers"("branch_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Khách có sẵn: chi nhánh của đơn sớm nhất có chi nhánh (cùng tổ chức).
UPDATE "customers" c SET "branch_id" = x."branch_id"
FROM (
  SELECT DISTINCT ON (o."customer_id") o."customer_id", o."branch_id", o."organization_id"
  FROM "orders" o
  WHERE o."customer_id" IS NOT NULL AND o."branch_id" IS NOT NULL
  ORDER BY o."customer_id", o."created_at" ASC, o."id" ASC
) x
JOIN "branches" b ON b."id" = x."branch_id"
WHERE c."id" = x."customer_id" AND c."branch_id" IS NULL
  AND c."organization_id" = x."organization_id" AND b."organization_id" = c."organization_id";

-- Đơn có chi nhánh (tạo mới, chi nhánh nhận đơn gia công, gán khách) → khách chưa có chi nhánh nhận chi nhánh đó.
CREATE OR REPLACE FUNCTION smeos_customers_branch_from_order() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "customers" SET "branch_id" = NEW."branch_id"
  WHERE "id" = NEW."customer_id" AND "organization_id" = NEW."organization_id" AND "branch_id" IS NULL;
  RETURN NULL;
END $$;

CREATE TRIGGER "orders_customer_branch"
AFTER INSERT OR UPDATE OF "branch_id", "customer_id" ON "orders"
FOR EACH ROW WHEN (NEW."branch_id" IS NOT NULL AND NEW."customer_id" IS NOT NULL)
EXECUTE FUNCTION smeos_customers_branch_from_order();

COMMIT;
