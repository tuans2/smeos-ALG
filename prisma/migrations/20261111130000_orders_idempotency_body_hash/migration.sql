-- Audit API-11 (PO duyệt 11/11/2026): `POST /api/v1/orders` phân biệt "cùng Idempotency-Key, thân khác". Lưu băm SHA-256
-- dạng chuẩn của thân đã kiểm; gửi lại cùng khoá mà băm khác → 422 `IDEMPOTENCY_KEY_REUSED`. Cột chỉ THÊM, cho phép NULL
-- (đơn cũ, đơn không gửi khoá, đơn từ nguồn khác) — đơn cũ có khoá mà chưa có băm vẫn trả lại như trước. Không chỉ mục:
-- chỉ đọc theo khoá duy nhất `(organization_id, idempotency_key)` sẵn có. Cả tệp chạy trong một giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "idempotency_body_hash" TEXT;

COMMIT;
