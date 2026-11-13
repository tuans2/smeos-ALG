-- Checklist ALG 3.8: phí vận chuyển và phiên bản kích cỡ trên báo giá
ALTER TABLE "quotations" ADD COLUMN "shipping_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotation_items" ADD COLUMN "variant_label" TEXT;

-- Checklist ALG 3.10: lịch sử phiên bản báo giá
CREATE TABLE "quotation_revisions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quotation_revisions_quotation_id_version_key" ON "quotation_revisions"("quotation_id", "version");
CREATE INDEX "quotation_revisions_organization_id_idx" ON "quotation_revisions"("organization_id");
CREATE INDEX "quotation_revisions_organization_id_quotation_id_idx" ON "quotation_revisions"("organization_id", "quotation_id");

ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
