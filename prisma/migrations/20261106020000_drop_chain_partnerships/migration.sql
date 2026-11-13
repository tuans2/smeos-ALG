-- ADR-012 D-T3, bước T-3b: xoá `chain_partnerships`. Từ T-3a (PR #143) mọi đường đọc ở `organization_links`;
-- từ bước này repository đối tác ghi thẳng `organization_links`.
-- contract: drop chain_partnerships — PO duyệt T-3b 06/11/2026; dữ liệu đã chép sang organization_links (T-2, giữ id)
-- Chốt an toàn: còn một dòng chưa có bản tương ứng (cùng id, cha, con, trạng thái) ở organization_links thì
-- dừng cả migration — preDeployCommand thất bại, bản đang chạy giữ nguyên, không mất dữ liệu.
-- Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

DO $$
DECLARE
  missing integer;
BEGIN
  SELECT count(*) INTO missing
  FROM "chain_partnerships" cp
  WHERE NOT EXISTS (
    SELECT 1 FROM "organization_links" ol
    WHERE ol."id" = cp."id"
      AND ol."parent_org_id" = cp."chain_org_id"
      AND ol."child_org_id" = cp."partner_org_id"
      AND ol."status"::text = cp."status"
  );
  IF missing > 0 THEN
    RAISE EXCEPTION 'T-3b dừng: % dòng chain_partnerships chưa khớp organization_links — rà trước khi xoá', missing;
  END IF;
END $$;

-- DropTable (khoá ngoại, index, CHECK của bảng đi cùng)
DROP TABLE "chain_partnerships";

COMMIT;
