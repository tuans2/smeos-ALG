-- CreateTable
CREATE TABLE "brand_library_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "share_with_members" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_library_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "asset_id" TEXT,
    "text_value" TEXT,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_library_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_library_items_organization_id_idx" ON "brand_library_items"("organization_id");

-- CreateIndex
CREATE INDEX "brand_library_items_organization_id_status_idx" ON "brand_library_items"("organization_id", "status");

-- CreateIndex
CREATE INDEX "brand_library_versions_organization_id_idx" ON "brand_library_versions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_library_versions_item_id_version_key" ON "brand_library_versions"("item_id", "version");

-- AddForeignKey
ALTER TABLE "brand_library_items" ADD CONSTRAINT "brand_library_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_library_versions" ADD CONSTRAINT "brand_library_versions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "brand_library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

