-- Đợt 4 (checklist ALG 10.3–10.7, 9.7): sổ cái credit, hạn mức tháng, chi phí nhà cung cấp, gói thuê bao và hoá đơn.

-- CreateEnum
CREATE TYPE "credit_transaction_kind" AS ENUM ('OPENING', 'TOPUP', 'GIFT', 'REFUND', 'USAGE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "subscription_cycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('ACTIVE', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "subscription_invoice_status" AS ENUM ('PENDING', 'PAID', 'VOID');

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" "credit_transaction_kind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "service" TEXT,
    "reason" TEXT,
    "reference" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "cycle" "subscription_cycle" NOT NULL,
    "price_vnd" INTEGER NOT NULL,
    "included_credits_monthly" INTEGER NOT NULL DEFAULT 0,
    "status" "subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMPTZ(3) NOT NULL,
    "current_period_end" TIMESTAMPTZ(3) NOT NULL,
    "plan_credit_period" TEXT,
    "plan_credit_granted" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "amount_vnd" INTEGER NOT NULL,
    "status" "subscription_invoice_status" NOT NULL DEFAULT 'PENDING',
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "payment_reference" TEXT,
    "reminded_7d" BOOLEAN NOT NULL DEFAULT false,
    "reminded_1d" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_cost_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "cost_usd" DOUBLE PRECISION,
    "cost_vnd" INTEGER NOT NULL,
    "reference" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_cost_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_limits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "monthly_limit" INTEGER,
    "used" INTEGER NOT NULL DEFAULT 0,
    "alerted_near" BOOLEAN NOT NULL DEFAULT false,
    "alerted_low" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usage_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_organization_id_idx" ON "credit_transactions"("organization_id");

-- CreateIndex
CREATE INDEX "credit_transactions_organization_id_created_at_idx" ON "credit_transactions"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_id_organization_id_key" ON "subscriptions"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_code_key" ON "subscription_invoices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_payment_reference_key" ON "subscription_invoices"("payment_reference");

-- CreateIndex
CREATE INDEX "subscription_invoices_organization_id_idx" ON "subscription_invoices"("organization_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_status_due_at_idx" ON "subscription_invoices"("status", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_subscription_id_period_start_key" ON "subscription_invoices"("subscription_id", "period_start");

-- CreateIndex
CREATE INDEX "provider_cost_entries_organization_id_idx" ON "provider_cost_entries"("organization_id");

-- CreateIndex
CREATE INDEX "provider_cost_entries_organization_id_occurred_at_idx" ON "provider_cost_entries"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "usage_limits_organization_id_idx" ON "usage_limits"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_limits_organization_id_service_period_key" ON "usage_limits"("organization_id", "service", "period");

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_organization_id_fkey" FOREIGN KEY ("subscription_id", "organization_id") REFERENCES "subscriptions"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_cost_entries" ADD CONSTRAINT "provider_cost_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_limits" ADD CONSTRAINT "usage_limits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Số dư đầu kỳ: mỗi tổ chức đang có credit nhận một dòng OPENING để sổ cái khớp số dư hiện tại
INSERT INTO "credit_transactions" ("id", "organization_id", "kind", "amount", "balance_after", "reason")
SELECT gen_random_uuid()::text, "id", 'OPENING', "credit_balance", "credit_balance", 'Số dư lúc mở sổ cái credit'
FROM "organizations" WHERE "credit_balance" <> 0;
