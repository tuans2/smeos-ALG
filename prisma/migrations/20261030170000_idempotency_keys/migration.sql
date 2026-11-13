-- ROADMAP E5.3: khoá idempotent dùng chung cho sự kiện đến (webhook, thanh toán).
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idempotency_keys_organization_id_idx" ON "idempotency_keys"("organization_id");
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");
CREATE UNIQUE INDEX "idempotency_keys_organization_id_scope_key_key" ON "idempotency_keys"("organization_id", "scope", "key");

ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
