-- Kế hoạch nâng cấp logic nghiệp vụ, đợt P2 (PO duyệt 07/11/2026) — docs/plan/business-logic-upgrade.md.
--  WP-15 (audit BL-05): CHECK tiền của đơn — số đã thu không âm và còn phải thu = tổng − đã thu. Mọi đường ghi
--        `paid_vnd`/`balance_vnd` trong mã đều giữ đẳng thức này (rà 07/11/2026); đây là lưới an toàn ở CSDL.
--  WP-16 (audit BL-13): `orders.customer_id` trỏ `customers` theo khoá ghép (customer_id, organization_id) — CSDL
--        từ chối gắn khách của tổ chức khác vào đơn. ON DELETE NO ACTION: SET NULL trên khoá ghép sẽ xoá cả
--        organization_id; xoá khách thì repository gỡ khách khỏi đơn trước (customer-repository.ts).
-- Ràng buộc thêm NOT VALID rồi tự VALIDATE khi dữ liệu cũ sạch; còn dòng lệch thì để NOT VALID + NOTICE
-- (dữ liệu mới vẫn bị chặn) và đối soát tay. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- WP-15 · CHECK tiền
ALTER TABLE "orders" ADD CONSTRAINT "orders_money_check"
  CHECK ("paid_vnd" >= 0 AND "balance_vnd" = "total_vnd" - "paid_vnd") NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "orders" WHERE NOT ("paid_vnd" >= 0 AND "balance_vnd" = "total_vnd" - "paid_vnd")) THEN
    RAISE NOTICE 'Còn đơn lệch tiền (paid_vnd < 0 hoặc balance_vnd <> total_vnd - paid_vnd) — orders_money_check để NOT VALID';
  ELSE
    ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_money_check";
  END IF;
END $$;

-- WP-16 · khoá ghép khách ↔ đơn
ALTER TABLE "orders" DROP CONSTRAINT "orders_customer_id_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_organization_id_fkey"
  FOREIGN KEY ("customer_id", "organization_id") REFERENCES "customers"("id", "organization_id")
  ON DELETE NO ACTION ON UPDATE CASCADE NOT VALID;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "orders" o WHERE o."customer_id" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM "customers" c WHERE c."id" = o."customer_id" AND c."organization_id" = o."organization_id")) THEN
    RAISE NOTICE 'Còn đơn gắn khách khác tổ chức — orders_customer_id_organization_id_fkey để NOT VALID';
  ELSE
    ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_customer_id_organization_id_fkey";
  END IF;
END $$;

COMMIT;
