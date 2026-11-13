-- product_bookings: ngày → DATE, trạng thái → enum, khoá ngoại sang orders (rà soát M5, 22/10/2026).
--
-- VIẾT TAY: SQL Prisma tự sinh cho đổi kiểu cột là DROP COLUMN rồi ADD COLUMN — mất toàn bộ ngày
-- đặt phòng. Ở đây đổi kiểu TẠI CHỖ bằng ALTER ... TYPE ... USING, giữ nguyên mọi dòng. Cả tệp
-- chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được ghi.
BEGIN;

-- 1. Ngày không đổi được sang DATE (sai định dạng, ngày không có thật) → dừng, không đoán thay
--    người dùng. Sửa tay các dòng được báo rồi deploy lại (docs/kien-truc/VAN_HANH_CAP_NHAT_CSDL.md).
DO $$
DECLARE bad integer;
BEGIN
  SELECT count(*) INTO bad FROM "product_bookings"
   WHERE "check_in_date" !~ '^\d{4}-\d{2}-\d{2}$'
      OR "check_out_date" !~ '^\d{4}-\d{2}-\d{2}$'
      OR to_char(to_date("check_in_date", 'YYYY-MM-DD'), 'YYYY-MM-DD') <> "check_in_date"
      OR to_char(to_date("check_out_date", 'YYYY-MM-DD'), 'YYYY-MM-DD') <> "check_out_date";
  IF bad > 0 THEN
    RAISE EXCEPTION 'product_bookings: % dòng có ngày không hợp lệ — sửa tay trước khi migrate', bad;
  END IF;
END $$;

ALTER TABLE "product_bookings"
  ALTER COLUMN "check_in_date" TYPE DATE USING "check_in_date"::date,
  ALTER COLUMN "check_out_date" TYPE DATE USING "check_out_date"::date;

-- 2. Trạng thái: giá trị ngoài ACTIVE/CANCELLED (không đường ghi nào tạo ra) coi là đã huỷ.
CREATE TYPE "booking_status" AS ENUM ('ACTIVE', 'CANCELLED');
UPDATE "product_bookings" SET "status" = 'CANCELLED' WHERE "status" NOT IN ('ACTIVE', 'CANCELLED');
ALTER TABLE "product_bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "product_bookings" ALTER COLUMN "status" TYPE "booking_status" USING "status"::"booking_status";
ALTER TABLE "product_bookings" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 3. Đặt chỗ trỏ tới đơn đã bị xoá: giải phóng phòng, giữ dòng để còn vết (không xoá dữ liệu).
UPDATE "product_bookings" pb
   SET "status" = 'CANCELLED', "order_id" = NULL,
       "note" = concat_ws(' · ', pb."note", 'Đơn gốc đã bị xoá')
 WHERE pb."order_id" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "orders" o WHERE o."id" = pb."order_id");

ALTER TABLE "product_bookings" ADD CONSTRAINT "product_bookings_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
