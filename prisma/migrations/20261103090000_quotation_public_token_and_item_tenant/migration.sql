-- Link công khai của báo giá dùng token ngẫu nhiên thay cho mã nội bộ BG-xxxx
-- (mã đánh số tuần tự theo từng tổ chức nên đoán được và trùng giữa các tổ chức).
-- Thêm cột nullable → backfill → NOT NULL để chạy được trên bảng đã có dữ liệu.
ALTER TABLE "quotations" ADD COLUMN "public_token" TEXT;
UPDATE "quotations"
SET "public_token" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "public_token" IS NULL;
ALTER TABLE "quotations" ALTER COLUMN "public_token" SET NOT NULL;
CREATE UNIQUE INDEX "quotations_public_token_key" ON "quotations"("public_token");

-- quotation_items là bảng thuộc tenant: thêm organization_id, lấy từ báo giá cha.
ALTER TABLE "quotation_items" ADD COLUMN "organization_id" TEXT;
UPDATE "quotation_items" AS qi
SET "organization_id" = q."organization_id"
FROM "quotations" AS q
WHERE qi."quotation_id" = q."id" AND qi."organization_id" IS NULL;
ALTER TABLE "quotation_items" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE INDEX "quotation_items_organization_id_idx" ON "quotation_items"("organization_id");
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
