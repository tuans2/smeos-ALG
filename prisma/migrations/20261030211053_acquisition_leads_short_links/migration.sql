-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "source" TEXT NOT NULL,
    "source_ref" TEXT,
    "short_link_id" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "consent_at" TIMESTAMP(3) NOT NULL,
    "consent_version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignee_user_id" TEXT,
    "status_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_path" TEXT NOT NULL,
    "placement_label" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "scan_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "short_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "short_link_id" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "referrer_host" TEXT,
    "visitor_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_organization_id_idx" ON "leads"("organization_id");

-- CreateIndex
CREATE INDEX "leads_organization_id_status_created_at_idx" ON "leads"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "leads_organization_id_phone_created_at_idx" ON "leads"("organization_id", "phone", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "short_links_code_key" ON "short_links"("code");

-- CreateIndex
CREATE INDEX "short_links_organization_id_idx" ON "short_links"("organization_id");

-- CreateIndex
CREATE INDEX "short_links_organization_id_created_at_idx" ON "short_links"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "link_events_organization_id_idx" ON "link_events"("organization_id");

-- CreateIndex
CREATE INDEX "link_events_organization_id_short_link_id_created_at_idx" ON "link_events"("organization_id", "short_link_id", "created_at");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_short_link_id_fkey" FOREIGN KEY ("short_link_id") REFERENCES "short_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_events" ADD CONSTRAINT "link_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_events" ADD CONSTRAINT "link_events_short_link_id_fkey" FOREIGN KEY ("short_link_id") REFERENCES "short_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
