-- Hoàn thiện CSDL đợt 2 (rà soát 05/11/2026): xoá mềm thống nhất bằng `deleted_at`
-- (giống voice_clones, music_tracks). Tin đã xoá trước đây không có mốc xoá thật —
-- nhận mốc lúc migrate.
-- Cả tệp chạy trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được giữ.
BEGIN;

ALTER TABLE "internal_chat_messages" ADD COLUMN "deleted_at" TIMESTAMPTZ(3);
UPDATE "internal_chat_messages" SET "deleted_at" = now() WHERE "is_deleted" = true;
ALTER TABLE "internal_chat_messages" DROP COLUMN "is_deleted";

COMMIT;
