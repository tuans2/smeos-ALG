-- AlterTable
ALTER TABLE "chain_branches" ADD COLUMN     "district" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "service_wards" JSONB,
ADD COLUMN     "ward" TEXT;

