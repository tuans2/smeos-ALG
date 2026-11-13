-- CreateTable
CREATE TABLE "partner_marketplace_share_links" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_marketplace_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_marketplace_share_links_token_hash_key" ON "partner_marketplace_share_links"("token_hash");

-- CreateIndex
CREATE INDEX "partner_marketplace_share_links_created_at_idx" ON "partner_marketplace_share_links"("created_at");
