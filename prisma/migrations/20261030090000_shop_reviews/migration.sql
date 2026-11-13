-- CreateTable
CREATE TABLE "shop_reviews" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "occasion" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_reviews_organization_id_idx" ON "shop_reviews"("organization_id");

-- CreateIndex
CREATE INDEX "shop_reviews_organization_id_is_visible_idx" ON "shop_reviews"("organization_id", "is_visible");

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

