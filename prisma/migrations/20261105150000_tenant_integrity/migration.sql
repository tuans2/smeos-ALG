-- Hoàn thiện CSDL đợt 1a (rà soát 05/11/2026): toàn vẹn tenant.
--  * job_events, video_scenes, internal_chat_messages mang organization_id riêng,
--    khoá ghép (cha_id, organization_id) nên dòng con không thể khác tổ chức với cha.
--  * Khoá ngoại về organizations cho sessions, roles, brand_library_versions (nợ #8).
-- Trigger điền organization_id từ bảng cha khi bên ghi bỏ trống: worker/web bản cũ
-- vẫn chạy trong lúc deploy cuốn chiếu không bị lỗi NOT NULL.
-- Cả tệp chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được giữ.
BEGIN;

-- 1. Cột mới, điền từ bảng cha -------------------------------------------------
ALTER TABLE "job_events" ADD COLUMN "organization_id" TEXT;
UPDATE "job_events" e SET "organization_id" = j."organization_id"
  FROM "generation_jobs" j WHERE j."id" = e."job_id";
ALTER TABLE "job_events" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "video_scenes" ADD COLUMN "organization_id" TEXT;
UPDATE "video_scenes" s SET "organization_id" = v."organization_id"
  FROM "video_jobs" v WHERE v."id" = s."video_job_id";
ALTER TABLE "video_scenes" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "internal_chat_messages" ADD COLUMN "organization_id" TEXT;
UPDATE "internal_chat_messages" m SET "organization_id" = c."organization_id"
  FROM "internal_chat_conversations" c WHERE c."id" = m."conversation_id";
ALTER TABLE "internal_chat_messages" ALTER COLUMN "organization_id" SET NOT NULL;

-- Phiên bản thư viện thương hiệu theo tổ chức của mục cha (mục cha là nguồn đúng).
UPDATE "brand_library_versions" v SET "organization_id" = i."organization_id"
  FROM "brand_library_items" i
 WHERE i."id" = v."item_id" AND v."organization_id" <> i."organization_id";

-- Dọn tham chiếu tổ chức đã không còn (phiên: về NULL; vai riêng của tổ chức đã xoá: bỏ).
UPDATE "sessions" SET "organization_id" = NULL
 WHERE "organization_id" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "organizations" o WHERE o."id" = "sessions"."organization_id");
DELETE FROM "role_capabilities" rc USING "roles" r
 WHERE rc."role_id" = r."id" AND r."organization_id" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "organizations" o WHERE o."id" = r."organization_id");
DELETE FROM "roles" r
 WHERE r."organization_id" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "organizations" o WHERE o."id" = r."organization_id");

-- 2. Trigger điền organization_id từ bảng cha ---------------------------------
CREATE OR REPLACE FUNCTION smeos_fill_org_from_parent() RETURNS trigger AS $$
BEGIN
  IF NEW."organization_id" IS NULL THEN
    IF TG_TABLE_NAME = 'job_events' THEN
      SELECT "organization_id" INTO NEW."organization_id" FROM "generation_jobs" WHERE "id" = NEW."job_id";
    ELSIF TG_TABLE_NAME = 'video_scenes' THEN
      SELECT "organization_id" INTO NEW."organization_id" FROM "video_jobs" WHERE "id" = NEW."video_job_id";
    ELSIF TG_TABLE_NAME = 'internal_chat_messages' THEN
      SELECT "organization_id" INTO NEW."organization_id" FROM "internal_chat_conversations" WHERE "id" = NEW."conversation_id";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "job_events_fill_org" BEFORE INSERT ON "job_events"
  FOR EACH ROW EXECUTE FUNCTION smeos_fill_org_from_parent();
CREATE TRIGGER "video_scenes_fill_org" BEFORE INSERT ON "video_scenes"
  FOR EACH ROW EXECUTE FUNCTION smeos_fill_org_from_parent();
CREATE TRIGGER "internal_chat_messages_fill_org" BEFORE INSERT ON "internal_chat_messages"
  FOR EACH ROW EXECUTE FUNCTION smeos_fill_org_from_parent();

-- 3. Khoá ngoại cũ (một cột) nhường chỗ khoá ghép -----------------------------
ALTER TABLE "brand_library_versions" DROP CONSTRAINT "brand_library_versions_item_id_fkey";
ALTER TABLE "internal_chat_messages" DROP CONSTRAINT "internal_chat_messages_conversation_id_fkey";
ALTER TABLE "job_events" DROP CONSTRAINT "job_events_job_id_fkey";
ALTER TABLE "video_scenes" DROP CONSTRAINT "video_scenes_video_job_id_fkey";

-- Trùng với job_events_job_id_seq_key.
DROP INDEX "job_events_job_id_seq_idx";

-- 4. Index ----------------------------------------------------------------------
CREATE UNIQUE INDEX "brand_library_items_id_organization_id_key" ON "brand_library_items"("id", "organization_id");
CREATE UNIQUE INDEX "generation_jobs_id_organization_id_key" ON "generation_jobs"("id", "organization_id");
CREATE UNIQUE INDEX "internal_chat_conversations_id_organization_id_key" ON "internal_chat_conversations"("id", "organization_id");
CREATE UNIQUE INDEX "video_jobs_id_organization_id_key" ON "video_jobs"("id", "organization_id");
CREATE INDEX "internal_chat_messages_organization_id_idx" ON "internal_chat_messages"("organization_id");
CREATE INDEX "internal_chat_participants_organization_id_idx" ON "internal_chat_participants"("organization_id");
CREATE INDEX "job_events_organization_id_idx" ON "job_events"("organization_id");
CREATE INDEX "sessions_organization_id_idx" ON "sessions"("organization_id");
CREATE INDEX "video_scenes_organization_id_idx" ON "video_scenes"("organization_id");

-- 5. Khoá ngoại -----------------------------------------------------------------
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_organization_id_fkey" FOREIGN KEY ("job_id", "organization_id") REFERENCES "generation_jobs"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_library_versions" ADD CONSTRAINT "brand_library_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_library_versions" ADD CONSTRAINT "brand_library_versions_item_id_organization_id_fkey" FOREIGN KEY ("item_id", "organization_id") REFERENCES "brand_library_items"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_scenes" ADD CONSTRAINT "video_scenes_video_job_id_organization_id_fkey" FOREIGN KEY ("video_job_id", "organization_id") REFERENCES "video_jobs"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_scenes" ADD CONSTRAINT "video_scenes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_conversation_id_organization_id_fkey" FOREIGN KEY ("conversation_id", "organization_id") REFERENCES "internal_chat_conversations"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
