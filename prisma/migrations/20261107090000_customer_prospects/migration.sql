-- ADR-014 D-P2, bước P-2 (expand): một hồ sơ khách mỗi tổ chức. PO duyệt 07/11/2026, phương án A:
-- PROSPECT = người nhận link Thẻ chào có SĐT mà chưa đặt đơn; lead vẫn tạo khách ACTIVE như trước; khách cũ giữ ACTIVE.
-- `greeting_sessions.customer_id` trỏ tới hồ sơ khách; `customer_name`/`customer_phone` vẫn giữ và vẫn ghi (ghi kép),
-- bỏ ở bước contract sau. Khoá ngoại một cột + SET NULL như `leads.customer_id` (khoá ghép với SET NULL sẽ xoá cả
-- `organization_id`); cùng tổ chức do mã ghi bảo đảm và `tests/tenant/customer-prospects.test.ts` kiểm.
-- Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "customer_status" AS ENUM ('ACTIVE', 'PROSPECT');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "status" "customer_status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "greeting_sessions" ADD COLUMN     "customer_id" TEXT;

-- CreateIndex
CREATE INDEX "customers_organization_id_status_idx" ON "customers"("organization_id", "status");

-- CreateIndex
CREATE INDEX "greeting_sessions_customer_id_idx" ON "greeting_sessions"("customer_id");

-- AddForeignKey
ALTER TABLE "greeting_sessions" ADD CONSTRAINT "greeting_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- P2-BACKFILL-BEGIN (test `customer-prospects.test.ts` chạy lại đúng khối này)
-- 1) Link đã thành đơn: khách của đơn (cùng tổ chức).
UPDATE "greeting_sessions" s SET "customer_id" = o."customer_id"
FROM "orders" o
WHERE s."customer_id" IS NULL AND s."order_id" = o."id" AND o."organization_id" = s."organization_id"
  AND o."customer_id" IS NOT NULL;

-- 2) Link chưa có đơn mà SĐT đã có trong hồ sơ khách cùng tổ chức (khớp đúng chuỗi, như `findOrCreateCustomer`).
UPDATE "greeting_sessions" s SET "customer_id" = c."id"
FROM "customers" c
WHERE s."customer_id" IS NULL AND s."order_id" IS NULL AND s."customer_phone" IS NOT NULL AND s."customer_phone" <> ''
  AND c."organization_id" = s."organization_id" AND c."phone" = s."customer_phone";

-- 3) Link chưa có đơn, SĐT chưa có hồ sơ: tạo khách PROSPECT (một dòng mỗi tổ chức + SĐT, tên lấy ở link mới nhất).
--    Trùng mã/SĐT thì bỏ qua dòng đó (link vẫn còn tên/SĐT riêng ở giai đoạn ghi kép).
INSERT INTO "customers" ("id", "organization_id", "code", "name", "phone", "status", "updated_at")
SELECT gen_random_uuid()::text, p."organization_id",
       'KH-' || upper(substr(md5(p."organization_id" || ':' || p."customer_phone"), 1, 8)),
       COALESCE(NULLIF(btrim(p."customer_name"), ''), 'Khách chưa rõ tên'), p."customer_phone", 'PROSPECT', now()
FROM (
  SELECT DISTINCT ON ("organization_id", "customer_phone") "organization_id", "customer_phone", "customer_name"
  FROM "greeting_sessions"
  WHERE "customer_id" IS NULL AND "order_id" IS NULL AND "customer_phone" IS NOT NULL AND "customer_phone" <> ''
  ORDER BY "organization_id", "customer_phone", "created_at" DESC
) p
ON CONFLICT DO NOTHING;

UPDATE "greeting_sessions" s SET "customer_id" = c."id"
FROM "customers" c
WHERE s."customer_id" IS NULL AND s."order_id" IS NULL AND s."customer_phone" IS NOT NULL AND s."customer_phone" <> ''
  AND c."organization_id" = s."organization_id" AND c."phone" = s."customer_phone";
-- P2-BACKFILL-END

COMMIT;
