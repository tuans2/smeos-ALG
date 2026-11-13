-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "sku" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "cost_price_vnd" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vat_percent" INTEGER,
ADD COLUMN     "weight_grams" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_organization_id_sku_key" ON "product_variants"("organization_id", "sku");

-- CreateIndex
CREATE INDEX "products_organization_id_barcode_idx" ON "products"("organization_id", "barcode");

