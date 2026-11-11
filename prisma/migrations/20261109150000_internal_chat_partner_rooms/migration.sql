-- Chat nội bộ — phòng theo đối tác / chi nhánh và RLS liên tổ chức (kế hoạch `docs/plan/hoan-thien-chat-noi-bo.md`,
-- PO duyệt D3, D4, D9, D10 ngày 09/11/2026). Chỉ THÊM cột nullable, index, khoá ngoại, trigger và thay policy —
-- không xoá dữ liệu. Hoàn tác: DROP các cột mới + chạy lại policy cũ ở migration 20261106020000_row_level_security.

-- 1. Cột mới --------------------------------------------------------------------
ALTER TABLE "branches" ADD COLUMN     "partner_org_id" TEXT;

ALTER TABLE "internal_chat_conversations" ADD COLUMN     "branch_id" TEXT,
ADD COLUMN     "counterpart_org_id" TEXT,
ADD COLUMN     "room_key" TEXT;

ALTER TABLE "internal_chat_messages" ADD COLUMN     "counterpart_org_id" TEXT;

CREATE INDEX "branches_partner_org_id_idx" ON "branches"("partner_org_id");
CREATE UNIQUE INDEX "branches_organization_id_partner_org_id_key" ON "branches"("organization_id", "partner_org_id");
CREATE INDEX "internal_chat_conversations_counterpart_org_id_idx" ON "internal_chat_conversations"("counterpart_org_id");
CREATE INDEX "internal_chat_conversations_branch_id_idx" ON "internal_chat_conversations"("branch_id");
CREATE UNIQUE INDEX "internal_chat_conversations_organization_id_room_key_key" ON "internal_chat_conversations"("organization_id", "room_key");
CREATE INDEX "internal_chat_messages_counterpart_org_id_idx" ON "internal_chat_messages"("counterpart_org_id");

ALTER TABLE "branches" ADD CONSTRAINT "branches_partner_org_id_fkey" FOREIGN KEY ("partner_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "internal_chat_conversations" ADD CONSTRAINT "internal_chat_conversations_counterpart_org_id_fkey" FOREIGN KEY ("counterpart_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "internal_chat_conversations" ADD CONSTRAINT "internal_chat_conversations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Điền bên kia cho phòng cũ -----------------------------------------------------
-- Phòng đối tác tạo lúc cấp tài khoản ghi `metadata.partnerOrgId`; phòng tạo tay ghi `metadata.targetOrganizationId`;
-- luồng theo đơn ghi `metadata.targetPartnerOrgId`. Chỉ nhận id của tổ chức có thật và khác tổ chức chủ phòng.
UPDATE "internal_chat_conversations" c
   SET "counterpart_org_id" = x."org_id"
  FROM (
    SELECT c2."id", COALESCE(c2."metadata"->>'partnerOrgId', c2."metadata"->>'targetOrganizationId', c2."metadata"->>'targetPartnerOrgId') AS "org_id"
      FROM "internal_chat_conversations" c2
  ) x
 WHERE x."id" = c."id"
   AND x."org_id" IS NOT NULL
   AND x."org_id" <> c."organization_id"
   AND EXISTS (SELECT 1 FROM "organizations" o WHERE o."id" = x."org_id");

-- Khoá chống trùng cho phòng đối tác: phòng cũ nhất của mỗi cặp giữ khoá, phòng trùng (nếu có) giữ nguyên, không khoá.
UPDATE "internal_chat_conversations" c
   SET "room_key" = 'partner:' || c."counterpart_org_id"
  FROM (
    SELECT "id", row_number() OVER (PARTITION BY "organization_id", "counterpart_org_id" ORDER BY "created_at", "id") AS rn
      FROM "internal_chat_conversations"
     WHERE "conversation_type" = 'CHAIN_PARTNER' AND "counterpart_org_id" IS NOT NULL
  ) r
 WHERE r."id" = c."id" AND r.rn = 1;

UPDATE "internal_chat_messages" m
   SET "counterpart_org_id" = c."counterpart_org_id"
  FROM "internal_chat_conversations" c
 WHERE c."id" = m."conversation_id" AND c."counterpart_org_id" IS NOT NULL;

-- 3. Trigger sao bên kia từ phòng xuống tin (như organization_id ở 20261105150000_tenant_integrity) --------------
CREATE OR REPLACE FUNCTION smeos_fill_chat_counterpart() RETURNS trigger AS $$
BEGIN
  IF NEW."counterpart_org_id" IS NULL THEN
    SELECT "counterpart_org_id" INTO NEW."counterpart_org_id" FROM "internal_chat_conversations" WHERE "id" = NEW."conversation_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "internal_chat_messages_fill_counterpart" BEFORE INSERT ON "internal_chat_messages"
  FOR EACH ROW EXECUTE FUNCTION smeos_fill_chat_counterpart();

-- 4. RLS phòng liên tổ chức (D4): tổ chức bên kia đọc VÀ ghi được phòng + tin chung. Không dùng cửa rls_system.
DROP POLICY IF EXISTS tenant_isolation ON "internal_chat_conversations";
CREATE POLICY tenant_isolation ON "internal_chat_conversations"
  USING (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
    OR counterpart_org_id = (SELECT current_setting('app.org_id', true))
  )
  WITH CHECK (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
    OR counterpart_org_id = (SELECT current_setting('app.org_id', true))
  );

DROP POLICY IF EXISTS tenant_isolation ON "internal_chat_messages";
CREATE POLICY tenant_isolation ON "internal_chat_messages"
  USING (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
    OR counterpart_org_id = (SELECT current_setting('app.org_id', true))
  )
  WITH CHECK (
    (SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'
    OR (SELECT current_setting('app.rls_system', true)) = 'on'
    OR organization_id = (SELECT current_setting('app.org_id', true))
    OR counterpart_org_id = (SELECT current_setting('app.org_id', true))
  );
