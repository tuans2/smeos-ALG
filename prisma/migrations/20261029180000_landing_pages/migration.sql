-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "page_type" TEXT,
    "occasion_label" TEXT,
    "input" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landing_pages_organization_id_idx" ON "landing_pages"("organization_id");

-- CreateIndex
CREATE INDEX "landing_pages_organization_id_created_at_idx" ON "landing_pages"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

