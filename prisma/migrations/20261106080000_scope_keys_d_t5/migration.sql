-- ADR-012 D-T5, bước T-6b: `scope_id` của `notification_hard_locks` và `integration_governance` theo địa chỉ phạm vi
-- chuẩn `platform · industry:<key> · org:<organization_id> · branch:<branch_id>` (chuẩn bị gộp ở T-7).
-- "GLOBAL" → "platform"; id tổ chức thô → "org:<id>"; giá trị đã có tiền tố giữ nguyên. Repository đọc cả hai dạng
-- (dòng bản cũ ghi trong lúc deploy). Chỉ đổi dữ liệu; cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

UPDATE "notification_hard_locks"
SET "scope_id" = CASE WHEN "scope_id" = 'GLOBAL' THEN 'platform' ELSE 'org:' || "scope_id" END
WHERE "scope_id" = 'GLOBAL'
   OR ("scope_id" NOT LIKE 'industry:%' AND "scope_id" NOT LIKE 'org:%' AND "scope_id" NOT LIKE 'branch:%' AND "scope_id" <> 'platform');

UPDATE "integration_governance"
SET "scope_id" = CASE WHEN "scope_id" = 'GLOBAL' THEN 'platform' ELSE 'org:' || "scope_id" END
WHERE "scope_id" = 'GLOBAL'
   OR ("scope_id" NOT LIKE 'industry:%' AND "scope_id" NOT LIKE 'org:%' AND "scope_id" NOT LIKE 'branch:%' AND "scope_id" <> 'platform');

COMMIT;
