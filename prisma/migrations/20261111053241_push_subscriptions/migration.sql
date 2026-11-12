-- Checklist 4.30 (Web Push): thiết bị đã đồng ý nhận tin. Chỉ thêm bảng mới (expand); khoá ngoại tới `organizations`
-- giữ khoá ngắn trên bảng đó nên đặt trần chờ khoá để không treo khi bảng bận.
SET LOCAL lock_timeout = '5s';

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_success_at" TIMESTAMPTZ(3),

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_organization_id_endpoint_key" ON "push_subscriptions"("organization_id", "endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_organization_id_idx" ON "push_subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_organization_id_user_id_idx" ON "push_subscriptions"("organization_id", "user_id");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security theo tổ chức (ADR-013 D-I2), sinh bởi scripts/gen-rls-policies.mjs.
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "push_subscriptions"
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
