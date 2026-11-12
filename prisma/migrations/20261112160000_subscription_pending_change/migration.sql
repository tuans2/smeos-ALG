-- Audit BL-27, PO duyệt 12/11/2026: hạ gói / đổi chu kỳ áp từ kỳ sau. Chỉ thêm một cột cho phép rỗng (expand) — dòng cũ
-- không có thay đổi chờ áp. Thêm cột rỗng không viết lại bảng; đặt trần chờ khoá để không treo khi bảng bận.
SET LOCAL lock_timeout = '5s';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "pending_change" JSONB;
