-- Checklist ALG 1.4: tài khoản dùng mật khẩu tạm phải tự đổi trước khi dùng hệ thống.
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- Checklist ALG 1.16 (PO Q3 phương án b): khoản thu do Sale/Điều phối ghi chờ Điều hành xác nhận.
-- Mọi dòng sổ thu hiện có đã được tính vào paid_vnd nên nhận CONFIRMED.
ALTER TABLE "order_payments" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CONFIRMED';

-- CreateIndex
CREATE INDEX "order_payments_organization_id_status_idx" ON "order_payments"("organization_id", "status");
