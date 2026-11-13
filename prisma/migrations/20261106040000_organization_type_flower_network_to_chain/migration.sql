-- ADR-012 D-T11 (D-55), bước T-8a: `FLOWER_NETWORK` và `CHAIN` chỉ khác nhãn → mọi tổ chức chuỗi lưu là `CHAIN`.
-- Chỉ đổi dữ liệu; giá trị enum `organization_type.FLOWER_NETWORK` còn giữ tới T-8b để bản đang chạy lúc deploy
-- không lỗi. Gói dịch vụ `FLOWER_NETWORK` (cột `plan`, `PLAN_FEATURES`) là khái niệm khác, không đụng.
-- Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM "organizations" WHERE "type" = 'FLOWER_NETWORK';
  IF n > 0 THEN
    RAISE NOTICE 'T-8a: đổi % tổ chức FLOWER_NETWORK → CHAIN', n;
  END IF;
END $$;

UPDATE "organizations" SET "type" = 'CHAIN', "updated_at" = now() WHERE "type" = 'FLOWER_NETWORK';

-- Yêu cầu đổi mô hình đang chờ duyệt (settings.pending_model_change.requested_type)
UPDATE "organizations"
SET "settings" = jsonb_set("settings", '{pending_model_change,requested_type}', '"CHAIN"'::jsonb, false),
    "updated_at" = now()
WHERE "settings" -> 'pending_model_change' ->> 'requested_type' = 'FLOWER_NETWORK';

COMMIT;
