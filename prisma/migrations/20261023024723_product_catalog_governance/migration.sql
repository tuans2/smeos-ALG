-- CreateTable
CREATE TABLE "product_change_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "base_updated_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "applied_fields" JSONB,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "note" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_revisions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "import_batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_import_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_ids" JSONB NOT NULL,
    "updated_ids" JSONB NOT NULL,
    "undone_at" TIMESTAMP(3),
    "undone_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_change_requests_organization_id_idx" ON "product_change_requests"("organization_id");

-- CreateIndex
CREATE INDEX "product_change_requests_organization_id_status_idx" ON "product_change_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "product_change_requests_organization_id_product_id_idx" ON "product_change_requests"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "product_revisions_organization_id_idx" ON "product_revisions"("organization_id");

-- CreateIndex
CREATE INDEX "product_revisions_organization_id_product_id_created_at_idx" ON "product_revisions"("organization_id", "product_id", "created_at");

-- CreateIndex
CREATE INDEX "product_revisions_organization_id_import_batch_id_idx" ON "product_revisions"("organization_id", "import_batch_id");

-- CreateIndex
CREATE INDEX "product_import_batches_organization_id_idx" ON "product_import_batches"("organization_id");

-- CreateIndex
CREATE INDEX "product_import_batches_organization_id_created_at_idx" ON "product_import_batches"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "product_change_requests" ADD CONSTRAINT "product_change_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_change_requests" ADD CONSTRAINT "product_change_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_revisions" ADD CONSTRAINT "product_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_revisions" ADD CONSTRAINT "product_revisions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_import_batches" ADD CONSTRAINT "product_import_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
