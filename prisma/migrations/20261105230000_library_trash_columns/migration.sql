-- AlterTable
ALTER TABLE "landing_pages" ADD COLUMN     "purge_after" TIMESTAMPTZ(3),
ADD COLUMN     "trashed_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "catalog_links" ADD COLUMN     "purge_after" TIMESTAMPTZ(3),
ADD COLUMN     "trashed_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "video_jobs" ADD COLUMN     "purge_after" TIMESTAMPTZ(3),
ADD COLUMN     "trashed_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "content_generations" ADD COLUMN     "purge_after" TIMESTAMPTZ(3),
ADD COLUMN     "trashed_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "greeting_catalogs" ADD COLUMN     "purge_after" TIMESTAMPTZ(3),
ADD COLUMN     "trashed_at" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "landing_pages_purge_after_idx" ON "landing_pages"("purge_after");

-- CreateIndex
CREATE INDEX "catalog_links_purge_after_idx" ON "catalog_links"("purge_after");

-- CreateIndex
CREATE INDEX "video_jobs_purge_after_idx" ON "video_jobs"("purge_after");

-- CreateIndex
CREATE INDEX "content_generations_purge_after_idx" ON "content_generations"("purge_after");

-- CreateIndex
CREATE INDEX "greeting_catalogs_purge_after_idx" ON "greeting_catalogs"("purge_after");

