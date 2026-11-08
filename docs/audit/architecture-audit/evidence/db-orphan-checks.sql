-- Bằng chứng cho `20_DATABASE_ARCHITECTURE_AUDIT.md` — đếm bản ghi mồ côi và tham chiếu xuyên tổ chức.
-- CHỈ ĐỌC (SELECT + DO với RAISE NOTICE). Chạy trên BẢN KHÔI PHỤC của production hoặc staging, bằng tài khoản
-- chỉ đọc; không chạy trên CSDL production đang phục vụ (quét toàn bảng).
--   psql -d <ban_khoi_phuc> -f docs/audit/architecture-audit/evidence/db-orphan-checks.sql
-- Kết quả mong đợi: mọi dòng = 0. Dòng > 0 là dữ liệu cần xử lý trước khi thêm khoá ngoại tương ứng.

\echo == A. Tham chiếu xuyên tổ chức qua khoá ngoại MỘT cột giữa hai bảng tenant (con.organization_id <> cha.organization_id)
DO $$
DECLARE r record; n bigint;
BEGIN
  FOR r IN
    SELECT k.conrelid::regclass AS child, k.confrelid::regclass AS parent,
      (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = k.conrelid AND a.attnum = k.conkey[1]) AS ccol,
      (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = k.confrelid AND a.attnum = k.confkey[1]) AS pcol
    FROM pg_constraint k
    WHERE k.contype = 'f' AND k.connamespace = 'public'::regnamespace AND array_length(k.conkey, 1) = 1
      AND k.confrelid <> 'organizations'::regclass
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = k.conrelid AND a.attname = 'organization_id')
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = k.confrelid AND a.attname = 'organization_id')
  LOOP
    EXECUTE format('SELECT count(*) FROM %s c JOIN %s p ON p.%I = c.%I WHERE c.organization_id IS DISTINCT FROM p.organization_id',
      r.child, r.parent, r.pcol, r.ccol) INTO n;
    IF n > 0 THEN RAISE NOTICE 'XUYEN_TO_CHUC %.% -> % : %', r.child, r.ccol, r.parent, n; END IF;
  END LOOP;
  RAISE NOTICE 'A xong';
END $$;

\echo == B. Cột trỏ users.id không có khoá ngoại
SELECT 'audit_logs.user_id' AS col, count(*) FROM audit_logs x WHERE x.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.user_id)
UNION ALL SELECT 'generation_jobs.user_id', count(*) FROM generation_jobs x WHERE x.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.user_id)
UNION ALL SELECT 'usage.user_id', count(*) FROM usage x WHERE x.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.user_id)
UNION ALL SELECT 'notification_inbox.user_id', count(*) FROM notification_inbox x WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.user_id)
UNION ALL SELECT 'orders.owner_sale_id', count(*) FROM orders x WHERE x.owner_sale_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.owner_sale_id)
UNION ALL SELECT 'order_assignments.assignee_id', count(*) FROM order_assignments x WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.assignee_id)
UNION ALL SELECT 'order_coordinations.coordinator_id', count(*) FROM order_coordinations x WHERE x.coordinator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.coordinator_id)
UNION ALL SELECT 'order_coordinations.sales_owner_id', count(*) FROM order_coordinations x WHERE x.sales_owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.sales_owner_id)
UNION ALL SELECT 'order_qc_records.inspector_id', count(*) FROM order_qc_records x WHERE x.inspector_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.inspector_id)
UNION ALL SELECT 'leads.assignee_user_id', count(*) FROM leads x WHERE x.assignee_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.assignee_user_id)
UNION ALL SELECT 'greeting_sessions.sale_id (bỏ giá trị giả "public")', count(*) FROM greeting_sessions x WHERE x.sale_id <> 'public' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.sale_id)
UNION ALL SELECT 'greeting_sessions.sale_id = "public"', count(*) FROM greeting_sessions x WHERE x.sale_id = 'public'
UNION ALL SELECT 'greeting_share_links.owner_id', count(*) FROM greeting_share_links x WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.owner_id);

\echo == C. Cột trỏ assets.id không có khoá ngoại (kể cả mảng JSON / text[])
SELECT 'product_images.asset_id' AS col, count(*) FROM product_images x WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = x.asset_id)
UNION ALL SELECT 'product_analyses.asset_id', count(*) FROM product_analyses x WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = x.asset_id)
UNION ALL SELECT 'order_payments.evidence_asset_id', count(*) FROM order_payments x WHERE x.evidence_asset_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = x.evidence_asset_id)
UNION ALL SELECT 'brand_profiles.logo_asset_id', count(*) FROM brand_profiles x WHERE x.logo_asset_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = x.logo_asset_id)
UNION ALL SELECT 'video_jobs.final_asset_id', count(*) FROM video_jobs x WHERE x.final_asset_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = x.final_asset_id)
UNION ALL SELECT 'campaign_packages.master_asset_id', count(*) FROM campaign_packages x WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = x.master_asset_id)
UNION ALL SELECT 'campaign_packages.variant_asset_ids[]', count(*) FROM campaign_packages x, unnest(x.variant_asset_ids) v(id) WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = v.id)
UNION ALL SELECT 'order_coordinations.finished_asset_ids (JSON)', count(*) FROM order_coordinations x, jsonb_array_elements_text(CASE WHEN jsonb_typeof(x.finished_asset_ids) = 'array' THEN x.finished_asset_ids ELSE '[]'::jsonb END) v(id) WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = v.id)
UNION ALL SELECT 'order_qc_records.image_asset_ids (JSON)', count(*) FROM order_qc_records x, jsonb_array_elements_text(CASE WHEN jsonb_typeof(x.image_asset_ids) = 'array' THEN x.image_asset_ids ELSE '[]'::jsonb END) v(id) WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id = v.id);

\echo == D. Cột trỏ generation_jobs.id không có khoá ngoại
SELECT 'ai_requests.job_id' AS col, count(*) FROM ai_requests x WHERE x.job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM generation_jobs j WHERE j.id = x.job_id)
UNION ALL SELECT 'usage.job_id', count(*) FROM usage x WHERE x.job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM generation_jobs j WHERE j.id = x.job_id)
UNION ALL SELECT 'product_analyses.job_id', count(*) FROM product_analyses x WHERE x.job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM generation_jobs j WHERE j.id = x.job_id)
UNION ALL SELECT 'product_copies.analysis_id -> product_analyses', count(*) FROM product_copies x WHERE NOT EXISTS (SELECT 1 FROM product_analyses p WHERE p.id = x.analysis_id);

\echo == E. Bất biến số tiền trên orders (không có CHECK trong CSDL)
SELECT
  count(*) FILTER (WHERE balance_vnd IS DISTINCT FROM total_vnd - paid_vnd) AS balance_lech,
  count(*) FILTER (WHERE paid_vnd < 0 OR total_vnd < 0) AS so_am,
  count(*) FILTER (WHERE paid_vnd > total_vnd) AS tra_vuot
FROM orders;

\echo == F. Số dư credit cache so với sổ credit_transactions (balance_after của giao dịch mới nhất)
SELECT count(*) AS to_chuc_lech FROM organizations o
JOIN LATERAL (SELECT t.balance_after FROM credit_transactions t WHERE t.organization_id = o.id ORDER BY t.created_at DESC, t.id DESC LIMIT 1) last ON true
WHERE last.balance_after <> o.credit_balance;

\echo == G. Mã giảm giá: bộ đếm used_count lệch với số lượt chưa trả trong voucher_redemptions
\echo    (bỏ qua mã cũ chưa từng có dòng lượt dùng — trước khi có bảng, chỉ ghi vouchers.order_id)
SELECT count(*) AS lech FROM vouchers v
WHERE EXISTS (SELECT 1 FROM voucher_redemptions r WHERE r.voucher_id = v.id)
  AND v.used_count <> (SELECT count(*) FROM voucher_redemptions r WHERE r.voucher_id = v.id AND r.released_at IS NULL);
