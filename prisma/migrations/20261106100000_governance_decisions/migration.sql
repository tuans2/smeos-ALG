-- ADR-012 D-T10, bước T-7a (expand): bảng `governance_decisions` gộp ba nơi lưu quyết định theo tầng, rồi chép dữ liệu
-- hiện có sang (ma trận quản trị của tổ chức + của Mẹ, khoá cứng + hiển thị thông báo, khoá tích hợp). Mã ghi kép từ
-- bản này; chưa đường nào đọc bảng mới (T-7b), nơi lưu cũ giữ nguyên (T-7c). Chỉ thêm bảng + dòng; không xoá, không sửa
-- dữ liệu cũ. Cả tệp chạy trong một giao dịch; chốt cuối so số dòng với nguồn, lệch thì cuộn lại.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- CreateTable
CREATE TABLE "governance_decisions" (
    "id" TEXT NOT NULL,
    "version" BIGSERIAL NOT NULL,
    "system" TEXT NOT NULL,
    "decision_key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL,
    "value" JSONB,
    "decided_by" TEXT,
    "decided_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "governance_decisions_version_key" ON "governance_decisions"("version");

-- CreateIndex
CREATE INDEX "governance_decisions_system_scope_decision_key_tier_locked__idx" ON "governance_decisions"("system", "scope", "decision_key", "tier", "locked", "version");

-- CreateIndex
CREATE INDEX "governance_decisions_scope_idx" ON "governance_decisions"("scope");

-- Nguồn chung của phần chép: mỗi quyết định đang có hiệu lực ở nơi lưu cũ, đã chuẩn hoá về dạng của bảng mới. Bộ lọc
-- giống `parseDecisions` (domain/governance-decisions.ts): đúng 6 hệ thống, khoá `^[A-Za-z0-9_.:-]{1,96}$`, giá trị boolean.
CREATE TEMP TABLE "t7a_source" ON COMMIT DROP AS
WITH matrix_org AS (
  SELECT o."id", o."type", o."updated_at", m.key AS system, m.value AS decisions
  FROM "organizations" o, jsonb_each(o."settings" -> 'governance_matrix') m
  WHERE jsonb_typeof(o."settings" -> 'governance_matrix') = 'object'
    AND jsonb_typeof(m.value) = 'object'
    AND m.key IN ('PROMOTIONS', 'COMMITMENTS', 'POLICIES', 'PAYMENTS', 'CRAFT_FEES', 'TEMPLATES')
),
matrix_mother AS (
  SELECT substr(p."key", length('governance_matrix:') + 1) AS system, p."value" AS decisions, p."updated_by", p."updated_at"
  FROM "platform_settings" p
  WHERE p."key" LIKE 'governance_matrix:%'
    AND jsonb_typeof(p."value") = 'object'
    AND substr(p."key", length('governance_matrix:') + 1) IN ('PROMOTIONS', 'COMMITMENTS', 'POLICIES', 'PAYMENTS', 'CRAFT_FEES', 'TEMPLATES')
)
-- Ma trận của tổ chức: ghi đè (locked = false) và khoá (locked = true); tầng theo loại tổ chức (organizationTierOf)
SELECT 'matrix:' || mo.system AS system, ov.key AS decision_key,
       CASE WHEN mo."type"::text = 'CHAIN' THEN 'CHAIN' ELSE 'STORE' END AS tier, 'org:' || mo."id" AS scope,
       false AS locked, jsonb_build_object('enabled', ov.value) AS value, NULL::text AS decided_by, mo."updated_at" AS decided_at
FROM matrix_org mo, jsonb_each(CASE WHEN jsonb_typeof(mo.decisions -> 'overrides') = 'object' THEN mo.decisions -> 'overrides' ELSE '{}'::jsonb END) ov
WHERE ov.key ~ '^[A-Za-z0-9_.:-]{1,96}$' AND jsonb_typeof(ov.value) = 'boolean'
UNION ALL
SELECT 'matrix:' || mo.system, lk.key,
       CASE WHEN mo."type"::text = 'CHAIN' THEN 'CHAIN' ELSE 'STORE' END, 'org:' || mo."id",
       true, jsonb_build_object('enabled', lk.value -> 'enabled'), NULL, mo."updated_at"
FROM matrix_org mo, jsonb_each(CASE WHEN jsonb_typeof(mo.decisions -> 'locks') = 'object' THEN mo.decisions -> 'locks' ELSE '{}'::jsonb END) lk
WHERE lk.key ~ '^[A-Za-z0-9_.:-]{1,96}$' AND jsonb_typeof(lk.value -> 'enabled') = 'boolean'
UNION ALL
-- Ma trận của Mẹ (`platform_settings`)
SELECT 'matrix:' || mm.system, ov.key, 'MOTHER', 'platform', false, jsonb_build_object('enabled', ov.value), mm."updated_by", mm."updated_at"
FROM matrix_mother mm, jsonb_each(CASE WHEN jsonb_typeof(mm.decisions -> 'overrides') = 'object' THEN mm.decisions -> 'overrides' ELSE '{}'::jsonb END) ov
WHERE ov.key ~ '^[A-Za-z0-9_.:-]{1,96}$' AND jsonb_typeof(ov.value) = 'boolean'
UNION ALL
SELECT 'matrix:' || mm.system, lk.key, 'MOTHER', 'platform', true, jsonb_build_object('enabled', lk.value -> 'enabled'), mm."updated_by", mm."updated_at"
FROM matrix_mother mm, jsonb_each(CASE WHEN jsonb_typeof(mm.decisions -> 'locks') = 'object' THEN mm.decisions -> 'locks' ELSE '{}'::jsonb END) lk
WHERE lk.key ~ '^[A-Za-z0-9_.:-]{1,96}$' AND jsonb_typeof(lk.value -> 'enabled') = 'boolean'
UNION ALL
-- Khoá cứng thông báo: một quyết định cho mỗi (sự kiện, kênh); phạm vi đã theo D-T5 từ T-6b, dòng dạng cũ vẫn chuẩn hoá
SELECT 'notification.hard_lock', h."event_key" || ':' || h."channel", h."tier",
       CASE WHEN h."scope_id" IN ('GLOBAL', 'platform') THEN 'platform'
            WHEN h."scope_id" LIKE 'industry:%' OR h."scope_id" LIKE 'org:%' OR h."scope_id" LIKE 'branch:%' THEN h."scope_id"
            ELSE 'org:' || h."scope_id" END,
       true, jsonb_build_object('enabled', h."enabled", 'reason', h."reason"), h."locked_by", h."updated_at"
FROM "notification_hard_locks" h
UNION ALL
-- Hiển thị sự kiện theo tầng: quyết định của Mẹ, khoá là (sự kiện, tầng được hiển thị)
SELECT 'notification.visibility', v."event_key" || ':' || v."tier", 'MOTHER', 'platform',
       false, jsonb_build_object('visible', v."visible"), v."updated_by", v."updated_at"
FROM "notification_event_visibility" v
UNION ALL
-- Khoá tích hợp (FORBID / INHERIT_ONLY; ALLOW_OWN không được lưu)
SELECT 'integration', g."connector_key", g."tier",
       CASE WHEN g."scope_id" IN ('GLOBAL', 'platform') THEN 'platform'
            WHEN g."scope_id" LIKE 'industry:%' OR g."scope_id" LIKE 'org:%' OR g."scope_id" LIKE 'branch:%' THEN g."scope_id"
            ELSE 'org:' || g."scope_id" END,
       true, jsonb_build_object('mode', g."mode"::text), g."updated_by", g."updated_at"
FROM "integration_governance" g
WHERE g."mode"::text <> 'ALLOW_OWN';

-- Dòng phạm vi dạng cũ trùng dòng dạng mới (chỉ có thể do bản cũ ghi lúc deploy T-6b): giữ dòng cập nhật sau cùng
INSERT INTO "governance_decisions" ("id", "system", "decision_key", "tier", "scope", "locked", "value", "decided_by", "decided_at")
SELECT gen_random_uuid()::text, d.system, d.decision_key, d.tier, d.scope, d.locked, d.value, d.decided_by, d.decided_at
FROM (
  SELECT DISTINCT ON (s.system, s.decision_key, s.tier, s.scope, s.locked) s.*
  FROM "t7a_source" s
  ORDER BY s.system, s.decision_key, s.tier, s.scope, s.locked, s.decided_at DESC
) d
ORDER BY d.decided_at, d.system, d.scope, d.decision_key, d.tier, d.locked;

-- Chốt: mỗi quyết định nguồn (sau khi gộp trùng) đúng một dòng, không bộ khoá nào trùng
DO $$
DECLARE
  src integer;
  dst integer;
  dup integer;
BEGIN
  SELECT count(*) INTO src FROM (SELECT DISTINCT system, decision_key, tier, scope, locked FROM "t7a_source") k;
  SELECT count(*) INTO dst FROM "governance_decisions";
  SELECT count(*) INTO dup FROM (
    SELECT 1 FROM "governance_decisions" GROUP BY "system", "decision_key", "tier", "scope", "locked" HAVING count(*) > 1
  ) d;
  IF src <> dst OR dup > 0 THEN
    RAISE EXCEPTION 'T-7a: chép lệch (nguồn %, đích %, trùng %) — dừng, không đổi gì', src, dst, dup;
  END IF;
  RAISE NOTICE 'T-7a: đã chép % quyết định sang governance_decisions', dst;
END $$;

COMMIT;
