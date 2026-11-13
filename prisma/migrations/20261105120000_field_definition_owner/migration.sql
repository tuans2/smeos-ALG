-- Checklist ALG 1.9: trường dữ liệu do cửa hàng tự tạo thuộc về đúng tổ chức đó.
-- null = trường của nền tảng (lõi hoặc quản trị nền tảng tạo), giữ nguyên hành vi cũ.

-- AlterTable
ALTER TABLE "field_definitions" ADD COLUMN     "owner_organization_id" TEXT;

-- CreateIndex
CREATE INDEX "field_definitions_owner_organization_id_idx" ON "field_definitions"("owner_organization_id");

-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_owner_organization_id_fkey" FOREIGN KEY ("owner_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
