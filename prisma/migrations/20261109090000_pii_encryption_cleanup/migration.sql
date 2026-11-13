-- ADR-014 D-P3, bước P-5d-2 (dọn sau P-5c): bỏ bản sao bản mã `*_enc` của P-5a/P-5b. Từ P-5c chính cột cá nhân chứa bản
-- mã; từ P-5d-1 (#194) ứng dụng không đọc/ghi `*_enc` (`@ignore`), nên bản đang phục vụ lúc migration chạy (pre-deploy)
-- không còn chọn các cột này. Xoá cột không mất dữ liệu: giá trị cá nhân nằm ở cột chính (bản mã, hoặc chữ rõ chờ job).
-- contract: xoá 15 cột `*_enc` (bản sao để quay lại P-5b) — PO duyệt kế hoạch P-5d 07/11/2026; merge sau khi P-5d-1 đã deploy.
-- Cùng bản này, tra "đơn của khách" bỏ nhánh khớp `order_coordinations.metadata.customerPhone` (đơn chưa qua job). Chốt
-- trước khi xoá: không còn đơn điều phối nào giữ SĐT khách lẻ trong `metadata` — còn → RAISE, cả giao dịch cuộn lại, không
-- đổi gì: chạy `npm run pii:backfill` (runbook vận hành §14) rồi deploy lại. Thông báo chỉ có số dòng.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- P5D-VERIFY-BEGIN (test `pii-cleanup.test.ts` chạy lại đúng khối này)
DO $$
DECLARE
  bad bigint;
BEGIN
  SELECT count(*) INTO bad FROM "order_coordinations" WHERE "metadata" ? 'customerPhone';
  IF bad > 0 THEN
    RAISE EXCEPTION 'P-5d: dừng, không đổi gì — order_coordinations: % đơn còn SĐT khách lẻ trong metadata', bad
      USING HINT = 'Chạy npm run pii:backfill (runbook vận hành §14) rồi deploy lại';
  END IF;
END $$;
-- P5D-VERIFY-END

ALTER TABLE "customers" DROP COLUMN "address_enc",
DROP COLUMN "email_enc",
DROP COLUMN "notes_enc",
DROP COLUMN "phone_enc";

ALTER TABLE "greeting_sessions" DROP COLUMN "customer_phone_enc";

ALTER TABLE "leads" DROP COLUMN "message_enc",
DROP COLUMN "phone_enc";

ALTER TABLE "order_coordinations" DROP COLUMN "shipper_phone_enc";

ALTER TABLE "order_recipients" DROP COLUMN "address_line_enc",
DROP COLUMN "address_parts_enc",
DROP COLUMN "recipient_phone_enc",
DROP COLUMN "vat_company_address_enc",
DROP COLUMN "vat_company_name_enc",
DROP COLUMN "vat_email_enc",
DROP COLUMN "vat_tax_code_enc";

COMMIT;
