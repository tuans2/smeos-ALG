-- Bằng chứng cho `20_DATABASE_ARCHITECTURE_AUDIT.md` — chỉ đọc catalog Postgres.
-- Chạy trên CSDL đã áp toàn bộ migration (CSDL rỗng là đủ cho mọi phép đo cấu trúc):
--   createdb smeos_audit_test
--   for f in prisma/migrations/*/migration.sql; do psql -d smeos_audit_test -v ON_ERROR_STOP=1 -1 -f "$f"; done
--   psql -d smeos_audit_test -f docs/audit/architecture-audit/evidence/db-catalog-checks.sql
-- Không chạy trên production bằng tài khoản ghi; mọi câu lệnh là SELECT.

\echo == 1. Bảng · có organization_id · organization_id cho phép NULL
SELECT count(*) AS total,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'organization_id')) AS with_org,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'organization_id' AND c.is_nullable = 'YES')) AS org_nullable
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations';

\echo == 2. Khoá ngoại theo hành vi xoá (c=CASCADE r=RESTRICT n=SET NULL a=NO ACTION)
SELECT confdeltype::text AS on_delete, count(*) FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace GROUP BY 1 ORDER BY 2 DESC;

\echo == 3. Khoá ngoại tới organizations theo hành vi xoá
SELECT confdeltype::text AS on_delete, count(*) FROM pg_constraint
WHERE contype = 'f' AND confrelid = 'organizations'::regclass GROUP BY 1;

\echo == 4. Ràng buộc chưa VALIDATE · CHECK · trigger · RLS
SELECT
  (SELECT count(*) FROM pg_constraint WHERE NOT convalidated AND connamespace = 'public'::regnamespace) AS not_valid,
  (SELECT count(*) FROM pg_constraint WHERE contype = 'c' AND connamespace = 'public'::regnamespace) AS checks,
  (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE c.relnamespace = 'public'::regnamespace AND NOT t.tgisinternal) AS triggers,
  (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relrowsecurity) AS rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS policies;

\echo == 5. Cột *_id không thuộc khoá ngoại nào
WITH fkcols AS (
  SELECT k.conrelid, a.attname FROM pg_constraint k
  JOIN LATERAL unnest(k.conkey) u(n) ON true
  JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = u.n
  WHERE k.contype = 'f')
SELECT c.table_name || '.' || c.column_name AS col FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.column_name ~ '_id$' AND c.table_name <> '_prisma_migrations'
  AND NOT EXISTS (SELECT 1 FROM fkcols f WHERE f.conrelid = ('public.' || c.table_name)::regclass AND f.attname = c.column_name)
ORDER BY 1;

\echo == 6. Khoá ngoại bảng-tenant → bảng-tenant: có kèm organization_id (ghép) hay không
WITH f AS (
  SELECT k.conrelid, k.confrelid,
    EXISTS (SELECT 1 FROM unnest(k.conkey) u(n) JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = u.n WHERE a.attname = 'organization_id') AS has_org
  FROM pg_constraint k WHERE k.contype = 'f' AND k.connamespace = 'public'::regnamespace)
SELECT has_org, count(*), string_agg(conrelid::regclass::text || '->' || confrelid::regclass::text, ', ' ORDER BY 1) AS fks
FROM f
WHERE EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = f.conrelid AND a.attname = 'organization_id')
  AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = f.confrelid AND a.attname = 'organization_id')
  AND f.confrelid <> 'organizations'::regclass
GROUP BY 1;

\echo == 7. CASCADE chạm bảng tài chính / nhật ký
SELECT conrelid::regclass::text || ' -> ' || confrelid::regclass::text AS fk FROM pg_constraint
WHERE contype = 'f' AND confdeltype = 'c' AND connamespace = 'public'::regnamespace
  AND conrelid::regclass::text ~ '(payment|invoice|credit|usage|audit|redemption|order_events|order_items|transaction|reconciliation|cost)'
ORDER BY 1;

\echo == 8. Cột trạng thái kiểu text có / không có CHECK
WITH s AS (SELECT table_name t, column_name c FROM information_schema.columns
  WHERE table_schema = 'public' AND column_name ~ '(^|_)(status|state|stage)$' AND data_type = 'text')
SELECT s.t || '.' || s.c AS col,
  EXISTS (SELECT 1 FROM pg_constraint k WHERE k.contype = 'c' AND k.conrelid = ('public.' || s.t)::regclass AND pg_get_constraintdef(k.oid) ~ s.c) AS has_check
FROM s ORDER BY 2, 1;

\echo == 9. Kiểu cột tiền
SELECT table_name || '.' || column_name AS col, data_type, numeric_precision, numeric_scale FROM information_schema.columns
WHERE table_schema = 'public' AND column_name ~ '(vnd|price|amount|cost|fee|total|balance|paid|discount)'
  AND data_type NOT IN ('timestamp with time zone', 'USER-DEFINED') ORDER BY data_type, 1;

\echo == 10. Index: tổng, unique, index biểu thức/GIN
SELECT count(*) AS idx, count(*) FILTER (WHERE i.indisunique) AS uniq,
  count(*) FILTER (WHERE i.indexprs IS NOT NULL OR am.amname <> 'btree') AS expr_or_non_btree
FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_class ic ON ic.oid = i.indexrelid JOIN pg_am am ON am.oid = ic.relam
WHERE c.relnamespace = 'public'::regnamespace;

\echo == 11. Cột JSON
SELECT count(*) AS json_cols, count(DISTINCT table_name) AS tables FROM information_schema.columns
WHERE table_schema = 'public' AND data_type IN ('json', 'jsonb');

\echo == 12. Bảng nhiều cột nhất
SELECT table_name, count(*) FROM information_schema.columns WHERE table_schema = 'public' GROUP BY 1 ORDER BY 2 DESC LIMIT 8;
