-- ADR-012 D-T6, bước T-6a: bảng nền tảng `industries` + cột `organizations.industry_key` (khoá ngoại), thay dần
-- `organizations.settings.industry`. Tầng Ngành vẫn chưa bật (không thêm loại tổ chức, vai hay link_type).
-- Chép ngành có sẵn từ settings; trigger giữ cột khớp `settings.industry` mỗi lần ghi settings (mọi đường ghi cũ —
-- đăng ký, Admin SaaS tạo tổ chức, dùng thử, dữ liệu mẫu, PATCH settings) cho tới T-6c bỏ `settings.industry`.
-- Chỉ thêm bảng/cột + chép dữ liệu; không xoá gì. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "industry_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "industry_key" TEXT;

-- CreateTable
CREATE TABLE "industries" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "industry_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "organizations_industry_key_idx" ON "organizations"("industry_key");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_industry_key_fkey" FOREIGN KEY ("industry_key") REFERENCES "industries"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ngành theo plugin (src/modules/organization/domain/industries); Điện hoa là dòng đầu tiên.
INSERT INTO "industries" ("key", "name") VALUES
  ('FLORAL', 'Hoa & Cây cảnh'),
  ('FASHION', 'Thời trang & May mặc'),
  ('FNB', 'Ẩm thực & Đồ uống (F&B)'),
  ('CRAFT_GIFT', 'Quà tặng & Thủ công mỹ nghệ'),
  ('RETAIL_GENERAL', 'Bán lẻ & Thương mại tổng hợp'),
  ('SERVICES', 'Dịch vụ & Kỹ thuật'),
  ('HOMESTAY', 'Homestay & Lưu trú nghỉ dưỡng')
ON CONFLICT ("key") DO NOTHING;

-- Chép từ settings.industry (không phân biệt hoa thường); mã lạ để trống và báo để rà.
UPDATE "organizations" o SET "industry_key" = i."key"
FROM "industries" i
WHERE i."key" = upper(o."settings" ->> 'industry');

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM "organizations"
  WHERE "settings" ->> 'industry' IS NOT NULL AND "industry_key" IS NULL;
  IF n > 0 THEN
    RAISE NOTICE 'T-6a: % tổ chức có settings.industry không thuộc industries — để trống industry_key, rà tay', n;
  END IF;
END $$;

-- Ghi settings.industry (đường cũ) → cập nhật industry_key trong cùng lệnh ghi.
CREATE OR REPLACE FUNCTION smeos_organizations_sync_industry_key() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."settings" IS NOT NULL AND NEW."settings" ? 'industry'
     AND (TG_OP = 'INSERT' OR (NEW."settings" ->> 'industry') IS DISTINCT FROM (OLD."settings" ->> 'industry')) THEN
    NEW."industry_key" := (SELECT i."key" FROM "industries" i WHERE i."key" = upper(NEW."settings" ->> 'industry'));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "organizations_sync_industry_key"
BEFORE INSERT OR UPDATE OF "settings" ON "organizations"
FOR EACH ROW EXECUTE FUNCTION smeos_organizations_sync_industry_key();

COMMIT;
