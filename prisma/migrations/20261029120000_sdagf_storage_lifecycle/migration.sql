-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "legal_hold_until" TIMESTAMP(3),
ADD COLUMN     "purge_after" TIMESTAMP(3),
ADD COLUMN     "trashed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "storage_outbox" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "asset_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "done_at" TIMESTAMP(3),

    CONSTRAINT "storage_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "storage_outbox_organization_id_idx" ON "storage_outbox"("organization_id");

-- CreateIndex
CREATE INDEX "storage_outbox_done_at_created_at_idx" ON "storage_outbox"("done_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "storage_outbox_op_storage_key_key" ON "storage_outbox"("op", "storage_key");

-- CreateIndex
CREATE INDEX "assets_purge_after_idx" ON "assets"("purge_after");

-- AddForeignKey
ALTER TABLE "storage_outbox" ADD CONSTRAINT "storage_outbox_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill (SDAGF P1): đưa hạn thùng rác từ metadata JSON sang cột. Chỉ lấy
-- dòng ARCHIVED có `trashed_at` dạng ISO hợp lệ; dòng ARCHIVED cũ không có
-- dấu vết thùng rác giữ purge_after NULL (cron không tự xoá).
UPDATE "assets"
SET "trashed_at" = ("metadata"->>'trashed_at')::timestamptz,
    "purge_after" = CASE
      WHEN ("metadata"->>'expires_at') ~ '^\d{4}-\d{2}-\d{2}T'
        THEN ("metadata"->>'expires_at')::timestamptz
      ELSE ("metadata"->>'trashed_at')::timestamptz + INTERVAL '30 days'
    END
WHERE "state" = 'ARCHIVED'
  AND ("metadata"->>'trashed_at') ~ '^\d{4}-\d{2}-\d{2}T';
