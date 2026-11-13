-- CreateTable: internal_chat_conversations, participants, messages
-- Module: InternalChat (ChainOS / PlatformOS)
CREATE TABLE IF NOT EXISTS "internal_chat_conversations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "conversation_type" TEXT NOT NULL,
    "title" TEXT,
    "order_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "internal_chat_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "internal_chat_participants" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role_in_chat" TEXT NOT NULL DEFAULT 'MEMBER',
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "internal_chat_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "internal_chat_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "sender_role" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL DEFAULT '',
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action_payload" JSONB,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "internal_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "internal_chat_conversations_org_type_idx" ON "internal_chat_conversations"("organization_id", "conversation_type");
CREATE INDEX IF NOT EXISTS "internal_chat_conversations_order_id_idx" ON "internal_chat_conversations"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "internal_chat_participants_conv_user_key" ON "internal_chat_participants"("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "internal_chat_participants_user_org_idx" ON "internal_chat_participants"("user_id", "organization_id");
CREATE INDEX IF NOT EXISTS "internal_chat_messages_conv_created_idx" ON "internal_chat_messages"("conversation_id", "created_at");

ALTER TABLE "internal_chat_conversations" ADD CONSTRAINT "internal_chat_conversations_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_chat_participants" ADD CONSTRAINT "internal_chat_participants_conv_fkey" FOREIGN KEY ("conversation_id") REFERENCES "internal_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_chat_participants" ADD CONSTRAINT "internal_chat_participants_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_chat_participants" ADD CONSTRAINT "internal_chat_participants_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_conv_fkey" FOREIGN KEY ("conversation_id") REFERENCES "internal_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_sender_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
