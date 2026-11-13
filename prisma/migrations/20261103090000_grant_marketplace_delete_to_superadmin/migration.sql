-- PO 03/11/2026: xoá hồ sơ chợ đối tác là mã riêng N18, chỉ superadmin nền tảng.
-- Chỉ dữ liệu, không đổi cấu trúc bảng. Superadmin = người vận hành chưa bị thu quyền và đang
-- giữ ĐỦ 14 mã nền tảng có trước N18 (N1–N8, N12–N17). Người chỉ có một phần mã (vd. N1 + N17)
-- không được cấp. Chạy lại an toàn (ON CONFLICT DO NOTHING).
INSERT INTO "platform_role_capabilities" ("id", "operator_id", "capability_code")
SELECT gen_random_uuid()::text, o."id", 'N18'
FROM "platform_operators" o
WHERE o."revoked_at" IS NULL
  AND (
    SELECT COUNT(DISTINCT c."capability_code")
    FROM "platform_role_capabilities" c
    WHERE c."operator_id" = o."id"
      AND c."capability_code" IN ('N1','N2','N3','N4','N5','N6','N7','N8','N12','N13','N14','N15','N16','N17')
  ) = 14
ON CONFLICT ("operator_id", "capability_code") DO NOTHING;
