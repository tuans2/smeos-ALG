-- Bước 4 "Đăng tự động" của nhóm Tạo nội dung (PO 08/11/2026, duyệt lược đồ cùng ngày): module social-publishing
-- thay phần đăng bài của SocialFlow. Chỉ thêm 2 bảng mới, không sửa dữ liệu cũ. Bảng thuộc tổ chức có chính sách RLS
-- như mọi bảng thuộc tổ chức (ADR-013 D-I2).
BEGIN;
SET LOCAL lock_timeout = '5s';
-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "content_generation_id" TEXT,
    "product_id" TEXT,
    "channel" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hashtags" JSONB NOT NULL DEFAULT '[]',
    "media_asset_ids" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
    "next_attempt_at" TIMESTAMPTZ(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(3),
    "external_post_id" TEXT,
    "external_url" TEXT,
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_post_attempts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "social_post_id" TEXT NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "external_post_id" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_post_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_posts_organization_id_created_at_idx" ON "social_posts"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "social_posts_status_next_attempt_at_idx" ON "social_posts"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "social_posts_content_generation_id_idx" ON "social_posts"("content_generation_id");

-- CreateIndex
CREATE INDEX "social_posts_product_id_idx" ON "social_posts"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_organization_id_idempotency_key_key" ON "social_posts"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "social_post_attempts_organization_id_idx" ON "social_post_attempts"("organization_id");

-- CreateIndex
CREATE INDEX "social_post_attempts_social_post_id_created_at_idx" ON "social_post_attempts"("social_post_id", "created_at");

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_content_generation_id_fkey" FOREIGN KEY ("content_generation_id") REFERENCES "content_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_attempts" ADD CONSTRAINT "social_post_attempts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_attempts" ADD CONSTRAINT "social_post_attempts_social_post_id_fkey" FOREIGN KEY ("social_post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_channel_check" CHECK ("channel" IN ('facebook', 'instagram', 'zalo', 'tiktok'));
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_status_check" CHECK ("status" IN ('QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED'));
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_attempt_count_check" CHECK ("attempt_count" >= 0);
ALTER TABLE "social_post_attempts" ADD CONSTRAINT "social_post_attempts_outcome_check" CHECK ("outcome" IN ('PUBLISHED', 'RETRY', 'FAILED'));

ALTER TABLE "social_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_posts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "social_posts"
  USING (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
  )
  WITH CHECK (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
  );

ALTER TABLE "social_post_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_post_attempts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "social_post_attempts"
  USING (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
  )
  WITH CHECK (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
  );

COMMIT;
