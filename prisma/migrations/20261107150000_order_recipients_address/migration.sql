-- ADR-014 D-P2, bước P-3b: chép lại phần địa chỉ của `order_recipients` từ JSON `orders.delivery_address` (vẫn còn đủ
-- nhờ ghi kép). P-3a chỉ giữ 5 ô / phường-quận-tỉnh; đơn điều phối còn `city`, `country`, `formattedAddress`, dữ liệu
-- cũ còn `full_address`… Từ nay `address_parts` giữ NGUYÊN mọi khoá địa chỉ như đã lưu, để chỗ đọc dựng lại đúng JSON
-- cũ (`deliveryAddressView`) và P-3c bỏ được dữ liệu cá nhân khỏi JSON mà không mất gì. Chỉ đổi dữ liệu, không đổi bảng.
-- Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- P3B-BACKFILL-BEGIN (test `order-recipients.test.ts` chạy lại đúng khối này, so với `recipientFromDeliveryAddress`)
-- Chuỗi của một khoá JSON: chỉ khi là chuỗi, bỏ khoảng trắng hai đầu, rỗng → NULL.
CREATE FUNCTION pg_temp.p3b_str(j jsonb, k text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(j -> k) = 'string' THEN NULLIF(btrim(j ->> k, E' \t\r\n'), '') END
$$;

INSERT INTO "order_recipients" ("organization_id", "order_id", "recipient_name", "recipient_phone", "address_line",
  "address_parts", "updated_at")
SELECT x.organization_id, x.id, x.recipient_name, x.recipient_phone, x.address_line, x.address_parts, now()
FROM (
  SELECT o."organization_id", o."id",
    CASE WHEN jsonb_typeof(a) = 'object' THEN COALESCE(pg_temp.p3b_str(a, 'recipientName'), pg_temp.p3b_str(a, 'name')) END AS recipient_name,
    CASE WHEN jsonb_typeof(a) = 'object' THEN COALESCE(pg_temp.p3b_str(a, 'phone'), pg_temp.p3b_str(a, 'recipientPhone')) END AS recipient_phone,
    CASE
      WHEN jsonb_typeof(a) = 'string' THEN NULLIF(btrim(a #>> '{}', E' \t\r\n'), '')
      WHEN jsonb_typeof(a) = 'object' THEN COALESCE(
        pg_temp.p3b_str(a, 'street'), pg_temp.p3b_str(a, 'full_address'), pg_temp.p3b_str(a, 'fullAddress'), pg_temp.p3b_str(a, 'address'),
        pg_temp.p3b_str(a, 'formattedAddress'),
        CASE WHEN jsonb_typeof(a -> 'parts') = 'object' THEN NULLIF(concat_ws(', ',
          NULLIF(concat_ws(' ', pg_temp.p3b_str(a -> 'parts', 'houseNumber'), pg_temp.p3b_str(a -> 'parts', 'street')), ''),
          pg_temp.p3b_str(a -> 'parts', 'ward'), pg_temp.p3b_str(a -> 'parts', 'district'), pg_temp.p3b_str(a -> 'parts', 'province')), '') END)
    END AS address_line,
    CASE WHEN jsonb_typeof(a) = 'object' THEN (
      SELECT jsonb_object_agg(e.key, e.value) FROM jsonb_each(a) e
      WHERE e.key IN ('houseNumber', 'street', 'ward', 'district', 'province', 'city', 'country', 'formattedAddress',
                      'full_address', 'fullAddress', 'address', 'parts')
        AND jsonb_typeof(e.value) <> 'null'
    ) END AS address_parts
  FROM "orders" o, LATERAL (SELECT o."delivery_address" AS a) d
) x
WHERE COALESCE(x.recipient_name, x.recipient_phone, x.address_line, x.address_parts::text) IS NOT NULL
ON CONFLICT ("order_id") DO UPDATE SET
  "recipient_name" = EXCLUDED."recipient_name", "recipient_phone" = EXCLUDED."recipient_phone",
  "address_line" = EXCLUDED."address_line", "address_parts" = EXCLUDED."address_parts", "updated_at" = now();

DROP FUNCTION pg_temp.p3b_str(jsonb, text);
-- P3B-BACKFILL-END

COMMIT;
