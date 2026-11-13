-- CreateTable
CREATE TABLE "store_share_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_share_links_slug_key" ON "store_share_links"("slug");

-- CreateIndex
CREATE INDEX "store_share_links_organization_id_idx" ON "store_share_links"("organization_id");

-- CreateIndex
CREATE INDEX "store_share_links_organization_id_is_revoked_idx" ON "store_share_links"("organization_id", "is_revoked");

-- AddForeignKey
ALTER TABLE "store_share_links" ADD CONSTRAINT "store_share_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

