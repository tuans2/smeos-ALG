-- Checklist ALG 9.3: thông điệp thương hiệu và khách mục tiêu trong hồ sơ kinh doanh (ngữ cảnh AI).

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "brand_message" TEXT,
ADD COLUMN     "target_customers" JSONB;

