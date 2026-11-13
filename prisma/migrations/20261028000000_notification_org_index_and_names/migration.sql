-- Audit 28/10/2026 (AUD-008, AUD-032, PO duyệt): chỉ mục organization_id cho hai bảng thông báo
-- và đưa tên ràng buộc/chỉ mục về đúng tên Prisma sinh ra (tên cũ bị cắt ở 63 ký tự hoặc đặt tay).
-- Mọi lệnh đều idempotent: DB đã có tên mới (vd từng `db push`) chạy lại không lỗi.

CREATE INDEX IF NOT EXISTS "notification_inbox_organization_id_idx" ON "notification_inbox"("organization_id");
CREATE INDEX IF NOT EXISTS "notification_user_preferences_organization_id_idx" ON "notification_user_preferences"("organization_id");

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_conversations_org_fkey') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_conversations_organization_id_fkey') THEN
    ALTER TABLE "internal_chat_conversations" RENAME CONSTRAINT "internal_chat_conversations_org_fkey" TO "internal_chat_conversations_organization_id_fkey";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_messages_conv_fkey') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_messages_conversation_id_fkey') THEN
    ALTER TABLE "internal_chat_messages" RENAME CONSTRAINT "internal_chat_messages_conv_fkey" TO "internal_chat_messages_conversation_id_fkey";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_messages_sender_fkey') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_messages_sender_user_id_fkey') THEN
    ALTER TABLE "internal_chat_messages" RENAME CONSTRAINT "internal_chat_messages_sender_fkey" TO "internal_chat_messages_sender_user_id_fkey";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_participants_conv_fkey') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_participants_conversation_id_fkey') THEN
    ALTER TABLE "internal_chat_participants" RENAME CONSTRAINT "internal_chat_participants_conv_fkey" TO "internal_chat_participants_conversation_id_fkey";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_participants_org_fkey') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_participants_organization_id_fkey') THEN
    ALTER TABLE "internal_chat_participants" RENAME CONSTRAINT "internal_chat_participants_org_fkey" TO "internal_chat_participants_organization_id_fkey";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_participants_user_fkey') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_chat_participants_user_id_fkey') THEN
    ALTER TABLE "internal_chat_participants" RENAME CONSTRAINT "internal_chat_participants_user_fkey" TO "internal_chat_participants_user_id_fkey";
  END IF;
END $$;

ALTER INDEX IF EXISTS "internal_chat_conversations_org_type_idx" RENAME TO "internal_chat_conversations_organization_id_conversation_ty_idx";
ALTER INDEX IF EXISTS "internal_chat_messages_conv_created_idx" RENAME TO "internal_chat_messages_conversation_id_created_at_idx";
ALTER INDEX IF EXISTS "internal_chat_participants_conv_user_key" RENAME TO "internal_chat_participants_conversation_id_user_id_key";
ALTER INDEX IF EXISTS "internal_chat_participants_user_org_idx" RENAME TO "internal_chat_participants_user_id_organization_id_idx";
ALTER INDEX IF EXISTS "notification_org_policies_organization_id_event_key_channel_rol" RENAME TO "notification_org_policies_organization_id_event_key_channel_key";
ALTER INDEX IF EXISTS "notification_store_defaults_organization_id_event_key_channel_r" RENAME TO "notification_store_defaults_organization_id_event_key_chann_key";
