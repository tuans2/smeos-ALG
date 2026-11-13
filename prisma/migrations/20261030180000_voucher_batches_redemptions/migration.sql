-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "per_customer_limit" INTEGER,
ADD COLUMN     "promotion_id" TEXT,
ADD COLUMN     "starts_at" TIMESTAMP(3),
ADD COLUMN     "usage_limit" INTEGER DEFAULT 1,
ADD COLUMN     "used_count" INTEGER NOT NULL DEFAULT 0;

-- Mã cũ dùng một lần: đã dùng = 1 lượt
UPDATE "vouchers" SET "used_count" = 1 WHERE "is_used" = true;

-- CreateTable
CREATE TABLE "voucher_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "promotion_id" TEXT,
    "code_prefix" TEXT,
    "quantity" INTEGER NOT NULL,
    "discount_type" "voucher_discount_type" NOT NULL,
    "discount_value" DECIMAL(14,2) NOT NULL,
    "min_order_vnd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "max_discount_vnd" DECIMAL(14,2),
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "usage_limit" INTEGER,
    "per_customer_limit" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_redemptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "voucher_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voucher_batches_organization_id_idx" ON "voucher_batches"("organization_id");

-- CreateIndex
CREATE INDEX "voucher_redemptions_organization_id_idx" ON "voucher_redemptions"("organization_id");

-- CreateIndex
CREATE INDEX "voucher_redemptions_organization_id_order_id_idx" ON "voucher_redemptions"("organization_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_redemptions_voucher_id_order_id_key" ON "voucher_redemptions"("voucher_id", "order_id");

-- CreateIndex
CREATE INDEX "vouchers_organization_id_batch_id_idx" ON "vouchers"("organization_id", "batch_id");

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "voucher_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_batches" ADD CONSTRAINT "voucher_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

