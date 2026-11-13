-- CreateTable
CREATE TABLE "order_approval_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "basis" TEXT,
    "reason" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "collect_due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_approval_requests_organization_id_idx" ON "order_approval_requests"("organization_id");

-- CreateIndex
CREATE INDEX "order_approval_requests_organization_id_status_created_at_idx" ON "order_approval_requests"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "order_approval_requests_organization_id_order_id_idx" ON "order_approval_requests"("organization_id", "order_id");

-- AddForeignKey
ALTER TABLE "order_approval_requests" ADD CONSTRAINT "order_approval_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_approval_requests" ADD CONSTRAINT "order_approval_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
