-- CreateTable
CREATE TABLE "partner_marketplace_stores" (
    "id" TEXT NOT NULL,
    "match_key" TEXT NOT NULL,
    "shop_name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "profile" JSONB NOT NULL,
    "photo_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photo_source_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "search_text" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_marketplace_stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_marketplace_stores_match_key_key" ON "partner_marketplace_stores"("match_key");

-- CreateIndex
CREATE INDEX "partner_marketplace_stores_tier_idx" ON "partner_marketplace_stores"("tier");
