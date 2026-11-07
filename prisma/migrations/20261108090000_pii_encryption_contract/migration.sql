-- ADR-014 D-P3, bước P-5c (contract): cột dữ liệu cá nhân của khách cuối chỉ còn bản mã. PO duyệt 07/11/2026 (D-65),
-- sau P-5b (#185, mọi chỗ đọc giải từ `*_enc`, tra số theo `phone_hash`). Thêm theo PO 07/11/2026: SĐT khách lẻ của đơn
-- điều phối (`order_coordinations.metadata.customerPhone`) chuyển sang cột bản mã `customer_phone` + `customer_phone_hash`
-- (ứng dụng tách khoá khỏi `metadata` khi ghi; dòng cũ do job `encryptPendingPii` xử lý sau deploy).
--
-- Cách làm: chép bản mã `*_enc` ĐÈ LÊN chính cột rõ (cột Json nhận chuỗi bản mã), giữ nguyên `*_enc` — bản đang chạy
-- trong lúc deploy (P-5b) vẫn đọc `*_enc` nên không lỗi, và quay lại P-5b được. P-5d bỏ các cột `*_enc`.
-- Chốt trước khi đè: mọi giá trị rõ khác null đã có bản mã (và số điện thoại đã có băm), không có hai khách cùng số
-- trong một tổ chức. Thiếu → RAISE, cả giao dịch cuộn lại, không đổi gì: đặt `PII_ENCRYPTION_KEY`, chạy
-- `npm run pii:backfill`, gộp khách trùng số (runbook §14) rồi deploy lại. Thông báo chỉ có tên bảng/cột và số dòng.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- P5C-VERIFY-BEGIN (test `pii-contract.test.ts` chạy lại đúng khối này)
DO $$
DECLARE
  c record;
  bad bigint;
  problems text := '';
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('customers', 'phone', 'phone_enc', 'phone_hash', false),
    ('customers', 'email', 'email_enc', NULL, false),
    ('customers', 'address', 'address_enc', NULL, false),
    ('customers', 'notes', 'notes_enc', NULL, false),
    ('leads', 'phone', 'phone_enc', 'phone_hash', false),
    ('leads', 'message', 'message_enc', NULL, false),
    ('greeting_sessions', 'customer_phone', 'customer_phone_enc', 'customer_phone_hash', false),
    ('order_recipients', 'recipient_phone', 'recipient_phone_enc', NULL, false),
    ('order_recipients', 'address_line', 'address_line_enc', NULL, false),
    ('order_recipients', 'address_parts', 'address_parts_enc', NULL, true),
    ('order_recipients', 'vat_company_name', 'vat_company_name_enc', NULL, false),
    ('order_recipients', 'vat_tax_code', 'vat_tax_code_enc', NULL, false),
    ('order_recipients', 'vat_company_address', 'vat_company_address_enc', NULL, false),
    ('order_recipients', 'vat_email', 'vat_email_enc', NULL, false),
    ('order_coordinations', 'shipper_phone', 'shipper_phone_enc', NULL, false)
  ) AS t(tbl, col, enc, hash, is_json) LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I WHERE %I IS NOT NULL %s AND (%I IS NULL OR %I NOT LIKE ''pii1.%%''%s)',
      c.tbl, c.col, CASE WHEN c.is_json THEN format('AND jsonb_typeof(%I) <> ''null''', c.col) ELSE '' END,
      c.enc, c.enc, CASE WHEN c.hash IS NULL THEN '' ELSE format(' OR %I IS NULL', c.hash) END
    ) INTO bad;
    IF bad > 0 THEN problems := problems || format(' %s.%s: %s dòng chưa mã hoá/băm;', c.tbl, c.col, bad); END IF;
  END LOOP;
  SELECT count(*) INTO bad FROM (
    SELECT 1 FROM "customers" WHERE "phone_hash" IS NOT NULL GROUP BY "organization_id", "phone_hash" HAVING count(*) > 1
  ) d;
  IF bad > 0 THEN problems := problems || format(' customers: %s nhóm khách trùng số điện thoại trong cùng tổ chức;', bad); END IF;
  IF problems <> '' THEN
    RAISE EXCEPTION 'P-5c: dừng, không đổi gì —%', problems
      USING HINT = 'Đặt PII_ENCRYPTION_KEY, chạy npm run pii:backfill, gộp khách trùng số (runbook vận hành §14) rồi deploy lại';
  END IF;
END $$;
-- P5C-VERIFY-END

-- Bản mã đè lên cột rõ (giữ null là null)
-- P5C-INPLACE-BEGIN
UPDATE "customers" SET
  "phone" = "phone_enc",
  "email" = CASE WHEN "email" IS NOT NULL THEN "email_enc" END,
  "address" = CASE WHEN "address" IS NOT NULL THEN "address_enc" END,
  "notes" = CASE WHEN "notes" IS NOT NULL THEN "notes_enc" END;
UPDATE "leads" SET
  "phone" = "phone_enc",
  "message" = CASE WHEN "message" IS NOT NULL THEN "message_enc" END;
UPDATE "greeting_sessions" SET "customer_phone" = "customer_phone_enc" WHERE "customer_phone" IS NOT NULL;
UPDATE "order_recipients" SET
  "recipient_phone" = CASE WHEN "recipient_phone" IS NOT NULL THEN "recipient_phone_enc" END,
  "address_line" = CASE WHEN "address_line" IS NOT NULL THEN "address_line_enc" END,
  "address_parts" = CASE WHEN "address_parts" IS NOT NULL AND jsonb_typeof("address_parts") <> 'null' THEN to_jsonb("address_parts_enc") END,
  "vat_company_name" = CASE WHEN "vat_company_name" IS NOT NULL THEN "vat_company_name_enc" END,
  "vat_tax_code" = CASE WHEN "vat_tax_code" IS NOT NULL THEN "vat_tax_code_enc" END,
  "vat_company_address" = CASE WHEN "vat_company_address" IS NOT NULL THEN "vat_company_address_enc" END,
  "vat_email" = CASE WHEN "vat_email" IS NOT NULL THEN "vat_email_enc" END;
UPDATE "order_coordinations" SET "shipper_phone" = "shipper_phone_enc" WHERE "shipper_phone" IS NOT NULL;
-- P5C-INPLACE-END

-- Ràng buộc/chỉ mục theo cột rõ → theo băm (cột số giờ là bản mã, mỗi lần ghi một IV)
DROP INDEX "customers_organization_id_phone_hash_idx";
DROP INDEX "customers_organization_id_phone_key";
DROP INDEX "leads_organization_id_phone_created_at_idx";
DROP INDEX "leads_organization_id_phone_hash_idx";
CREATE UNIQUE INDEX "customers_organization_id_phone_hash_key" ON "customers"("organization_id", "phone_hash");
CREATE INDEX "leads_organization_id_phone_hash_created_at_idx" ON "leads"("organization_id", "phone_hash", "created_at");

-- SĐT khách lẻ của đơn điều phối (khỏi `metadata.customerPhone`)
ALTER TABLE "order_coordinations" ADD COLUMN "customer_phone" TEXT, ADD COLUMN "customer_phone_hash" TEXT;
CREATE INDEX "order_coordinations_organization_id_customer_phone_hash_idx" ON "order_coordinations"("organization_id", "customer_phone_hash");

COMMIT;
