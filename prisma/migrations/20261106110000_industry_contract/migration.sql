-- ADR-012 D-T6, bước T-6c-2 (contract): ngành chỉ còn ở cột `organizations.industry_key`.
-- contract: bỏ trigger + hàm đồng bộ `settings.industry` → `industry_key` (T-6a) và xoá khoá `settings.industry` còn
-- sót trong JSON — PO duyệt 06/11/2026, sau khi T-6c-1 (#161, mọi đường ghi tách ngành ra cột) đã chạy trên production.
-- Không đổi schema. Thứ tự: bỏ trigger trước, chép bù cột cho dòng còn trống (an toàn), báo mã lạ sẽ mất, rồi mới xoá
-- khoá JSON. Chốt cuối: không còn dòng nào có `settings.industry`. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

DROP TRIGGER IF EXISTS "organizations_sync_industry_key" ON "organizations";
DROP FUNCTION IF EXISTS smeos_organizations_sync_industry_key();

-- Chép bù: dòng có mã hợp lệ trong JSON mà cột còn trống (không phân biệt hoa thường, như T-6a)
UPDATE "organizations" o SET "industry_key" = i."key"
FROM "industries" i
WHERE o."industry_key" IS NULL AND i."key" = upper(o."settings" ->> 'industry');

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM "organizations"
  WHERE jsonb_typeof("settings") = 'object' AND "settings" ? 'industry' AND "industry_key" IS NULL;
  IF n > 0 THEN
    RAISE NOTICE 'T-6c-2: % tổ chức có settings.industry không thuộc industries — mã bị bỏ, industry_key để trống', n;
  END IF;
END $$;

UPDATE "organizations" SET "settings" = "settings" - 'industry'
WHERE jsonb_typeof("settings") = 'object' AND "settings" ? 'industry';

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM "organizations" WHERE jsonb_typeof("settings") = 'object' AND "settings" ? 'industry';
  IF n > 0 THEN
    RAISE EXCEPTION 'T-6c-2: còn % dòng có settings.industry — dừng, không đổi gì', n;
  END IF;
END $$;

COMMIT;
