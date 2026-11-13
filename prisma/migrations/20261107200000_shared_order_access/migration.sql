-- ADR-014 D-P6, bước P-4: `shared_order_access` — quyền xem đơn của chi nhánh nhận gia công, thay cho quyền ngầm của
-- link ký (hạn cố định 14 ngày, không thu hồi được). PO duyệt 07/11/2026: làm ngay; hết quyền 7 ngày sau khi đơn đóng;
-- chi nhánh được mời mất quyền ngay khi hết vòng / chi nhánh khác nhận; tin mời chỉ ghi khu vực.
-- Bảng thuộc tổ chức: RLS như mọi bảng tenant (sinh bởi scripts/gen-rls-policies.mjs); khoá ghép (order_id,
-- organization_id) tới `orders`. Cấp quyền ban đầu từ phiên điều phối đang lưu (như `subcontractShares`).
-- Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateEnum
CREATE TYPE "shared_order_access_level" AS ENUM ('INVITED', 'ASSIGNED');

-- CreateTable
CREATE TABLE "shared_order_access" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "branch_key" TEXT NOT NULL,
    "level" "shared_order_access_level" NOT NULL,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shared_order_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_order_access_organization_id_branch_key_idx" ON "shared_order_access"("organization_id", "branch_key");

-- CreateIndex
CREATE UNIQUE INDEX "shared_order_access_order_id_branch_key_key" ON "shared_order_access"("order_id", "branch_key");

-- AddForeignKey
ALTER TABLE "shared_order_access" ADD CONSTRAINT "shared_order_access_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_order_access" ADD CONSTRAINT "shared_order_access_order_id_organization_id_fkey" FOREIGN KEY ("order_id", "organization_id") REFERENCES "orders"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security theo tổ chức (ADR-013 D-I2) — sinh bởi scripts/gen-rls-policies.mjs
ALTER TABLE "shared_order_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_order_access" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "shared_order_access"
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

-- P4-BACKFILL-BEGIN (test `shared-order-access.test.ts` chạy lại đúng khối này, so với `subcontractShares`)
INSERT INTO "shared_order_access" ("id", "organization_id", "order_id", "branch_key", "level", "updated_at")
SELECT gen_random_uuid()::text, s.organization_id, s.order_id, s.branch_key, s.level::"shared_order_access_level", now()
FROM (
  -- Đã có chi nhánh giữ/chốt đơn → chỉ chi nhánh đó
  SELECT c."organization_id", c."order_id", c."metadata" #>> '{subcontract_dispatch,claimedBranchId}' AS branch_key, 'ASSIGNED' AS level
  FROM "order_coordinations" c
  WHERE c."metadata" #>> '{subcontract_dispatch,dispatchStatus}' IN ('CLAIMED_GRACE', 'COMMITTED')
    AND COALESCE(c."metadata" #>> '{subcontract_dispatch,claimedBranchId}', '') <> ''
  UNION ALL
  -- Phiên đang mở → chi nhánh được mời ở vòng hiện tại, trừ chi nhánh đã từ chối
  SELECT c."organization_id", c."order_id", b.value, 'INVITED'
  FROM "order_coordinations" c
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(c."metadata" #> '{subcontract_dispatch,invitedBranchIds}') = 'array'
         THEN c."metadata" #> '{subcontract_dispatch,invitedBranchIds}' ELSE '[]'::jsonb END) b(value)
  WHERE c."metadata" #>> '{subcontract_dispatch,dispatchStatus}' = 'OPEN'
    AND NOT (CASE WHEN jsonb_typeof(c."metadata" #> '{subcontract_dispatch,declinedBranchIds}') = 'array'
                  THEN c."metadata" #> '{subcontract_dispatch,declinedBranchIds}' ELSE '[]'::jsonb END) ? b.value
) s
JOIN "orders" o ON o."id" = s.order_id AND o."organization_id" = s.organization_id
ON CONFLICT ("order_id", "branch_key") DO NOTHING;
-- P4-BACKFILL-END

COMMIT;
