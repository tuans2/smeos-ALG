-- Checklist ALG 10.8 (PO 06/11/2026): khoá/mở tên miền riêng là mã nền tảng N20.
-- Chỉ dữ liệu, không đổi cấu trúc bảng. Superadmin = người vận hành chưa bị thu quyền và đang
-- giữ ĐỦ 16 mã nền tảng có trước N20 (N1–N8, N12–N19). Người chỉ có một phần mã không được cấp.
-- Chạy lại an toàn (ON CONFLICT DO NOTHING).
INSERT INTO "platform_role_capabilities" ("id", "operator_id", "capability_code")
SELECT gen_random_uuid()::text, o."id", 'N20'
FROM "platform_operators" o
WHERE o."revoked_at" IS NULL
  AND (
    SELECT COUNT(DISTINCT c."capability_code")
    FROM "platform_role_capabilities" c
    WHERE c."operator_id" = o."id"
      AND c."capability_code" IN ('N1','N2','N3','N4','N5','N6','N7','N8','N12','N13','N14','N15','N16','N17','N18','N19')
  ) = 16
ON CONFLICT ("operator_id", "capability_code") DO NOTHING;
