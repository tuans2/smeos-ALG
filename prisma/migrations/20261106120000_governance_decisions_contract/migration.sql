-- ADR-012 D-T10, bước T-7c (contract): `governance_decisions` là nơi lưu DUY NHẤT của quyết định theo tầng.
-- contract: xoá nơi lưu cũ — bảng `notification_hard_locks`, `notification_event_visibility`, `integration_governance`
-- (+ enum `integration_governance_mode`), khoá `organizations.settings.governance_matrix` và các dòng `platform_settings`
-- `governance_matrix:*`. PO duyệt 06/11/2026, sau khi T-7b (#165, mọi đường đọc từ bảng mới, nơi lưu cũ chỉ còn ghi kép)
-- đã chạy ổn trên production.
-- Chốt trước khi xoá: quyết định hiện hành của bảng mới phải TRÙNG KHỚP nơi lưu cũ (cùng phép chiếu với migration T-7a;
-- ma trận so không kể `tier` vì tổ chức có thể đã đổi loại sau lần lưu cuối). Lệch → RAISE, cả giao dịch cuộn lại,
-- không xoá gì. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- Phép chiếu nơi lưu cũ (như T-7a: bộ lọc của `parseDecisions`, chuẩn hoá phạm vi D-T5, gộp dòng trùng về dòng mới nhất)
CREATE TEMP TABLE "t7c_legacy" ON COMMIT DROP AS
WITH matrix_org AS (
  SELECT o."id", m.key AS system, m.value AS decisions, o."updated_at"
  FROM "organizations" o, jsonb_each(o."settings" -> 'governance_matrix') m
  WHERE jsonb_typeof(o."settings" -> 'governance_matrix') = 'object'
    AND jsonb_typeof(m.value) = 'object'
    AND m.key IN ('PROMOTIONS', 'COMMITMENTS', 'POLICIES', 'PAYMENTS', 'CRAFT_FEES', 'TEMPLATES')
),
matrix_mother AS (
  SELECT substr(p."key", length('governance_matrix:') + 1) AS system, p."value" AS decisions, p."updated_at"
  FROM "platform_settings" p
  WHERE p."key" LIKE 'governance_matrix:%'
    AND jsonb_typeof(p."value") = 'object'
    AND substr(p."key", length('governance_matrix:') + 1) IN ('PROMOTIONS', 'COMMITMENTS', 'POLICIES', 'PAYMENTS', 'CRAFT_FEES', 'TEMPLATES')
),
src AS (
  SELECT 'matrix:' || mo.system AS system, ov.key AS decision_key, NULL::text AS tier, 'org:' || mo."id" AS scope,
         false AS locked, jsonb_build_object('enabled', ov.value) AS value, mo."updated_at" AS at
  FROM matrix_org mo, jsonb_each(CASE WHEN jsonb_typeof(mo.decisions -> 'overrides') = 'object' THEN mo.decisions -> 'overrides' ELSE '{}'::jsonb END) ov
  WHERE ov.key ~ '^[A-Za-z0-9_.:-]{1,96}$' AND jsonb_typeof(ov.value) = 'boolean'
  UNION ALL
  SELECT 'matrix:' || mo.system, lk.key, NULL, 'org:' || mo."id", true, jsonb_build_object('enabled', lk.value -> 'enabled'), mo."updated_at"
  FROM matrix_org mo, jsonb_each(CASE WHEN jsonb_typeof(mo.decisions -> 'locks') = 'object' THEN mo.decisions -> 'locks' ELSE '{}'::jsonb END) lk
  WHERE lk.key ~ '^[A-Za-z0-9_.:-]{1,96}$' AND jsonb_typeof(lk.value -> 'enabled') = 'boolean'
  UNION ALL
  SELECT 'matrix:' || mm.system, ov.key, NULL, 'platform', false, jsonb_build_object('enabled', ov.value), mm."updated_at"
  FROM matrix_mother mm, jsonb_each(CASE WHEN jsonb_typeof(mm.decisions -> 'overrides') = 'object' THEN mm.decisions -> 'overrides' ELSE '{}'::jsonb END) ov
  WHERE ov.key ~ '^[A-Za-z0-9_.:-]{1,96}$' AND jsonb_typeof(ov.value) = 'boolean'
  UNION ALL
  SELECT 'matrix:' || mm.system, lk.key, NULL, 'platform', true, jsonb_build_object('enabled', lk.value -> 'enabled'), mm."updated_at"
  FROM matrix_mother mm, jsonb_each(CASE WHEN jsonb_typeof(mm.decisions -> 'locks') = 'object' THEN mm.decisions -> 'locks' ELSE '{}'::jsonb END) lk
  WHERE lk.key ~ '^[A-Za-z0-9_.:-]{1,96}$' AND jsonb_typeof(lk.value -> 'enabled') = 'boolean'
  UNION ALL
  SELECT 'notification.hard_lock', h."event_key" || ':' || h."channel", h."tier",
         CASE WHEN h."scope_id" IN ('GLOBAL', 'platform') THEN 'platform'
              WHEN h."scope_id" LIKE 'industry:%' OR h."scope_id" LIKE 'org:%' OR h."scope_id" LIKE 'branch:%' THEN h."scope_id"
              ELSE 'org:' || h."scope_id" END,
         true, jsonb_build_object('enabled', h."enabled", 'reason', h."reason"), h."updated_at"
  FROM "notification_hard_locks" h
  UNION ALL
  SELECT 'notification.visibility', v."event_key" || ':' || v."tier", 'MOTHER', 'platform',
         false, jsonb_build_object('visible', v."visible"), v."updated_at"
  FROM "notification_event_visibility" v
  UNION ALL
  SELECT 'integration', g."connector_key", g."tier",
         CASE WHEN g."scope_id" IN ('GLOBAL', 'platform') THEN 'platform'
              WHEN g."scope_id" LIKE 'industry:%' OR g."scope_id" LIKE 'org:%' OR g."scope_id" LIKE 'branch:%' THEN g."scope_id"
              ELSE 'org:' || g."scope_id" END,
         true, jsonb_build_object('mode', g."mode"::text), g."updated_at"
  FROM "integration_governance" g
  WHERE g."mode"::text <> 'ALLOW_OWN'
)
SELECT DISTINCT ON (system, decision_key, tier, scope, locked) system, decision_key, tier, scope, locked, value
FROM src
ORDER BY system, decision_key, tier, scope, locked, at DESC;

-- Quyết định hiện hành của bảng mới (dòng `version` lớn nhất của mỗi quyết định, bỏ dòng gỡ); ma trận không kể `tier`.
-- Ma trận của tổ chức đã bị xoá không tính: `settings` mất theo tổ chức, còn bảng mới không có khoá ngoại tới tổ chức.
CREATE TEMP TABLE "t7c_current" ON COMMIT DROP AS
SELECT DISTINCT system, decision_key, CASE WHEN system LIKE 'matrix:%' THEN NULL ELSE tier END AS tier, scope, locked, value
FROM (
  SELECT DISTINCT ON (system, decision_key, tier, scope, locked) system, decision_key, tier, scope, locked, value
  FROM "governance_decisions"
  ORDER BY system, decision_key, tier, scope, locked, version DESC
) latest
WHERE value IS NOT NULL
  AND NOT (system LIKE 'matrix:%' AND scope LIKE 'org:%'
           AND NOT EXISTS (SELECT 1 FROM "organizations" o WHERE 'org:' || o."id" = latest.scope));

DO $$
DECLARE
  missing integer;
  extra integer;
  r record;
BEGIN
  SELECT count(*) INTO missing FROM (SELECT * FROM "t7c_legacy" EXCEPT SELECT * FROM "t7c_current") d;
  SELECT count(*) INTO extra FROM (SELECT * FROM "t7c_current" EXCEPT SELECT * FROM "t7c_legacy") d;
  IF missing > 0 OR extra > 0 THEN
    FOR r IN (SELECT 'chỉ ở nơi lưu cũ' AS side, * FROM (SELECT * FROM "t7c_legacy" EXCEPT SELECT * FROM "t7c_current") a
              UNION ALL
              SELECT 'chỉ ở governance_decisions', * FROM (SELECT * FROM "t7c_current" EXCEPT SELECT * FROM "t7c_legacy") b
              LIMIT 20) LOOP
      RAISE NOTICE 'T-7c lệch (%): % % % % % %', r.side, r.system, r.decision_key, r.tier, r.scope, r.locked, r.value;
    END LOOP;
    RAISE EXCEPTION 'T-7c: governance_decisions lệch nơi lưu cũ (thiếu %, thừa %) — dừng, không xoá gì', missing, extra;
  END IF;
END $$;

-- DropTable
DROP TABLE "integration_governance";

-- DropTable
DROP TABLE "notification_event_visibility";

-- DropTable
DROP TABLE "notification_hard_locks";

-- DropEnum
DROP TYPE "integration_governance_mode";

-- Ma trận quản trị cũ trong JSON và trong platform_settings
UPDATE "organizations" SET "settings" = "settings" - 'governance_matrix'
WHERE jsonb_typeof("settings") = 'object' AND "settings" ? 'governance_matrix';

DELETE FROM "platform_settings" WHERE "key" LIKE 'governance_matrix:%';

COMMIT;
