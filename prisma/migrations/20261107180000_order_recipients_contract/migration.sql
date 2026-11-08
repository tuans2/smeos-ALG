-- ADR-014 D-P2, bước P-3c (contract): `order_recipients` là nơi lưu DUY NHẤT của người nhận, địa chỉ giao và bên mua hoá
-- đơn VAT của đơn. PO duyệt 07/11/2026 (D-63), sau P-3b (#175, mọi chỗ đọc lấy từ bảng mới).
-- contract: bỏ tên/SĐT/địa chỉ khỏi JSON `orders.delivery_address` (giữ khoá vận hành `zone`, `notes`, `mapUrl`…) và
-- bỏ 4 cột `orders.vat_company_name`, `vat_tax_code`, `vat_company_address`, `vat_email`.
-- Chốt trước khi xoá: phần cá nhân suy từ nơi cũ (cùng phép chiếu với P-3b, `recipientFromDeliveryAddress`) phải TRÙNG
-- KHỚP `order_recipients` ở mọi đơn. Lệch → RAISE, cả giao dịch cuộn lại, không xoá gì. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- P3C-VERIFY-BEGIN (test `order-recipients.test.ts` chạy lại đúng khối này)
CREATE FUNCTION pg_temp.p3c_str(j jsonb, k text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(j -> k) = 'string' THEN NULLIF(btrim(j ->> k, E' \t\r\n'), '') END
$$;

CREATE TEMP TABLE "p3c_expected" ON COMMIT DROP AS
SELECT o."id",
  CASE WHEN jsonb_typeof(a) = 'object' THEN COALESCE(pg_temp.p3c_str(a, 'recipientName'), pg_temp.p3c_str(a, 'name')) END AS recipient_name,
  CASE WHEN jsonb_typeof(a) = 'object' THEN COALESCE(pg_temp.p3c_str(a, 'phone'), pg_temp.p3c_str(a, 'recipientPhone')) END AS recipient_phone,
  CASE
    WHEN jsonb_typeof(a) = 'string' THEN NULLIF(btrim(a #>> '{}', E' \t\r\n'), '')
    WHEN jsonb_typeof(a) = 'object' THEN COALESCE(
      pg_temp.p3c_str(a, 'street'), pg_temp.p3c_str(a, 'full_address'), pg_temp.p3c_str(a, 'fullAddress'), pg_temp.p3c_str(a, 'address'),
      pg_temp.p3c_str(a, 'formattedAddress'),
      CASE WHEN jsonb_typeof(a -> 'parts') = 'object' THEN NULLIF(concat_ws(', ',
        NULLIF(concat_ws(' ', pg_temp.p3c_str(a -> 'parts', 'houseNumber'), pg_temp.p3c_str(a -> 'parts', 'street')), ''),
        pg_temp.p3c_str(a -> 'parts', 'ward'), pg_temp.p3c_str(a -> 'parts', 'district'), pg_temp.p3c_str(a -> 'parts', 'province')), '') END)
  END AS address_line,
  CASE WHEN jsonb_typeof(a) = 'object' THEN (
    SELECT jsonb_object_agg(e.key, e.value) FROM jsonb_each(a) e
    WHERE e.key IN ('houseNumber', 'street', 'ward', 'district', 'province', 'city', 'country', 'formattedAddress',
                    'full_address', 'fullAddress', 'address', 'parts')
      AND jsonb_typeof(e.value) <> 'null'
  ) END AS address_parts
FROM "orders" o, LATERAL (SELECT o."delivery_address" AS a) d;

DO $$
DECLARE
  bad integer;
  r record;
BEGIN
  SELECT count(*) INTO bad FROM "p3c_expected" x LEFT JOIN "order_recipients" rc ON rc."order_id" = x."id"
  WHERE x.recipient_name IS DISTINCT FROM rc."recipient_name" OR x.recipient_phone IS DISTINCT FROM rc."recipient_phone"
     OR x.address_line IS DISTINCT FROM rc."address_line" OR x.address_parts IS DISTINCT FROM rc."address_parts";
  IF bad > 0 THEN
    FOR r IN (SELECT x."id" FROM "p3c_expected" x LEFT JOIN "order_recipients" rc ON rc."order_id" = x."id"
              WHERE x.recipient_name IS DISTINCT FROM rc."recipient_name" OR x.recipient_phone IS DISTINCT FROM rc."recipient_phone"
                 OR x.address_line IS DISTINCT FROM rc."address_line" OR x.address_parts IS DISTINCT FROM rc."address_parts"
              LIMIT 20) LOOP
      RAISE NOTICE 'P-3c lệch người nhận/địa chỉ: đơn %', r."id";
    END LOOP;
    RAISE EXCEPTION 'P-3c: order_recipients lệch orders.delivery_address ở % đơn — dừng, không xoá gì', bad;
  END IF;
END $$;
-- P3C-VERIFY-END

DO $$
DECLARE
  bad integer;
BEGIN
  SELECT count(*) INTO bad FROM "orders" o LEFT JOIN "order_recipients" rc ON rc."order_id" = o."id"
  WHERE o."vat_company_name" IS DISTINCT FROM rc."vat_company_name" OR o."vat_tax_code" IS DISTINCT FROM rc."vat_tax_code"
     OR o."vat_company_address" IS DISTINCT FROM rc."vat_company_address" OR o."vat_email" IS DISTINCT FROM rc."vat_email";
  IF bad > 0 THEN
    RAISE EXCEPTION 'P-3c: order_recipients lệch hoá đơn VAT trên orders ở % đơn — dừng, không xoá gì', bad;
  END IF;
END $$;

-- P3C-STRIP-BEGIN (test so với `stripRecipientPii`)
UPDATE "orders" SET "delivery_address" = CASE
    WHEN jsonb_typeof("delivery_address") = 'object' THEN NULLIF("delivery_address"
      - ARRAY['houseNumber', 'street', 'ward', 'district', 'province', 'city', 'country', 'formattedAddress', 'full_address',
              'fullAddress', 'address', 'parts', 'recipientName', 'name', 'phone', 'recipientPhone'], '{}'::jsonb)
    WHEN jsonb_typeof("delivery_address") = 'string' THEN NULL
    ELSE "delivery_address"
  END
WHERE jsonb_typeof("delivery_address") = 'string'
   OR (jsonb_typeof("delivery_address") = 'object' AND "delivery_address" ?| ARRAY['houseNumber', 'street', 'ward', 'district',
       'province', 'city', 'country', 'formattedAddress', 'full_address', 'fullAddress', 'address', 'parts', 'recipientName',
       'name', 'phone', 'recipientPhone']);
-- P3C-STRIP-END

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "vat_company_address",
DROP COLUMN "vat_company_name",
DROP COLUMN "vat_email",
DROP COLUMN "vat_tax_code";

COMMIT;
