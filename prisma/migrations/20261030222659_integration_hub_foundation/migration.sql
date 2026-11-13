-- CreateEnum
CREATE TYPE "integration_connection_status" AS ENUM ('DRAFT', 'CONNECTING', 'ACTIVE', 'DEGRADED', 'EXPIRED', 'ERROR', 'DISCONNECTED', 'DISABLED_BY_UPPER');

-- CreateEnum
CREATE TYPE "integration_event_direction" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "integration_event_status" AS ENUM ('PENDING', 'DONE', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "integration_governance_mode" AS ENUM ('FORBID', 'INHERIT_ONLY', 'ALLOW_OWN');

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "connector_key" TEXT NOT NULL,
    "scope_tier" TEXT NOT NULL,
    "external_account_id" TEXT NOT NULL DEFAULT '',
    "display_name" TEXT NOT NULL,
    "status" "integration_connection_status" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL DEFAULT '{}',
    "credential_encrypted" TEXT,
    "credential_hint" TEXT,
    "connection_ref" TEXT NOT NULL,
    "inherited_from_org_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "last_health_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "direction" "integration_event_direction" NOT NULL,
    "event_type" TEXT NOT NULL,
    "external_event_id" TEXT,
    "status" "integration_event_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "error_code" TEXT,
    "payload_redacted" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_cursors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "cursor" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_governance" (
    "id" TEXT NOT NULL,
    "connector_key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "mode" "integration_governance_mode" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_governance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_connection_ref_key" ON "integration_connections"("connection_ref");

-- CreateIndex
CREATE INDEX "integration_connections_organization_id_idx" ON "integration_connections"("organization_id");

-- CreateIndex
CREATE INDEX "integration_connections_status_last_health_at_idx" ON "integration_connections"("status", "last_health_at");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_organization_id_connector_key_exter_key" ON "integration_connections"("organization_id", "connector_key", "external_account_id");

-- CreateIndex
CREATE INDEX "integration_events_organization_id_idx" ON "integration_events"("organization_id");

-- CreateIndex
CREATE INDEX "integration_events_organization_id_connection_id_created_at_idx" ON "integration_events"("organization_id", "connection_id", "created_at");

-- CreateIndex
CREATE INDEX "integration_events_status_next_retry_at_idx" ON "integration_events"("status", "next_retry_at");

-- CreateIndex
CREATE UNIQUE INDEX "integration_events_connection_id_direction_external_event_i_key" ON "integration_events"("connection_id", "direction", "external_event_id");

-- CreateIndex
CREATE INDEX "integration_sync_cursors_organization_id_idx" ON "integration_sync_cursors"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_sync_cursors_connection_id_resource_key" ON "integration_sync_cursors"("connection_id", "resource");

-- CreateIndex
CREATE INDEX "integration_governance_scope_id_idx" ON "integration_governance"("scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_governance_connector_key_tier_scope_id_key" ON "integration_governance"("connector_key", "tier", "scope_id");

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_cursors" ADD CONSTRAINT "integration_sync_cursors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_cursors" ADD CONSTRAINT "integration_sync_cursors_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
