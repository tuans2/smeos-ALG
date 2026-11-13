-- CreateTable: notification_channel_activations, notification_event_visibility, notification_hard_locks, notification_org_policies, notification_store_defaults, notification_user_preferences, notification_inbox
-- Module: Notification (Multi-Tier, Multi-Role Cascading Architecture)

CREATE TABLE IF NOT EXISTS "notification_channel_activations" (
    "channel" TEXT NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_channel_activations_pkey" PRIMARY KEY ("channel")
);

CREATE TABLE IF NOT EXISTS "notification_event_visibility" (
    "event_key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_event_visibility_pkey" PRIMARY KEY ("event_key","tier")
);

CREATE TABLE IF NOT EXISTS "notification_hard_locks" (
    "id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "locked_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_hard_locks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_org_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "role_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority_override" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_org_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_store_defaults" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "role_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "schedule_start" TEXT,
    "schedule_end" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_store_defaults_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "mute_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_inbox" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "deep_link" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_inbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_hard_locks_event_key_channel_tier_scope_id_key" ON "notification_hard_locks"("event_key", "channel", "tier", "scope_id");
CREATE INDEX IF NOT EXISTS "notification_hard_locks_tier_scope_id_idx" ON "notification_hard_locks"("tier", "scope_id");

CREATE UNIQUE INDEX IF NOT EXISTS "notification_org_policies_organization_id_event_key_channel_role_key_key" ON "notification_org_policies"("organization_id", "event_key", "channel", "role_key");
CREATE INDEX IF NOT EXISTS "notification_org_policies_organization_id_idx" ON "notification_org_policies"("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "notification_store_defaults_organization_id_event_key_channel_role_key_key" ON "notification_store_defaults"("organization_id", "event_key", "channel", "role_key");
CREATE INDEX IF NOT EXISTS "notification_store_defaults_organization_id_role_key_idx" ON "notification_store_defaults"("organization_id", "role_key");

CREATE UNIQUE INDEX IF NOT EXISTS "notification_user_preferences_user_id_organization_id_event_key_channel_key" ON "notification_user_preferences"("user_id", "organization_id", "event_key", "channel");
CREATE INDEX IF NOT EXISTS "notification_user_preferences_user_id_organization_id_idx" ON "notification_user_preferences"("user_id", "organization_id");

CREATE INDEX IF NOT EXISTS "notification_inbox_user_id_organization_id_is_read_idx" ON "notification_inbox"("user_id", "organization_id", "is_read");
CREATE INDEX IF NOT EXISTS "notification_inbox_user_id_organization_id_created_at_idx" ON "notification_inbox"("user_id", "organization_id", "created_at");

ALTER TABLE "notification_org_policies" ADD CONSTRAINT "notification_org_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_store_defaults" ADD CONSTRAINT "notification_store_defaults_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_user_preferences" ADD CONSTRAINT "notification_user_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_inbox" ADD CONSTRAINT "notification_inbox_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
