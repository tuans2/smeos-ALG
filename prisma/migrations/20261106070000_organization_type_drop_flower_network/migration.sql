-- ADR-012 D-T11 (D-55), bước T-8b: bỏ giá trị enum `organization_type.FLOWER_NETWORK` (chỉ khác nhãn với `CHAIN`).
-- T-8a đã đổi dữ liệu và mọi đường ghi lưu `CHAIN`; dòng nào còn sót (ghi bởi bản cũ trong lúc deploy T-8a) đổi nốt ở
-- đây trước khi đổi kiểu. Gói dịch vụ `FLOWER_NETWORK` (cột `plan`) là khái niệm khác, không đụng.
-- contract: drop enum value organization_type.FLOWER_NETWORK — PO duyệt T-8b 06/11/2026
-- Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM "organizations" WHERE "type"::text = 'FLOWER_NETWORK';
  IF n > 0 THEN
    RAISE NOTICE 'T-8b: đổi nốt % tổ chức FLOWER_NETWORK → CHAIN', n;
  END IF;
END $$;

UPDATE "organizations" SET "type" = 'CHAIN', "updated_at" = now() WHERE "type"::text = 'FLOWER_NETWORK';

UPDATE "organizations"
SET "settings" = jsonb_set("settings", '{pending_model_change,requested_type}', '"CHAIN"'::jsonb, false),
    "updated_at" = now()
WHERE "settings" -> 'pending_model_change' ->> 'requested_type' = 'FLOWER_NETWORK';

-- AlterEnum
CREATE TYPE "organization_type_new" AS ENUM ('EXPERIENCE', 'SINGLE', 'STORE', 'CHAIN');
ALTER TABLE "organizations" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "organizations" ALTER COLUMN "type" TYPE "organization_type_new" USING ("type"::text::"organization_type_new");
ALTER TYPE "organization_type" RENAME TO "organization_type_old";
ALTER TYPE "organization_type_new" RENAME TO "organization_type";
DROP TYPE "organization_type_old";
ALTER TABLE "organizations" ALTER COLUMN "type" SET DEFAULT 'SINGLE';

COMMIT;
