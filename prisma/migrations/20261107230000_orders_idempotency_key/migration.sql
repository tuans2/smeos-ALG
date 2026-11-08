-- Audit API-11 (PO duyệt 07/11/2026): chống bấm đúp `POST /api/v1/orders`. Client gửi `Idempotency-Key`; cùng tổ chức
-- + cùng khoá → trả lại đơn đã tạo thay vì tạo đơn thứ hai. Cột chỉ THÊM, cho phép NULL (đơn không gửi khoá, đơn cũ,
-- đơn từ nguồn khác): Postgres coi các NULL là khác nhau nên chỉ mục duy nhất không chặn chúng. Cả tệp chạy trong một
-- giao dịch.
BEGIN;
SET LOCAL lock_timeout = '30s';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_organization_id_idempotency_key_key" ON "orders"("organization_id", "idempotency_key");

COMMIT;
